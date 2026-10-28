import Foundation
import SwiftTUI

// ponytail: talks to Supabase PostgREST directly with plain URLSession rather than
// pulling in the Supabase Swift SDK just for one read-only query — the anon key is
// public by design (RLS-guarded, already shipped in the web/iOS bundles, see
// ios/Sighting/SupabaseClient.swift's own comment on this).

let supabaseURL = "https://tjsxsqlxjmanwvmywwvw.supabase.co"
let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqc3hzcWx4am1hbnd2bXl3d3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTc0MDEsImV4cCI6MjA4NjA3MzQwMX0.LphLfho3wdQC20MhtcnBpzQUNuBoTOobrugQbNGxc68"

struct Listing: Decodable, Identifiable {
    var id: String { "\(type)-\(petName ?? "")-\(species)" }
    let type: String
    let petName: String?
    let species: String
    let lastSeenLocation: String
    enum CodingKeys: String, CodingKey {
        case type, species
        case petName = "pet_name"
        case lastSeenLocation = "last_seen_location"
    }
}

func fetchListings() async -> [Listing] {
    let path = "/rest/v1/listings?select=type,pet_name,species,last_seen_location&status=eq.active&order=created_at.desc&limit=10"
    guard let url = URL(string: supabaseURL + path) else { return [] }
    var req = URLRequest(url: url)
    req.setValue(anonKey, forHTTPHeaderField: "apikey")
    req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "authorization")
    guard let (data, _) = try? await URLSession.shared.data(for: req) else { return [] }
    return (try? JSONDecoder().decode([Listing].self, from: data)) ?? []
}

struct ListingsCard: View {
    let listings: [Listing]

    var body: some View {
        VStack(alignment: .leading) {
            Text("sighting — active listings").bold()
            if listings.isEmpty {
                Text("Could not reach Supabase, or nothing active")
            } else {
                ForEach(listings) { l in
                    Text("\(l.type.uppercased()): \(l.petName ?? l.species) — \(l.lastSeenLocation)")
                }
            }
        }
        .padding()
        .border()
    }
}

let semaphore = DispatchSemaphore(value: 0)
var listings: [Listing] = []
Task {
    listings = await fetchListings()
    semaphore.signal()
}
semaphore.wait()

Application(rootView: ListingsCard(listings: listings)).start()
