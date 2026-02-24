import SwiftUI

/// Project list view — mirrors web app's projects page
struct ProjectListView: View {
    @EnvironmentObject var firestoreService: FirestoreService
    @State private var searchText = ""
    @State private var selectedProject: Project?
    
    var body: some View {
        NavigationStack {
            Group {
                if filteredProjects.isEmpty {
                    VStack(spacing: 16) {
                        Spacer()
                        Image(systemName: "folder")
                            .font(.system(size: 48))
                            .foregroundColor(.white.opacity(0.2))
                        Text("Proje bulunamadı")
                            .font(.headline)
                            .foregroundColor(.white.opacity(0.5))
                        Spacer()
                    }
                } else {
                    List {
                        ForEach(filteredProjects) { project in
                            ProjectRow(
                                project: project,
                                obligationCount: obligationCount(for: project.name),
                                jobCount: jobCount(for: project.name)
                            )
                            .listRowBackground(Color.white.opacity(0.03))
                            .listRowSeparatorTint(Color.white.opacity(0.08))
                            .onTapGesture { selectedProject = project }
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .background(Color(hex: "0a0a1a"))
            .navigationTitle("Projeler")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .searchable(text: $searchText, prompt: "Proje ara...")
            .sheet(item: $selectedProject) { project in
                ProjectDetailSheet(project: project)
            }
        }
    }
    
    private var filteredProjects: [Project] {
        if searchText.isEmpty { return firestoreService.projects }
        let term = searchText.lowercased()
        return firestoreService.projects.filter {
            $0.name.lowercased().contains(term) ||
            ($0.company?.lowercased().contains(term) ?? false)
        }
    }
    
    private func obligationCount(for projectName: String) -> Int {
        firestoreService.obligations.filter { $0.projectName == projectName }.count
    }
    
    private func jobCount(for projectName: String) -> Int {
        firestoreService.jobs.filter { $0.projectName == projectName }.count
    }
}

struct ProjectRow: View {
    let project: Project
    let obligationCount: Int
    let jobCount: Int
    
    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: "folder.fill")
                .font(.title2)
                .foregroundColor(Color(hex: "6366f1"))
            
            VStack(alignment: .leading, spacing: 4) {
                Text(project.name)
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                
                if let company = project.company {
                    Text(company)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                }
                
                if let expert = project.expert, let name = expert.name, !name.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "person.fill")
                        Text(name)
                    }
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.4))
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                HStack(spacing: 4) {
                    Image(systemName: "list.clipboard")
                    Text("\(obligationCount)")
                }
                .font(.caption2)
                .foregroundColor(.white.opacity(0.4))
                
                HStack(spacing: 4) {
                    Image(systemName: "briefcase")
                    Text("\(jobCount)")
                }
                .font(.caption2)
                .foregroundColor(.white.opacity(0.4))
            }
        }
        .padding(.vertical, 4)
    }
}

/// Project detail sheet with obligations and jobs for that project
struct ProjectDetailSheet: View {
    @EnvironmentObject var firestoreService: FirestoreService
    @Environment(\.dismiss) var dismiss
    let project: Project
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Project Info
                    VStack(alignment: .leading, spacing: 12) {
                        if let company = project.company {
                            DetailRow(icon: "building.2", label: "Şirket", value: company)
                        }
                        if let parent = project.parent {
                            DetailRow(icon: "arrow.up.right", label: "Ana Proje", value: parent)
                        }
                        if let expert = project.expert {
                            if let name = expert.name, !name.isEmpty {
                                DetailRow(icon: "person", label: "Uzman", value: name)
                            }
                            if let phone = expert.phone, !phone.isEmpty {
                                HStack {
                                    Image(systemName: "phone")
                                        .foregroundColor(Color(hex: "6366f1"))
                                    Link(phone, destination: URL(string: "tel:\(phone)") ?? URL(string: "tel:")!)
                                        .foregroundColor(Color(hex: "6366f1"))
                                }
                            }
                        }
                    }
                    .padding()
                    .background(RoundedRectangle(cornerRadius: 16).fill(Color.white.opacity(0.05)))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.08)))
                    
                    // Obligations for this project
                    VStack(alignment: .leading, spacing: 12) {
                        Text("📋 Yükümlülükler (\(projectObligations.count))")
                            .font(.headline)
                            .foregroundColor(.white)
                        
                        ForEach(projectObligations) { ob in
                            ObligationRowCompact(obligation: ob)
                        }
                    }
                    .padding()
                    .background(RoundedRectangle(cornerRadius: 16).fill(Color.white.opacity(0.05)))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.08)))
                    
                    // Jobs for this project
                    VStack(alignment: .leading, spacing: 12) {
                        Text("💼 İşler (\(projectJobs.count))")
                            .font(.headline)
                            .foregroundColor(.white)
                        
                        ForEach(projectJobs) { job in
                            JobRowCompact(job: job)
                        }
                    }
                    .padding()
                    .background(RoundedRectangle(cornerRadius: 16).fill(Color.white.opacity(0.05)))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.08)))
                }
                .padding()
            }
            .background(Color(hex: "0a0a1a"))
            .navigationTitle(project.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Kapat") { dismiss() }
                        .foregroundColor(Color(hex: "6366f1"))
                }
            }
        }
    }
    
    private var projectObligations: [Obligation] {
        firestoreService.obligations
            .filter { $0.projectName == project.name }
            .sorted { $0.deadline < $1.deadline }
    }
    
    private var projectJobs: [Job] {
        firestoreService.jobs
            .filter { $0.projectName == project.name }
            .sorted { $0.updatedAt > $1.updatedAt }
    }
}
