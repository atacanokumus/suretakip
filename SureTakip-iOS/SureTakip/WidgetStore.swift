import Foundation

/// Storage for the deadline summary shown outside the web view.
///
/// Written from two places - the page itself while it's open (via the
/// `updateWidget` bridge in WebAppView) and incoming pushes while it isn't -
/// so the numbers stay right whether or not anyone has opened the app.
///
/// It already writes to the App Group suite rather than standard defaults, so
/// adding the home-screen widget target later is a matter of adding the
/// extension: the data it needs is being kept up to date from today.
enum WidgetStore {
    static let appGroup = "group.com.davincienerji.suretakip"

    private static var defaults: UserDefaults {
        // Falls back to standard defaults until the App Group capability is
        // enabled, so nothing crashes in the meantime.
        UserDefaults(suiteName: appGroup) ?? .standard
    }

    private enum Key {
        static let snapshot = "widget.snapshot"
        static let badge = "widget.badge"
        static let updatedAt = "widget.updatedAt"
    }

    struct Item: Codable {
        let p: String   // project
        let t: String   // obligation type
        let d: String   // deadline, yyyy-MM-dd
    }

    struct Snapshot: Codable {
        let badge: Int
        let items: [Item]
    }

    static func saveSnapshot(json: String) {
        guard let data = json.data(using: .utf8) else { return }

        // The page sends {badge, items}; a push sends just the items array.
        if let full = try? JSONDecoder().decode(Snapshot.self, from: data) {
            defaults.set(json, forKey: Key.snapshot)
            saveBadge(full.badge)
        } else if let items = try? JSONDecoder().decode([Item].self, from: data),
                  let wrapped = try? JSONEncoder().encode(
                      Snapshot(badge: loadBadge(), items: items)),
                  let wrappedJson = String(data: wrapped, encoding: .utf8) {
            defaults.set(wrappedJson, forKey: Key.snapshot)
        } else {
            return
        }

        defaults.set(Date(), forKey: Key.updatedAt)
    }

    static func saveBadge(_ count: Int) {
        defaults.set(count, forKey: Key.badge)
        PushCenter.shared.setBadge(count)
    }

    static func loadBadge() -> Int {
        defaults.integer(forKey: Key.badge)
    }

    static func loadSnapshot() -> Snapshot? {
        guard let json = defaults.string(forKey: Key.snapshot),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(Snapshot.self, from: data)
    }
}
