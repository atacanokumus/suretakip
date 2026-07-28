import SwiftUI

/// Süre Takip — DaVinci Enerji Lisans Müdürlüğü
///
/// This is a thin native shell around the existing web application at
/// https://sure-takip.web.app. It deliberately contains no data model, no
/// Firestore code and no business logic.
///
/// Why: the web app owns a large amount of domain logic (a 13-stage workflow
/// engine across 17 amendment types, the prelicence matrix, analytics and
/// client-side PDF reporting). A second, native implementation of that logic
/// drifted out of sync once already, to the point where saving from the phone
/// would have wiped every job's workflow progress out of the shared Firestore
/// document. Keeping exactly one implementation makes web/iOS parity a
/// structural guarantee instead of something maintained by hand, and lets web
/// releases reach the phone without a new TestFlight build.
@main
struct SureTakipApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
                .preferredColorScheme(.dark) // the web app is a dark-themed UI
        }
    }
}
