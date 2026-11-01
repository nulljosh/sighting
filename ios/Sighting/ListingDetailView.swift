import MapKit
import SwiftUI

struct ListingDetailView: View {
    @Environment(ListingStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var account = Account.shared
    let listing: Listing

    private var current: Listing {
        store.listings.first { $0.id == listing.id } ?? listing
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let url = current.photo_url.flatMap(URL.init(string:)) {
                    AsyncImage(url: url) { $0.resizable().scaledToFit() } placeholder: { Color.gray.opacity(0.15) }
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                HStack {
                    TypeBadge(type: current.type)
                    if current.status == .resolved {
                        Label("Reunited", systemImage: "checkmark.seal.fill").foregroundStyle(.green)
                    }
                    Spacer()
                    Text(current.created_at, format: .dateTime.month().day().hour().minute())
                        .font(.caption).foregroundStyle(.secondary)
                }

                Grid(alignment: .leading, verticalSpacing: 12) {
                    row("Species", current.species)
                    row("Color", current.color)
                    row("Tag / chip #", current.tag_number)
                    row("Sex", current.sex)
                    row("Reward", current.reward)
                    row("Last seen", current.last_seen_location)
                    row("Last seen date", current.last_seen_at)
                    row("Notes", current.description)
                }

                if let at = store.spot(for: current) {
                    Map(initialPosition: .region(.init(center: at, latitudinalMeters: 1500, longitudinalMeters: 1500))) {
                        Annotation(current.last_seen_location, coordinate: at) { Pin(listing: current) }
                    }
                    .frame(height: 220)
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                }

                contact

                if current.status == .active && (store.token(for: current) != nil || account.isSignedIn) {
                    Button("Mark reunited") {
                        Task { await store.resolve(current) }
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
            .padding()
            .frame(maxWidth: 620, alignment: .leading)
        }
        .navigationTitle(current.title)
        .toolbar {
            ShareLink(item: current.shareURL, subject: Text("\(current.type.label): \(current.title)"))
            Menu {
                if let url = reportURL { Link(destination: url) { Label("Report post", systemImage: "flag") } }
                Button("Hide post", systemImage: "eye.slash") { store.hide(current, poster: false); dismiss() }
                if current.user_id != nil {
                    Button("Block poster", systemImage: "hand.raised", role: .destructive) { store.hide(current, poster: true); dismiss() }
                }
            } label: { Label("More", systemImage: "ellipsis.circle") }
        }
        .task(id: current.id) { await store.locate([current]) }
    }

    /// Reports go to a person who reads them and removes posts that break the rules within a day.
    private var reportURL: URL? {
        var c = URLComponents(string: "mailto:trommatic@icloud.com")
        c?.queryItems = [.init(name: "subject", value: "Sighting report: \(current.id.uuidString.lowercased())"),
                         .init(name: "body", value: "What is wrong with this post?\n\n\(current.shareURL.absoluteString)")]
        return c?.url
    }

    @ViewBuilder
    private var contact: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let phone = current.contact_phone, !phone.isEmpty,
               let url = URL(string: "tel:\(phone.filter { $0.isNumber || $0 == "+" })") {
                Link(destination: url) { Label(phone, systemImage: "phone.fill") }
            }
            if let email = current.contact_email, !email.isEmpty,
               let url = URL(string: "mailto:\(email)?subject=Sighting:%20\(current.title)") {
                Link(destination: url) { Label(email, systemImage: "envelope.fill") }
            }
        }
    }

    @ViewBuilder
    private func row(_ label: String, _ value: String?) -> some View {
        if let value, !value.isEmpty {
            GridRow {
                Text(label).font(.caption).foregroundStyle(.secondary).gridColumnAlignment(.leading)
                Text(value)
            }
        }
    }
}
