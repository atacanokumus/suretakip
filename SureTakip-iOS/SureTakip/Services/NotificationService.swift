import Foundation
import UserNotifications

/// Handles local push notifications for deadline reminders
class NotificationService {
    static let shared = NotificationService()
    
    private init() {}
    
    // MARK: - Request Permission
    
    func requestPermission() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .badge, .sound])
            return granted
        } catch {
            print("❌ Notification permission error: \(error)")
            return false
        }
    }
    
    // MARK: - Schedule Deadline Reminders
    
    func scheduleObligationReminders(for obligations: [Obligation]) {
        // Clear existing
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
        
        let calendar = Calendar.current
        let now = Date()
        
        for obligation in obligations where obligation.status != "completed" {
            let deadline = obligation.deadline
            guard deadline > now else { continue }
            
            // Remind 1 day before
            if let reminderDate = calendar.date(byAdding: .day, value: -1, to: deadline), reminderDate > now {
                scheduleNotification(
                    id: "\(obligation.id)-1day",
                    title: "⚠️ Yarın Son Gün!",
                    body: "\(obligation.projectName) — \(obligation.obligationType)",
                    date: reminderDate
                )
            }
            
            // Remind 3 days before
            if let reminderDate = calendar.date(byAdding: .day, value: -3, to: deadline), reminderDate > now {
                scheduleNotification(
                    id: "\(obligation.id)-3day",
                    title: "📋 3 Gün Kaldı",
                    body: "\(obligation.projectName) — \(obligation.obligationType)",
                    date: reminderDate
                )
            }
            
            // Remind 7 days before
            if let reminderDate = calendar.date(byAdding: .day, value: -7, to: deadline), reminderDate > now {
                scheduleNotification(
                    id: "\(obligation.id)-7day",
                    title: "🔔 1 Hafta Kaldı",
                    body: "\(obligation.projectName) — \(obligation.obligationType)",
                    date: reminderDate
                )
            }
        }
    }
    
    // MARK: - Schedule Job Reminders
    
    func scheduleJobReminders(for jobs: [Job]) {
        let calendar = Calendar.current
        let now = Date()
        
        for job in jobs where job.status != "completed" {
            guard let dueDate = job.dueDate, dueDate > now else { continue }
            
            if let reminderDate = calendar.date(byAdding: .day, value: -1, to: dueDate), reminderDate > now {
                scheduleNotification(
                    id: "job-\(job.id)-1day",
                    title: "💼 İş Hatırlatması",
                    body: "\(job.title) — Yarın son gün!",
                    date: reminderDate
                )
            }
        }
    }
    
    // MARK: - Private Helper
    
    private func scheduleNotification(id: String, title: String, body: String, date: Date) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.badge = 1
        
        let components = Calendar.current.dateComponents(
            [.year, .month, .day, .hour, .minute],
            from: Calendar.current.date(bySettingHour: 9, minute: 0, second: 0, of: date) ?? date
        )
        
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("❌ Notification scheduling error: \(error)")
            }
        }
    }
}
