import MapKit
import SwiftUI

struct ListingsView: View {
    @Environment(ListingStore.self) private var store

    @State private var board: Board = .all
    @State private var kind: String?
    @State private var byLastSeen = false
    @State private var showMap = false
    @State private var query = ""
    @State private var selection: Listing?
    @State private var showingPost = false

    private var listings: [Listing] {
        store.visible(board: board, kind: kind, query: query, byLastSeen: byLastSeen)
    }

    var body: some View {
        NavigationSplitView {
            Group {
                if showMap { boardMap } else {
                    List(listings, selection: $selection) { listing in
                        NavigationLink(value: listing) { ListingRow(listing: listing) }
                    }
                }
            }
            .navigationTitle("Sighting")
            .searchable(text: $query, prompt: "Name, breed, color, tag #, area")
            .searchScopes($board) {
                ForEach(Board.allCases) { Text($0.label).tag($0) }
            }
            .task(id: showMap) { if showMap { await store.locate(listings) } }
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
                        Picker("Pet", selection: $kind) {
                            Text("Any pet").tag(String?.none)
                            ForEach(store.kinds, id: \.self) { Text($0.capitalized).tag(String?.some($0)) }
                        }
                        Picker("Sort", selection: $byLastSeen) {
                            Text("Newest posts").tag(false)
                            Text("Last seen").tag(true)
                        }
                    } label: {
                        Label("Filter", systemImage: "line.3.horizontal.decrease.circle")
                    }
                }
                ToolbarItem {
                    Toggle(isOn: $showMap) { Label("Map", systemImage: "map") }.toggleStyle(.button)
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

    /// Every listing with a place, pinned; a pin opens the listing like a row does.
    private var boardMap: some View {
        Map {
            ForEach(listings) { l in
                if let at = store.spot(for: l) {
                    Annotation(l.title, coordinate: at) {
                        Button { selection = l } label: { Pin(listing: l) }
                            .buttonStyle(.plain)
                            .accessibilityLabel("\(l.title), \(l.last_seen_location)")
                    }
                }
            }
        }
    }
}

struct Pin: View {
    let listing: Listing
    var body: some View {
        Circle()
            .fill(listing.status == .resolved ? Color.primary : listing.type == .lost ? Color.red : Color.green)
            .frame(width: 18, height: 18)
            .overlay(Circle().stroke(.white, lineWidth: 3))
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
                        Text("Reunited").font(.caption2).foregroundStyle(.secondary)
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
