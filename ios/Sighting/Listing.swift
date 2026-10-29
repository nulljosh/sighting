import Foundation

enum ListingType: String, Codable, CaseIterable, Identifiable {
    case lost, found
    var id: String { rawValue }
    var label: String { rawValue.capitalized }
}

enum ListingStatus: String, Codable { case active, resolved }

/// The board's tabs, same as the web: Reunited holds resolved listings, the rest hold active ones.
enum Board: String, CaseIterable, Identifiable {
    case all, lost, found, reunited
    var id: String { rawValue }
    var label: String { rawValue.capitalized }
}

struct Listing: Codable, Identifiable, Hashable {
    let id: UUID
    let created_at: Date
    let type: ListingType
    let pet_name: String?
    let species: String
    let color: String?
    let description: String?
    let tag_number: String?
    let last_seen_location: String
    let lat: Double?
    let lng: Double?
    let photo_url: String?
    let contact_phone: String?
    let contact_email: String?
    let reward: String?
    let sex: String?
    let last_seen_at: String?
    var status: ListingStatus
    /// Only present on the row returned by your own insert; nil for other people's listings.
    var edit_token: UUID?

    var title: String { pet_name ?? species }
    var kind: String { species.trimmingCharacters(in: .whitespaces).lowercased() }
    var shareURL: URL { URL(string: "https://sighting.jaybulb.com/listing?id=\(id.uuidString.lowercased())")! }
    var lastSeen: Date { last_seen_at.flatMap { try? Date($0, strategy: .iso8601.year().month().day()) } ?? created_at }

    static func == (lhs: Listing, rhs: Listing) -> Bool { lhs.id == rhs.id && lhs.status == rhs.status }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct NewListing: Encodable {
    let type: String
    let pet_name: String?
    let species: String
    let color: String?
    let description: String?
    let tag_number: String?
    let last_seen_location: String
    let contact_phone: String?
    let contact_email: String?
    let photo_url: String?
    let reward: String?
    let sex: String?
    let last_seen_at: String?
    var lat: Double? = nil
    var lng: Double? = nil
}
