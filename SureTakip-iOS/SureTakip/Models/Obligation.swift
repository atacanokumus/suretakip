import Foundation
import FirebaseFirestore

/// Represents a regulatory obligation/deadline
struct Obligation: Identifiable, Codable {
    var id: String
    var projectName: String
    var projectLink: String?
    var obligationType: String
    var obligationDescription: String
    var deadline: Date
    var notes: String?
    var status: String // "pending", "completed"
    var comments: [Comment]?
    var createdAt: Date
    var updatedAt: Date
    
    struct Comment: Codable, Identifiable {
        var id: String { "\(user)-\(timestamp.timeIntervalSince1970)" }
        var user: String
        var text: String
        var timestamp: Date
    }
    
    /// Computed status based on deadline and manual status
    var computedStatus: ObligationStatus {
        if status == "completed" { return .completed }
        let now = Date()
        if deadline < now { return .overdue }
        
        let calendar = Calendar.current
        let daysUntil = calendar.dateComponents([.day], from: now, to: deadline).day ?? 0
        
        if daysUntil <= 7 { return .thisWeek }
        if daysUntil <= 30 { return .thisMonth }
        return .upcoming
    }
    
    /// Remaining days text
    var remainingText: String {
        if status == "completed" { return "Tamamlandı" }
        let calendar = Calendar.current
        let now = Date()
        let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: now), to: calendar.startOfDay(for: deadline)).day ?? 0
        
        if days < 0 { return "\(abs(days)) gün gecikmiş" }
        if days == 0 { return "Bugün!" }
        if days == 1 { return "Yarın" }
        return "\(days) gün kaldı"
    }
}

enum ObligationStatus: String, CaseIterable {
    case overdue = "overdue"
    case thisWeek = "thisWeek"
    case thisMonth = "thisMonth"
    case upcoming = "upcoming"
    case completed = "completed"
    
    var label: String {
        switch self {
        case .overdue: return "Gecikmiş"
        case .thisWeek: return "Bu Hafta"
        case .thisMonth: return "Bu Ay"
        case .upcoming: return "Yaklaşan"
        case .completed: return "Tamamlandı"
        }
    }
    
    var emoji: String {
        switch self {
        case .overdue: return "🔴"
        case .thisWeek: return "🟠"
        case .thisMonth: return "🟡"
        case .upcoming: return "🟢"
        case .completed: return "✅"
        }
    }
}
