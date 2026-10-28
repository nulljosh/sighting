import AuthenticationServices
import CryptoKit
import SwiftUI
import Supabase

/// Mirrors `app/login` and `app/register` on the web: email+password, Supabase handles session
/// persistence. Toolbar entry point, shown as a sheet.
struct AuthBar: View {
    @State private var session: Session?
    @State private var showingSheet = false

    var body: some View {
        Group {
            if let email = session?.user.email {
                Menu(email) {
                    Button("Log out", role: .destructive) {
                        Task { try? await supabase.auth.signOut() }
                    }
                    Button("Delete account", role: .destructive) {
                        Task { await deleteAccount() }
                    }
                }
                .font(.caption)
            } else {
                Button("Log in") { showingSheet = true }
                    .font(.caption)
            }
        }
        .task {
            session = try? await supabase.auth.session
            for await (_, newSession) in supabase.auth.authStateChanges {
                session = newSession
            }
        }
        .sheet(isPresented: $showingSheet) { AuthSheet() }
    }

    /// Calls the shared `delete-account` Edge Function on the spark Supabase project,
    /// which uses the service-role key to delete the authenticated user server-side
    /// (the anon-key client SDK has no permission to delete its own auth user).
    private func deleteAccount() async {
        guard let session = try? await supabase.auth.session else { return }
        var request = URLRequest(url: URL(string: "https://tjsxsqlxjmanwvmywwvw.supabase.co/functions/v1/delete-account")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        _ = try? await URLSession.shared.data(for: request)
        try? await supabase.auth.signOut()
    }
}

private struct AuthSheet: View {
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var password = ""
    @State private var isRegister = false
    @State private var error: String?
    @State private var notice: String?
    @State private var submitting = false
    @State private var appleNonce = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                SecureField("Password", text: $password)
                    .textContentType(isRegister ? .newPassword : .password)
                if !isRegister {
                    Button("Forgot password?") { Task { await resetPassword() } }
                        .font(.caption)
                        .disabled(email.isEmpty)
                }
                if let error { Text(error).foregroundStyle(.red).font(.caption) }
                if let notice { Text(notice).foregroundStyle(.secondary).font(.caption) }
                Button(isRegister ? "Have an account? Log in" : "Need an account? Register") {
                    isRegister.toggle()
                    error = nil
                }
                .font(.caption)

                Section {
                    SignInWithAppleButton(.signIn) { request in
                        appleNonce = Self.randomNonce()
                        request.requestedScopes = [.email]
                        request.nonce = Self.sha256(appleNonce)
                    } onCompletion: { result in
                        Task { await signInWithApple(result: result) }
                    }
                    .signInWithAppleButtonStyle(.black)
                    .frame(height: 44)

                    Button { Task { await signInWithGoogle() } } label: {
                        Text("Continue with Google").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
            }
            .navigationTitle(isRegister ? "Register" : "Log in")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(submitting ? "..." : (isRegister ? "Register" : "Log in")) { Task { await submit() } }
                        .disabled(submitting || email.isEmpty || password.isEmpty)
                }
            }
        }
    }

    private func submit() async {
        submitting = true
        error = nil
        do {
            if isRegister {
                try await supabase.auth.signUp(email: email, password: password)
            } else {
                try await supabase.auth.signIn(email: email, password: password)
            }
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
        submitting = false
    }

    private func resetPassword() async {
        error = nil; notice = nil
        do {
            try await supabase.auth.resetPasswordForEmail(email, redirectTo: URL(string: "https://pets.jaybulb.com/reset-password"))
            notice = "Check your email for a reset link."
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func signInWithApple(result: Result<ASAuthorization, Error>) async {
        error = nil
        do {
            let auth = try result.get()
            guard let cred = auth.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = cred.identityToken,
                  let token = String(data: tokenData, encoding: .utf8) else {
                throw URLError(.badServerResponse)
            }
            _ = try await supabase.auth.signInWithIdToken(credentials: .init(provider: .apple, idToken: token, nonce: appleNonce))
            dismiss()
        } catch let error as ASAuthorizationError where error.code == .canceled {
            // The person closed Apple's sheet. That is a choice, not an error.
        } catch {
            self.error = error.localizedDescription
        }
    }

    /// `homeward://` must stay in the Supabase project's uri_allow_list and in
    /// CFBundleURLTypes, or the callback lands nowhere.
    private func signInWithGoogle() async {
        error = nil
        do {
            try await supabase.auth.signInWithOAuth(provider: .google, redirectTo: URL(string: "homeward://"))
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private static func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var bytes = [UInt8](repeating: 0, count: length)
        if SecRandomCopyBytes(kSecRandomDefault, length, &bytes) != errSecSuccess {
            bytes = (0..<length).map { _ in UInt8.random(in: 0...255) }
        }
        return String(bytes.map { charset[Int($0) % charset.count] })
    }

    private static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).compactMap { String(format: "%02x", $0) }.joined()
    }
}
