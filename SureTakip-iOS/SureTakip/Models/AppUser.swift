import Foundation

/// Represents a user profile stored in Firestore 'users' collection
struct AppUser: Identifiable, Codable {
    var id: String { email }
    var email: String
    var displayName: String?
    var title: String?
    var uid: String?
    var photoURL: String?
    var lastUpdated: String?
    
    /// Display name with fallback to email prefix
    var nameOrEmail: String {
        if let name = displayName, !name.isEmpty {
            return name
        }
        return email.components(separatedBy: "@").first ?? email
    }
    
    /// Initials for avatar placeholder
    var initials: String {
        let name = nameOrEmail
        let parts = name.components(separatedBy: " ")
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }
}
