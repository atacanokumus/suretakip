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
        // Initialize Firebase
        FirebaseConfiguration.shared.setLoggerLevel(.min)
        
        if FirebaseApp.app() == nil {
            // Attempt to load from Plist first (standard way)
            if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
               let _ = NSDictionary(contentsOfFile: path) {
                FirebaseApp.configure()
            } else {
                // FALLBACK: Programmatic Configuration
                // This allows the app to run WITHOUT the .plist file
                let options = FirebaseOptions(
                    googleAppID: "1:973425573379:ios:xxxxxxxxxxxx", // User will replace this
                    gcmSenderID: "973425573379"
                )
                options.apiKey = "AIzaSyD2X_ccHXMwLw9gcnHHt9d1zNGyrHzhGKM"
                options.projectID = "sure-takip"
                options.bundleID = "com.davincienerji.suretakip"
                
                FirebaseApp.configure(options: options)
                print("⚠️ Firebase configured programmatically (Plist missing)")
            }
        }
        
        // Manual initialization of StateObjects
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
