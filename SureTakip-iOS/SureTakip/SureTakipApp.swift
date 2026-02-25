import SwiftUI
import FirebaseCore
import FirebaseFirestore
import FirebaseAuth

/// Main app entry point
@main
struct SureTakipApp: App {
    @StateObject private var authService: AuthService
    @StateObject private var firestoreService: FirestoreService
    
    init() {
        // Initialize Firebase here (before @StateObjects are initialized)
        // This prevents "FirebaseApp.configure() not called" crashes
        FirebaseConfiguration.shared.setLoggerLevel(.min)
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        
        // Manual initialization of StateObjects to ensure Firebase is ready
        _authService = StateObject(wrappedValue: AuthService())
        _firestoreService = StateObject(wrappedValue: FirestoreService())
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authService)
                .environmentObject(firestoreService)
                .preferredColorScheme(.dark) // Premium dark mode by default
        }
    }
}
