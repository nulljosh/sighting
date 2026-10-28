import SwiftUI
import PhotosUI

struct PostListingView: View {
    @Environment(ListingStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var type: ListingType = .lost
    @State private var petName = ""
    @State private var species = ""
    @State private var color = ""
    @State private var details = ""
    @State private var tagNumber = ""
    @State private var reward = ""
    @State private var sex = ""
    @State private var lastSeenAt = ""
    @State private var lastSeenLocation = ""
    @State private var contactPhone = ""
    @State private var contactEmail = ""
    @State private var photoItem: PhotosPickerItem?
    @State private var photoData: Data?
    @State private var submitting = false

    private var canSubmit: Bool {
        !submitting && !species.isEmpty && !lastSeenLocation.isEmpty
            && !(contactPhone.isEmpty && contactEmail.isEmpty)
    }

    var body: some View {
        NavigationStack {
            Form {
                Picker("Type", selection: $type) {
                    ForEach(ListingType.allCases) { Text($0.label).tag($0) }
                }
                .pickerStyle(.segmented)

                Section("The pet") {
                    TextField("Name (if known)", text: $petName)
                    TextField("Species or breed", text: $species)
                    TextField("Color / markings", text: $color)
                    TextField("Ear tattoo / tag / chip #", text: $tagNumber)
                    TextField("Sex (male / female)", text: $sex)
                    TextField("Reward (optional)", text: $reward)
                    TextField("Notes", text: $details, axis: .vertical)
                }

                Section("Where") {
                    TextField(type == .lost ? "Last seen location" : "Where you found them", text: $lastSeenLocation)
                    TextField("Date (YYYY-MM-DD)", text: $lastSeenAt)
                }

                Section("Photo") {
                    PhotosPicker("Choose a photo", selection: $photoItem, matching: .images)
                    if let photoData, let image = PlatformImage(data: photoData) {
                        image.resizable().scaledToFit().frame(maxHeight: 180)
                    }
                }

                Section("Contact") {
                    TextField("Phone", text: $contactPhone)
                    TextField("Email", text: $contactEmail)
                    Text("At least one contact method is required.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            .formStyle(.grouped)
            .navigationTitle("New Listing")
            .onChange(of: photoItem) { _, item in
                Task { photoData = try? await item?.loadTransferable(type: Data.self) }
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(submitting ? "Posting…" : "Post") { Task { await submit() } }
                        .disabled(!canSubmit)
                }
            }
            #if os(macOS)
            .frame(minWidth: 480, minHeight: 560)
            #endif
        }
    }

    private func submit() async {
        submitting = true
        defer { submitting = false }

        var photoURL: String?
        if let photoData { photoURL = await store.uploadPhoto(photoData) }

        let ok = await store.post(NewListing(
            type: type.rawValue,
            pet_name: petName.nilIfBlank,
            species: species,
            color: color.nilIfBlank,
            description: details.nilIfBlank,
            tag_number: tagNumber.nilIfBlank,
            last_seen_location: lastSeenLocation,
            contact_phone: contactPhone.nilIfBlank,
            contact_email: contactEmail.nilIfBlank,
            photo_url: photoURL,
            reward: reward.nilIfBlank,
            sex: sex.nilIfBlank,
            last_seen_at: lastSeenAt.nilIfBlank
        ))
        if ok { dismiss() }
    }
}

extension String {
    var nilIfBlank: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}

/// SwiftUI has no cross-platform `Image(data:)`.
func PlatformImage(data: Data) -> Image? {
    #if os(macOS)
    NSImage(data: data).map { Image(nsImage: $0) }
    #else
    UIImage(data: data).map { Image(uiImage: $0) }
    #endif
}
