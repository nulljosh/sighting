import Foundation

enum ListingType: String, Codable, CaseIterable, Identifiable {
    case lost, found
    var id: String { rawValue }
    var label: String { rawValue.capitalized }
}

enum ListingStatus: String, Codable { case active, resolved }

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
}
