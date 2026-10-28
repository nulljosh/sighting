import SwiftUI

struct ListingsView: View {
    @Environment(ListingStore.self) private var store

    @State private var filter: ListingType?
    @State private var includeResolved = false
    @State private var query = ""
    @State private var selection: Listing?
    @State private var showingPost = false

    private var listings: [Listing] {
        store.visible(type: filter, includeResolved: includeResolved, query: query)
    }

    var body: some View {
        NavigationSplitView {
            List(listings, selection: $selection) { listing in
                NavigationLink(value: listing) { ListingRow(listing: listing) }
            }
            .navigationTitle("Sighting")
            .searchable(text: $query, prompt: "Name, breed, color, tag #, area")
            .searchScopes($filter) {
                Text("All").tag(ListingType?.none)
                ForEach(ListingType.allCases) { Text($0.label).tag(ListingType?.some($0)) }
            }
            .refreshable { await store.load() }
            .overlay {
                if store.listings.isEmpty && !store.loading {
                    ContentUnavailableView("No listings yet", systemImage: "pawprint", description: Text("Post a lost or found pet to start the board."))
                } else if listings.isEmpty {
                    ContentUnavailableView.search(text: query)
                }
            }
            .toolbar {
                ToolbarItem {
                    Menu {
                        Toggle("Show resolved", isOn: $includeResolved)
                        Picker("Show", selection: $filter) {
                            Text("All").tag(ListingType?.none)
                            ForEach(ListingType.allCases) { Text($0.label).tag(ListingType?.some($0)) }
                        }
                    } label: {
                        Label("Filter", systemImage: "line.3.horizontal.decrease.circle")
                    }
                }
                ToolbarItem {
                    Button("Post", systemImage: "plus") { showingPost = true }
                }
                ToolbarItem { AuthBar() }
            }
        } detail: {
            if let selection {
                ListingDetailView(listing: selection)
            } else {
                ContentUnavailableView("Pick a listing", systemImage: "pawprint")
            }
        }
        .sheet(isPresented: $showingPost) { PostListingView() }
        .task { if store.listings.isEmpty { await store.load() } }
        .alert("Something went wrong", isPresented: .constant(store.errorMessage != nil)) {
            Button("OK") { store.errorMessage = nil }
        } message: {
            Text(store.errorMessage ?? "")
        }
    }
}

struct ListingRow: View {
    let listing: Listing

    var body: some View {
        HStack(spacing: 12) {
            Thumbnail(url: listing.photo_url)
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    TypeBadge(type: listing.type)
                    Text(listing.title).font(.headline)
                    if listing.status == .resolved {
                        Text("Resolved").font(.caption2).foregroundStyle(.secondary)
                    }
                }
                Text(listing.last_seen_location).font(.subheadline).foregroundStyle(.secondary)
                Text(listing.created_at, format: .relative(presentation: .named))
                    .font(.caption).foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 4)
    }
}

struct TypeBadge: View {
    let type: ListingType

    var body: some View {
        Text(type.label.uppercased())
            .font(.caption2.bold())
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(type == .lost ? Color.red.opacity(0.15) : Color.green.opacity(0.15))
            .clipShape(Capsule())
    }
}

struct Thumbnail: View {
    let url: String?

    var body: some View {
        AsyncImage(url: url.flatMap(URL.init(string:))) { image in
            image.resizable().scaledToFill()
        } placeholder: {
            Image(systemName: "pawprint.fill")
                .foregroundStyle(.secondary)
        }
        .frame(width: 52, height: 52)
        .background(.quaternary)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
