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
        // Initialize Firebase programmatically (no plist file needed!)
        FirebaseConfiguration.shared.setLoggerLevel(.min)
        
        if FirebaseApp.app() == nil {
            let options = FirebaseOptions(
                googleAppID: "1:973425573379:ios:f29e606a2543644ded9836",
                gcmSenderID: "973425573379"
            )
            options.apiKey = "AIzaSyAa_OLk_N5uK6RR1nopEDnQXFQHSjQP-As"
            options.projectID = "sure-takip"
            options.storageBucket = "sure-takip.firebasestorage.app"
            options.bundleID = "com.davincienerji.suretakip"
            
            FirebaseApp.configure(options: options)
        }
        
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
