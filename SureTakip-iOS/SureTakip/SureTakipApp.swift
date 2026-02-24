import SwiftUI

/// Main app entry point
@main
struct SureTakipApp: App {
    // Firebase is initialized via AppDelegate
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    
    @StateObject private var authService = AuthService()
    @StateObject private var firestoreService = FirestoreService()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authService)
                .environmentObject(firestoreService)
                .preferredColorScheme(.dark) // Premium dark mode by default
        }
    }
}
