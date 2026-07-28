import UIKit
import UserNotifications
import FirebaseCore
import FirebaseMessaging

/// Owns everything push-related on the native side.
///
/// The shell itself is never signed in to Firebase - authentication lives in
/// the web view. So this class only obtains the FCM registration token and
/// hands it to the page, which registers it against the logged-in user
/// (see js/push.js). That keeps one source of truth for "who is this device".
final class PushCenter: NSObject {
    static let shared = PushCenter()

    /// Latest FCM token, if we have one yet.
    private(set) var token: String?

    /// Set by the web view controller so a token arriving later still reaches
    /// the page without waiting for the next launch.
    var onToken: ((String) -> Void)?

    private override init() { super.init() }

    func configure() {
        FirebaseApp.configure()
        Messaging.messaging().delegate = self
        UNUserNotificationCenter.current().delegate = self
    }

    /// Asks for permission, then registers with APNs. Safe to call repeatedly;
    /// iOS only shows the system prompt the first time.
    func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .badge, .sound]
        ) { granted, error in
            if let error {
                print("Bildirim izni hatasi: \(error.localizedDescription)")
                return
            }
            guard granted else {
                print("Kullanici bildirimlere izin vermedi.")
                return
            }
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }

    func setBadge(_ count: Int) {
        UNUserNotificationCenter.current().setBadgeCount(max(0, count))
    }

    func setAPNSToken(_ deviceToken: Data) {
        Messaging.messaging().setAPNSToken(deviceToken, type: .unknown)
    }

    fileprivate func publish(token: String) {
        self.token = token
        DispatchQueue.main.async { self.onToken?(token) }
    }
}

// MARK: - FCM

extension PushCenter: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken else { return }
        publish(token: fcmToken)
    }
}

// MARK: - Foreground presentation & taps

extension PushCenter: UNUserNotificationCenterDelegate {
    /// Without this, a notification that arrives while the app is open is
    /// swallowed silently - the team would miss anything that lands while
    /// somebody happens to have the app in front of them.
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler:
                                @escaping (UNNotificationPresentationOptions) -> Void) {
        applyPayload(notification.request.content.userInfo)
        completionHandler([.banner, .sound, .badge])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        applyPayload(response.notification.request.content.userInfo)
        completionHandler()
    }

    /// The server sends a compact deadline snapshot with every push so the
    /// stored summary stays current even when the app is never opened. The
    /// home-screen widget will read this; today it also keeps the badge honest.
    func applyPayload(_ userInfo: [AnyHashable: Any]) {
        if let snapshot = userInfo["snapshot"] as? String {
            WidgetStore.saveSnapshot(json: snapshot)
        }
        if let aps = userInfo["aps"] as? [String: Any],
           let badge = aps["badge"] as? Int {
            WidgetStore.saveBadge(badge)
        }
    }
}
