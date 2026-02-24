import SwiftUI

/// Jobs list view — mirrors web app's jobs page
struct JobListView: View {
    @EnvironmentObject var firestoreService: FirestoreService
    
    @State private var searchText = ""
    @State private var statusFilter: String? = nil
    @State private var showCreateJob = false
    @State private var selectedJob: Job?
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Job Stats Header
                jobStatsHeader
                
                // Filter Tabs
                filterTabs
                
                // Jobs List
                if filteredJobs.isEmpty {
                    emptyState
                } else {
                    List {
                        ForEach(filteredJobs) { job in
                            JobCardView(job: job)
                                .listRowBackground(Color.clear)
                                .listRowSeparator(.hidden)
                                .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                                .onTapGesture { selectedJob = job }
                                .swipeActions(edge: .trailing) {
                                    Button {
                                        Task { await firestoreService.toggleJobStatus(id: job.id) }
                                    } label: {
                                        Label(
                                            job.isCompleted ? "Geri Al" : "Tamamla",
                                            systemImage: job.isCompleted ? "arrow.uturn.backward" : "checkmark"
                                        )
                                    }
                                    .tint(job.isCompleted ? .orange : .green)
                                    
                                    Button(role: .destructive) {
                                        Task { await firestoreService.deleteJob(id: job.id) }
                                    } label: {
                                        Label("Sil", systemImage: "trash")
                                    }
                                }
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .background(Color(hex: "0a0a1a"))
            .navigationTitle("İşler")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .searchable(text: $searchText, prompt: "İş ara...")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showCreateJob = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(Color(hex: "6366f1"))
                            .font(.title2)
                    }
                }
            }
            .sheet(isPresented: $showCreateJob) {
                CreateJobView()
            }
            .sheet(item: $selectedJob) { job in
                JobDetailView(job: job)
            }
            .refreshable {
                await firestoreService.loadData()
            }
        }
    }
    
    // MARK: - Job Stats Header
    
    private var jobStatsHeader: some View {
        HStack(spacing: 16) {
            MiniStat(value: "\(firestoreService.jobs.count)", label: "Toplam", color: .white)
            MiniStat(value: "\(activeCount)", label: "Aktif", color: Color(hex: "6366f1"))
            MiniStat(value: "\(completedCount)", label: "Tamamlanan", color: .green)
            MiniStat(value: "\(overdueCount)", label: "Geciken", color: .red)
        }
        .padding()
        .background(Color.white.opacity(0.03))
    }
    
    // MARK: - Filter Tabs
    
    private var filterTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                FilterChip(title: "Tümü", isSelected: statusFilter == nil, count: firestoreService.jobs.count) {
                    statusFilter = nil
                }
                FilterChip(title: "🔵 Aktif", isSelected: statusFilter == "active", count: activeCount) {
                    statusFilter = statusFilter == "active" ? nil : "active"
                }
                FilterChip(title: "✅ Tamamlanan", isSelected: statusFilter == "completed", count: completedCount) {
                    statusFilter = statusFilter == "completed" ? nil : "completed"
                }
                FilterChip(title: "⏸️ Beklemede", isSelected: statusFilter == "paused", count: pausedCount) {
                    statusFilter = statusFilter == "paused" ? nil : "paused"
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 10)
        }
    }
    
    // MARK: - Empty State
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "briefcase")
                .font(.system(size: 48))
                .foregroundColor(.white.opacity(0.2))
            Text("Henüz iş yok")
                .font(.headline)
                .foregroundColor(.white.opacity(0.5))
            Button {
                showCreateJob = true
            } label: {
                Label("Yeni İş Oluştur", systemImage: "plus")
                    .padding()
                    .background(Color(hex: "6366f1"))
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }
            Spacer()
        }
    }
    
    // MARK: - Computed
    
    private var filteredJobs: [Job] {
        var result = firestoreService.jobs
        
        if let filter = statusFilter {
            result = result.filter { $0.status == filter }
        }
        
        if !searchText.isEmpty {
            let term = searchText.lowercased()
            result = result.filter {
                $0.title.lowercased().contains(term) ||
                ($0.description?.lowercased().contains(term) ?? false) ||
                ($0.projectName?.lowercased().contains(term) ?? false)
            }
        }
        
        return result.sorted { $0.updatedAt > $1.updatedAt }
    }
    
    private var activeCount: Int { firestoreService.jobs.filter { $0.status == "active" }.count }
    private var completedCount: Int { firestoreService.jobs.filter { $0.status == "completed" }.count }
    private var pausedCount: Int { firestoreService.jobs.filter { $0.status == "paused" }.count }
    private var overdueCount: Int { firestoreService.jobs.filter { $0.isOverdue }.count }
}

/// Mini stat for job header
struct MiniStat: View {
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title3.bold())
                .foregroundColor(color)
            Text(label)
                .font(.caption2)
                .foregroundColor(.white.opacity(0.5))
        }
        .frame(maxWidth: .infinity)
    }
}

/// Job card view
struct JobCardView: View {
    let job: Job
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(job.emoji ?? "💼")
                    .font(.title2)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(job.title)
                        .font(.subheadline.bold())
                        .foregroundColor(.white)
                        .lineLimit(2)
                        .strikethrough(job.isCompleted, color: .white.opacity(0.3))
                    
                    if let project = job.projectName {
                        Text(project)
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.5))
                    }
                }
                
                Spacer()
                
                StatusBadge(status: job.status)
            }
            
            HStack {
                if let assignee = job.assignedTo {
                    HStack(spacing: 4) {
                        Image(systemName: "person.fill")
                        Text(assignee.components(separatedBy: "@").first ?? assignee)
                    }
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.4))
                }
                
                Spacer()
                
                if let dueDateText = job.dueDateText {
                    Text(dueDateText)
                        .font(.caption.bold())
                        .foregroundColor(job.isOverdue ? .red : .white.opacity(0.5))
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(job.isCompleted ? 0.02 : 0.06))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(job.isOverdue ? Color.red.opacity(0.3) : Color.white.opacity(0.08), lineWidth: 1)
        )
        .opacity(job.isCompleted ? 0.7 : 1)
    }
}
