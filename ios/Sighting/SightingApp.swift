import SwiftUI

@main
struct SightingApp: App {
    @State private var store = ListingStore()

    var body: some Scene {
        WindowGroup {
            ListingsView()
                .environment(store)
                #if os(macOS)
                .frame(minWidth: 800, minHeight: 500)
                #endif
        }
        #if os(macOS)
        .defaultSize(width: 1280, height: 800)
        #endif
        .commands {
            CommandGroup(after: .newItem) {
                Button("Refresh") {
                    Task { await store.load() }
                }
                .keyboardShortcut("r")
            }
        }
    }
}
