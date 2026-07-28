import SwiftUI
import UIKit

/// Süre Takip — DaVinci Enerji Lisans Müdürlüğü
///
/// This is a thin native shell around the existing web application at
/// https://sure-takip.web.app. It deliberately contains no data model and no
/// Firestore code: the page owns all of that.
///
/// Why: the web app holds a large amount of domain logic (a 13-stage workflow
/// engine across 17 amendment types, the prelicence matrix, analytics and
/// client-side PDF reporting). A second, native implementation drifted out of
/// sync once already, to the point where saving from the phone would have wiped
/// every job's workflow progress out of the shared Firestore document. Keeping
/// exactly one implementation makes web/iOS parity structural instead of
/// hand-maintained, and lets web releases reach the phone without a new
/// TestFlight build.
///
/// The native side owns only what a web page cannot do: push notifications,
/// the Face ID gate, the app badge, and PDF sharing.
@main
struct SureTakipApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            RootView()
                .preferredColorScheme(.dark) // the web app is a dark-themed UI
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions:
                     [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        PushCenter.shared.configure()
        return true
    }

    /// Handing the raw APNs token to FCM with `.unknown` lets it work out the
    /// sandbox/production environment itself. Hard-coding it is the usual
    /// reason notifications work in Xcode but go silent in TestFlight.
    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        PushCenter.shared.setAPNSToken(deviceToken)
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("APNs kaydi basarisiz: \(error.localizedDescription)")
    }

    /// Silent/`content-available` pushes land here; keeps the badge and the
    /// stored deadline summary current without the user opening anything.
    func application(_ application: UIApplication,
                     didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                     fetchCompletionHandler completionHandler:
                     @escaping (UIBackgroundFetchResult) -> Void) {
        PushCenter.shared.applyPayload(userInfo)
        completionHandler(.newData)
    }
}
