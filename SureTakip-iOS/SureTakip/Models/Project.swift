import Foundation

/// Represents a project definition
struct Project: Identifiable, Codable {
    var id: String
    var name: String
    var company: String?
    var parent: String?
    var expert: ExpertInfo?
    
    struct ExpertInfo: Codable {
        var name: String?
        var phone: String?
    }
}
