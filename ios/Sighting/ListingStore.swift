import Foundation
import Observation

@Observable
final class ListingStore {
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
            listings = try await supabase
                .from("listings")
                .select()
                .order("created_at", ascending: false)
                .limit(500)
                .execute()
                .value
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func post(_ new: NewListing) async -> Bool {
        do {
            let created: Listing = try await supabase
                .rpc("create_listing", params: new)
                .single()
                .execute()
                .value
            if let token = created.edit_token { remember(id: created.id, token: token) }
            listings.insert(created, at: 0)
            errorMessage = nil
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func resolve(_ listing: Listing) async {
        guard let token = token(for: listing) else { return }
        struct Params: Encodable { let p_id: UUID; let p_token: UUID; let p_status: String }
        do {
            try await supabase
                .rpc("update_listing", params: Params(p_id: listing.id, p_token: token, p_status: "resolved"))
                .execute()
            if let i = listings.firstIndex(where: { $0.id == listing.id }) {
                listings[i].status = .resolved
            }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func uploadPhoto(_ data: Data) async -> String? {
        let path = "\(UUID().uuidString).jpg"
        do {
            try await supabase.storage.from("pet-photos").upload(path, data: data)
            return try supabase.storage.from("pet-photos").getPublicURL(path: path).absoluteString
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }

    /// Filter by lost/found, resolved-or-not, and a free-text query over the searchable fields.
    func visible(type: ListingType?, includeResolved: Bool, query: String) -> [Listing] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        return listings.filter { l in
            if let type, l.type != type { return false }
            if !includeResolved && l.status == .resolved { return false }
            guard !q.isEmpty else { return true }
            return [l.pet_name, l.species, l.color, l.description, l.tag_number, l.last_seen_location]
                .compactMap { $0?.lowercased() }
                .contains { $0.contains(q) }
        }
    }
}
