import AuthenticationServices
import CryptoKit
import Foundation
import Observation
import Security

/// The same backend as the web app: jaybulb-api on Cloudflare (Workers + D1), no SDK.
/// Same shape as Coda's client. The refresh token lives in the Keychain; the short-lived
/// access token stays in memory.
@MainActor @Observable
final class Account {
    static let shared = Account()
    static let api = "https://api.jaybulb.com"
    private static let service = "com.nulljosh.homeward.session"

    private(set) var email: String?
    var isSignedIn: Bool { email != nil }
    var error: String?
    var notice: String?
    private(set) var access: String?
    private var nonce = ""

    private init() { Task { _ = await refresh() } }

    private struct Session: Decodable {
        let access_token: String, refresh_token: String
        let user: User
        struct User: Decodable { let id: String; let email: String? }
    }
    private struct Failure: Decodable { let error: String? }

    /// One request to jaybulb-api. `body` is JSON, or raw bytes with their content type.
    func call(_ method: String, _ path: String, json: Any? = nil, raw: (Data, String)? = nil, authed: Bool = false) async throws -> Data {
        var r = URLRequest(url: URL(string: Self.api + path)!)
        r.httpMethod = method
        if let json { r.httpBody = try JSONSerialization.data(withJSONObject: json); r.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        if let raw { r.httpBody = raw.0; r.setValue(raw.1, forHTTPHeaderField: "Content-Type") }
        if authed, let access { r.setValue("Bearer \(access)", forHTTPHeaderField: "Authorization") }
        let (data, res) = try await URLSession.shared.data(for: r)
        let code = (res as? HTTPURLResponse)?.statusCode ?? 0
        // Access tokens last an hour; refresh once and retry before giving up.
        if code == 401, authed, access != nil, await refresh() { return try await call(method, path, json: json, raw: raw, authed: true) }
        guard code < 300 else {
            throw NSError(domain: "Sighting", code: code, userInfo: [NSLocalizedDescriptionKey: (try? JSONDecoder().decode(Failure.self, from: data))?.error ?? "Something went wrong"])
        }
        return data
    }

    private func start(_ data: Data) throws {
        let s = try JSONDecoder().decode(Session.self, from: data)
        access = s.access_token
        Self.keychain(set: s.refresh_token)
        email = s.user.email ?? "Signed in"
    }

    private func refresh() async -> Bool {
        guard let token = Self.keychain() else { return false }
        guard let d = try? await call("POST", "/auth/token?grant_type=refresh_token", json: ["refresh_token": token]), (try? start(d)) != nil else {
            Self.keychain(set: nil); email = nil; access = nil
            return false
        }
        return true
    }

    private func run(_ work: @escaping () async throws -> Void) async -> Bool {
        error = nil; notice = nil
        do { try await work(); return true } catch { self.error = error.localizedDescription; return false }
    }

    // MARK: Email and password

    func signIn(email: String, password: String) async -> Bool {
        await run { try self.start(await self.call("POST", "/auth/token?grant_type=password", json: ["email": email, "password": password])) }
    }

    func signUp(email: String, password: String) async {
        _ = await run {
            _ = try await self.call("POST", "/auth/signup", json: ["email": email, "password": password, "redirect_to": "https://sighting.jaybulb.com/board"])
            self.notice = "Check your email to confirm your account, then log in."
        }
    }

    func recover(email: String) async {
        _ = await run {
            _ = try await self.call("POST", "/auth/recover", json: ["email": email, "redirect_to": "https://sighting.jaybulb.com/reset-password"])
            self.notice = "If that email has an account, a reset link is on its way."
        }
    }

    // MARK: Sign in with Apple (the bundle id has to be in jaybulb-api's APPLE_AUDIENCES)

    func prepare(_ request: ASAuthorizationAppleIDRequest) {
        nonce = (0..<32).map { _ in String(format: "%02x", UInt8.random(in: 0...255)) }.joined()
        request.requestedScopes = [.email]
        request.nonce = SHA256.hash(data: Data(nonce.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    func finish(_ result: Result<ASAuthorization, Error>) async -> Bool {
        switch result {
        case .failure(let e):
            if (e as? ASAuthorizationError)?.code != .canceled { error = e.localizedDescription }
            return false
        case .success(let auth):
            guard let c = auth.credential as? ASAuthorizationAppleIDCredential, let t = c.identityToken,
                  let token = String(data: t, encoding: .utf8) else { error = "Apple did not return a sign-in"; return false }
            return await run { try self.start(await self.call("POST", "/auth/token?grant_type=id_token", json: ["provider": "apple", "id_token": token, "nonce": self.nonce])) }
        }
    }

    // MARK: Account

    func signOut() {
        let had = access != nil
        Task { if had { _ = try? await call("POST", "/auth/logout", authed: true) } }
        email = nil; access = nil
        Self.keychain(set: nil)
    }

    /// Deletes the account; its listings stay up but lose their owner. Apple requires this in-app (5.1.1v).
    func deleteAccount() async {
        if await run({ _ = try await self.call("DELETE", "/auth/user", authed: true) }) { signOut() }
    }

    // MARK: Keychain

    private static func keychain() -> String? {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecReturnData as String: true]
        var out: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let d = out as? Data else { return nil }
        return String(data: d, encoding: .utf8)
    }

    private static func keychain(set value: String?) {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service]
        SecItemDelete(q as CFDictionary)
        guard let value else { return }
        var add = q
        add[kSecValueData as String] = Data(value.utf8)
        SecItemAdd(add as CFDictionary, nil)
    }
}

extension JSONDecoder {
    /// Older rows carry Postgres-style times ("2026-09-10 20:55:59.8583+00"), newer ones ISO 8601.
    static let api: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .custom { decoder in
            let s = try decoder.singleValueContainer().decode(String.self)
            var t = s.replacingOccurrences(of: " ", with: "T")
            if t.hasSuffix("+00") { t += ":00" }
            let f = ISO8601DateFormatter()
            f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = f.date(from: t) { return date }
            f.formatOptions = [.withInternetDateTime]
            if let date = f.date(from: t) { return date }
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Unreadable date \(s)"))
        }
        return d
    }()
}
