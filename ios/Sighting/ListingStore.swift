import CoreLocation
import Foundation
import Observation

@MainActor @Observable
final class ListingStore {
    private var account: Account { .shared }

    var listings: [Listing] = []
    var loading = false
    var errorMessage: String?

    /// listing id -> edit_token, for listings posted from this device (Craigslist-style edit links).
    private(set) var myTokens: [String: String] = UserDefaults.standard.dictionary(forKey: "editTokens") as? [String: String] ?? [:]

    func token(for listing: Listing) -> UUID? {
        myTokens[listing.id.uuidString].flatMap(UUID.init(uuidString:))
    }

    private func remember(id: UUID, token: UUID) {
        myTokens[id.uuidString] = token.uuidString
        UserDefaults.standard.set(myTokens, forKey: "editTokens")
    }

    func load() async {
        loading = true
        defer { loading = false }
        do {
            let data = try await account.call("GET", "/rest/listings?select=*&order=created_at.desc&limit=500")
            listings = try JSONDecoder.api.decode([Listing].self, from: data)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func post(_ new: NewListing) async -> Bool {
        do {
            // Signed in, the post is tied to the account; otherwise the edit token is the only key.
            let data = try await account.call("POST", "/rpc/create_listing", raw: (try JSONEncoder().encode(new), "application/json"), authed: account.isSignedIn)
            let created = try JSONDecoder.api.decode(Listing.self, from: data)
            if let token = created.edit_token { remember(id: created.id, token: token) }
            listings.insert(created, at: 0)
            errorMessage = nil
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    /// Your own post resolves with its edit token; anyone signed in can mark a pet reunited
    /// too (the poster gets an email), same as the web board.
    func resolve(_ listing: Listing) async {
        let id = listing.id.uuidString.lowercased()
        do {
            if let token = token(for: listing) {
                _ = try await account.call("POST", "/rpc/update_listing", json: ["p_id": id, "p_token": token.uuidString.lowercased(), "p_status": "resolved"])
            } else if account.isSignedIn {
                _ = try await account.call("POST", "/rpc/resolve_listing", json: ["p_id": id], authed: true)
                _ = try? await account.call("POST", "/functions/notify-found", json: ["listingId": id])
            } else { return }
            if let i = listings.firstIndex(where: { $0.id == listing.id }) {
                listings[i].status = .resolved
            }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func uploadPhoto(_ data: Data) async -> String? {
        struct Uploaded: Decodable { let url: String }
        do {
            let res = try await account.call("POST", "/storage/pet-photos/\(UUID().uuidString).jpg", raw: (data, "image/jpeg"))
            return try JSONDecoder().decode(Uploaded.self, from: res).url
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }

    /// The species people actually post, for the filter.
    var kinds: [String] { Array(Set(listings.map(\.kind).filter { !$0.isEmpty })).sorted() }

    /// Board tab, species, a free-text query over the searchable fields, then the sort.
    func visible(board: Board, kind: String?, query: String, byLastSeen: Bool) -> [Listing] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        let shown = listings.filter { l in
            if (board == .reunited) != (l.status == .resolved) { return false }
            if board == .lost && l.type != .lost || board == .found && l.type != .found { return false }
            if let kind, l.kind != kind { return false }
            guard !q.isEmpty else { return true }
            return [l.pet_name, l.species, l.color, l.description, l.tag_number, l.last_seen_location]
                .compactMap { $0?.lowercased() }
                .contains { $0.contains(q) }
        }
        return byLastSeen ? shown.sorted { $0.lastSeen > $1.lastSeen } : shown
    }

    // MARK: Places

    /// Places looked up from their text, for posts that never saved coordinates.
    private(set) var spots: [String: CLLocationCoordinate2D] = [:]

    func spot(for l: Listing) -> CLLocationCoordinate2D? {
        if let lat = l.lat, let lng = l.lng { return .init(latitude: lat, longitude: lng) }
        return spots[l.last_seen_location]
    }

    /// Apple's geocoder, one place at a time (it throttles bursts). Text with fewer than two
    /// words ("unknown") is skipped, the same rule as the web.
    func locate(_ list: [Listing]) async {
        for place in Set(list.filter { $0.lat == nil }.map(\.last_seen_location)) where spots[place] == nil {
            if let hit = await Self.geocode(place) { spots[place] = hit }
        }
    }

    static func geocode(_ text: String) async -> CLLocationCoordinate2D? {
        let clean = text.replacingOccurrences(of: #"\(.*?\)"#, with: "", options: .regularExpression)
        guard clean.split(separator: " ").count >= 2 else { return nil }
        return try? await CLGeocoder().geocodeAddressString(clean).first?.location?.coordinate
    }
}
