import Foundation

/// Represents a tracked job/task
struct Job: Identifiable, Codable {
    var id: String
    var title: String
    var description: String?
    var status: String // "active", "completed", "paused"
    var priority: String? // "high", "medium", "low"
    var assignedTo: String? // user email
    var projectName: String?
    var linkedObligationId: String?
    var linkedObligationLabel: String?
    var dueDate: Date?
    var completedAt: Date?
    var comments: [JobComment]?
    var history: [JobHistoryEntry]?
    var emoji: String?
    var createdAt: Date
    var updatedAt: Date
    
    struct JobComment: Codable, Identifiable {
        var id: String { "\(user)-\(timestamp.timeIntervalSince1970)" }
        var user: String
        var text: String
        var timestamp: Date
    }
    
    struct JobHistoryEntry: Codable {
        var action: String
        var user: String
        var date: Date
    }
    
    var isCompleted: Bool { status == "completed" }
    var isOverdue: Bool {
        guard let dueDate = dueDate, status != "completed" else { return false }
        return dueDate < Date()
    }
    
    var dueDateText: String? {
        guard let dueDate = dueDate else { return nil }
        let calendar = Calendar.current
        let now = Date()
        let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: now), to: calendar.startOfDay(for: dueDate)).day ?? 0
        
        if status == "completed" { return "Tamamlandı" }
        if days < 0 { return "\(abs(days)) gün gecikmiş" }
        if days == 0 { return "Bugün!" }
        if days == 1 { return "Yarın" }
        return "\(days) gün kaldı"
    }
}
