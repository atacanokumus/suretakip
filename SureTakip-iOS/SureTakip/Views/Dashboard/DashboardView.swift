import SwiftUI
import FirebaseAuth

/// Dashboard view — mirrors web app's main dashboard with stat cards
struct DashboardView: View {
    @EnvironmentObject var firestoreService: FirestoreService
    @EnvironmentObject var authService: AuthService
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Welcome Header
                    welcomeHeader
                    
                    // Stats Groups (matching web app's dashboard-stats-container)
                    statsSection
                    
                    // Upcoming Deadlines
                    upcomingDeadlinesSection
                    
                    // Recent Jobs
                    recentJobsSection
                }
                .padding()
            }
            .background(Color(hex: "0a0a1a"))
            .navigationTitle("Ana Sayfa")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .refreshable {
                await firestoreService.loadData()
            }
        }
    }
    
    // MARK: - Welcome Header
    
    private var welcomeHeader: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Hoş Geldiniz 👋")
                    .font(.title2.bold())
                    .foregroundColor(.white)
                
                Text(firestoreService.getUserName(email: authService.currentUser?.email))
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.6))
            }
            Spacer()
            
            // Sync indicator
            if let lastUpdate = firestoreService.lastUpdate {
                VStack(alignment: .trailing, spacing: 2) {
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.caption)
                        .foregroundColor(.green)
                    Text(lastUpdate, style: .relative)
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.4))
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(
                    LinearGradient(
                        colors: [Color(hex: "6366f1").opacity(0.2), Color(hex: "8b5cf6").opacity(0.1)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }
    
    // MARK: - Stats Section (matching web app's stat-group layout)
    
    private var statsSection: some View {
        VStack(spacing: 16) {
            // İŞLERİM Group
            VStack(alignment: .leading, spacing: 12) {
                Text("İŞLERİM")
                    .font(.caption.bold())
                    .foregroundColor(.white.opacity(0.5))
                    .tracking(1.5)
                
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 12) {
                    StatCard(
                        icon: "briefcase.fill",
                        title: "Aktif İşler",
                        value: "\(activeJobs.count)",
                        color: Color(hex: "6366f1")
                    )
                    StatCard(
                        icon: "checkmark.circle.fill",
                        title: "Tamamlanan",
                        value: "\(completedJobs.count)",
                        color: .green
                    )
                    StatCard(
                        icon: "exclamationmark.triangle.fill",
                        title: "Geciken",
                        value: "\(overdueJobs.count)",
                        color: .red
                    )
                }
            }
            
            Divider().background(Color.white.opacity(0.1))
            
            // YÜKÜMLÜLÜKLER Group
            VStack(alignment: .leading, spacing: 12) {
                Text("YÜKÜMLÜLÜKLER")
                    .font(.caption.bold())
                    .foregroundColor(.white.opacity(0.5))
                    .tracking(1.5)
                
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 12) {
                    StatCard(
                        icon: "clock.badge.exclamationmark",
                        title: "Geciken",
                        value: "\(overdueObligations.count)",
                        color: .red
                    )
                    StatCard(
                        icon: "calendar.badge.clock",
                        title: "Bu Hafta",
                        value: "\(thisWeekObligations.count)",
                        color: .orange
                    )
                    StatCard(
                        icon: "calendar",
                        title: "Bu Ay",
                        value: "\(thisMonthObligations.count)",
                        color: .yellow
                    )
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.05))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }
    
    // MARK: - Upcoming Deadlines
    
    private var upcomingDeadlinesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("⏰ Yaklaşan Süreler")
                    .font(.headline)
                    .foregroundColor(.white)
                Spacer()
                NavigationLink("Tümünü Gör") {
                    ObligationListView()
                }
                .font(.caption)
                .foregroundColor(Color(hex: "6366f1"))
            }
            
            if urgentObligations.isEmpty {
                HStack {
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundColor(.green)
                    Text("Yakın süreli yükümlülük yok")
                        .foregroundColor(.white.opacity(0.6))
                }
                .padding()
            } else {
                ForEach(urgentObligations.prefix(5)) { obligation in
                    ObligationRowCompact(obligation: obligation)
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.05))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }
    
    // MARK: - Recent Jobs
    
    private var recentJobsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("💼 Son İşler")
                    .font(.headline)
                    .foregroundColor(.white)
                Spacer()
                NavigationLink("Tümünü Gör") {
                    JobListView()
                }
                .font(.caption)
                .foregroundColor(Color(hex: "6366f1"))
            }
            
            if firestoreService.jobs.isEmpty {
                HStack {
                    Image(systemName: "tray")
                        .foregroundColor(.white.opacity(0.3))
                    Text("Henüz iş oluşturulmamış")
                        .foregroundColor(.white.opacity(0.6))
                }
                .padding()
            } else {
                ForEach(recentJobs.prefix(3)) { job in
                    JobRowCompact(job: job)
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.05))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }
    
    // MARK: - Computed Properties
    
    private var activeJobs: [Job] { firestoreService.jobs.filter { $0.status == "active" } }
    private var completedJobs: [Job] { firestoreService.jobs.filter { $0.status == "completed" } }
    private var overdueJobs: [Job] { firestoreService.jobs.filter { $0.isOverdue } }
    
    private var overdueObligations: [Obligation] {
        firestoreService.obligations.filter { $0.computedStatus == .overdue }
    }
    private var thisWeekObligations: [Obligation] {
        firestoreService.obligations.filter { $0.computedStatus == .thisWeek }
    }
    private var thisMonthObligations: [Obligation] {
        firestoreService.obligations.filter { $0.computedStatus == .thisMonth }
    }
    private var urgentObligations: [Obligation] {
        firestoreService.obligations
            .filter { $0.status != "completed" }
            .sorted { $0.deadline < $1.deadline }
            .filter { $0.deadline > Date().addingTimeInterval(-86400 * 30) } // Show last 30 days overdue too
    }
    private var recentJobs: [Job] {
        firestoreService.jobs.sorted { $0.updatedAt > $1.updatedAt }
    }
}

/// Compact obligation row for dashboard
struct ObligationRowCompact: View {
    let obligation: Obligation
    
    var body: some View {
        HStack(spacing: 12) {
            Text(obligation.computedStatus.emoji)
                .font(.title3)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(obligation.projectName)
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                Text(obligation.obligationType)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.5))
                    .lineLimit(1)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 2) {
                Text(obligation.deadline, style: .date)
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.5))
                
                Text(obligation.remainingText)
                    .font(.caption.bold())
                    .foregroundColor(obligation.computedStatus == .overdue ? .red : .orange)
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color.white.opacity(0.03))
        .cornerRadius(10)
    }
}

/// Compact job row for dashboard
struct JobRowCompact: View {
    let job: Job
    
    var body: some View {
        HStack(spacing: 12) {
            Text(job.emoji ?? "💼")
                .font(.title3)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(job.title)
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .strikethrough(job.isCompleted)
                
                if let project = job.projectName {
                    Text(project)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            StatusBadge(status: job.status)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color.white.opacity(0.03))
        .cornerRadius(10)
    }
}
