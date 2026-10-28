import SwiftUI

struct ListingDetailView: View {
    @Environment(ListingStore.self) private var store
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
                        Label("Resolved", systemImage: "checkmark.seal.fill").foregroundStyle(.green)
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

                contact

                if store.token(for: current) != nil && current.status == .active {
                    Button("Mark as resolved") {
                        Task { await store.resolve(current) }
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
            .padding()
            .frame(maxWidth: 620, alignment: .leading)
        }
        .navigationTitle(current.title)
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
