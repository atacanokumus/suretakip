import SwiftUI
import FirebaseAuth

/// Create new job view — mirrors web app's job creation modal
struct CreateJobView: View {
    @EnvironmentObject var firestoreService: FirestoreService
    @EnvironmentObject var authService: AuthService
    @Environment(\.dismiss) var dismiss
    
    @State private var title = ""
    @State private var description = ""
    @State private var priority = "medium"
    @State private var selectedProject: String? = nil
    @State private var hasDueDate = false
    @State private var dueDate = Date()
    @State private var linkedObligationId: String? = nil
    @State private var selectedEmoji = "💼"
    @State private var isSaving = false
    
    let emojiOptions = ["💼", "📋", "🔧", "📊", "📝", "🎯", "⚡️", "🔍", "📌", "🚀", "💡", "⚙️", "📎", "🗂", "🔔"]
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Emoji Picker
                    emojiPicker
                    
                    // Title
                    VStack(alignment: .leading, spacing: 8) {
                        Text("İş Başlığı *")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.6))
                        TextField("İş başlığı yazın...", text: $title)
                            .textFieldStyle(.plain)
                            .padding(14)
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(12)
                            .foregroundColor(.white)
                    }
                    
                    // Description
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Açıklama")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.6))
                        TextEditor(text: $description)
                            .frame(minHeight: 80)
                            .padding(10)
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(12)
                            .foregroundColor(.white)
                            .scrollContentBackground(.hidden)
                    }
                    
                    // Priority
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Öncelik")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.6))
                        Picker("Öncelik", selection: $priority) {
                            Text("🔴 Yüksek").tag("high")
                            Text("🟠 Orta").tag("medium")
                            Text("🟢 Düşük").tag("low")
                        }
                        .pickerStyle(.segmented)
                    }
                    
                    // Project Selection
                    if !firestoreService.projects.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Proje")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.6))
                            
                            Menu {
                                Button("Proje Seçilmedi") { selectedProject = nil }
                                ForEach(firestoreService.projects) { project in
                                    Button(project.name) { selectedProject = project.name }
                                }
                            } label: {
                                HStack {
                                    Text(selectedProject ?? "Proje seçin...")
                                        .foregroundColor(selectedProject != nil ? .white : .white.opacity(0.4))
                                    Spacer()
                                    Image(systemName: "chevron.down")
                                        .foregroundColor(.white.opacity(0.4))
                                }
                                .padding(14)
                                .background(Color.white.opacity(0.08))
                                .cornerRadius(12)
                            }
                        }
                    }
                    
                    // Linked Obligation
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Bağlı Yükümlülük")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.6))
                        
                        Menu {
                            Button("Bağlantı Yok") { linkedObligationId = nil }
                            ForEach(upcomingObligations) { ob in
                                Button("\(ob.projectName) — \(ob.obligationType)") {
                                    linkedObligationId = ob.id
                                }
                            }
                        } label: {
                            HStack {
                                if let linkedId = linkedObligationId,
                                   let ob = firestoreService.obligations.first(where: { $0.id == linkedId }) {
                                    Text("\(ob.projectName) — \(ob.obligationType)")
                                        .foregroundColor(.white)
                                        .lineLimit(1)
                                } else {
                                    Text("Yükümlülük bağla...")
                                        .foregroundColor(.white.opacity(0.4))
                                }
                                Spacer()
                                Image(systemName: "chevron.down")
                                    .foregroundColor(.white.opacity(0.4))
                            }
                            .padding(14)
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(12)
                        }
                    }
                    
                    // Due Date
                    Toggle(isOn: $hasDueDate) {
                        Text("Son Tarih Belirle")
                            .foregroundColor(.white.opacity(0.7))
                    }
                    .tint(Color(hex: "6366f1"))
                    
                    if hasDueDate {
                        DatePicker("Son Tarih", selection: $dueDate, displayedComponents: .date)
                            .tint(Color(hex: "6366f1"))
                    }
                }
                .padding()
            }
            .background(Color(hex: "0a0a1a"))
            .navigationTitle("Yeni İş")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("İptal") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await createJob() }
                    } label: {
                        if isSaving {
                            ProgressView()
                        } else {
                            Text("Oluştur")
                                .fontWeight(.bold)
                        }
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || isSaving)
                    .foregroundColor(Color(hex: "6366f1"))
                }
            }
        }
    }
    
    // MARK: - Emoji Picker
    
    private var emojiPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Emoji")
                .font(.caption)
                .foregroundColor(.white.opacity(0.6))
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(emojiOptions, id: \.self) { emoji in
                        Button {
                            selectedEmoji = emoji
                        } label: {
                            Text(emoji)
                                .font(.title2)
                                .padding(8)
                                .background(selectedEmoji == emoji ? Color(hex: "6366f1").opacity(0.3) : Color.white.opacity(0.05))
                                .cornerRadius(10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(selectedEmoji == emoji ? Color(hex: "6366f1") : Color.clear, lineWidth: 2)
                                )
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Upcoming Obligations (sorted nearest first)
    
    private var upcomingObligations: [Obligation] {
        firestoreService.obligations
            .filter { $0.status != "completed" }
            .sorted { $0.deadline < $1.deadline }
    }
    
    // MARK: - Create Action
    
    private func createJob() async {
        isSaving = true
        defer { isSaving = false }
        
        var linkedLabel: String? = nil
        if let linkedId = linkedObligationId,
           let ob = firestoreService.obligations.first(where: { $0.id == linkedId }) {
            linkedLabel = "\(ob.projectName) — \(ob.obligationType)"
        }
        
        let newJob = Job(
            id: UUID().uuidString,
            title: title.trimmingCharacters(in: .whitespaces),
            description: description.isEmpty ? nil : description,
            status: "active",
            priority: priority,
            assignedTo: authService.currentUser?.email,
            projectName: selectedProject,
            linkedObligationId: linkedObligationId,
            linkedObligationLabel: linkedLabel,
            dueDate: hasDueDate ? dueDate : nil,
            completedAt: nil,
            comments: nil,
            history: [Job.JobHistoryEntry(
                action: "created",
                user: authService.currentUser?.email ?? "unknown",
                date: Date()
            )],
            emoji: selectedEmoji,
            createdAt: Date(),
            updatedAt: Date()
        )
        
        await firestoreService.addJob(newJob)
        dismiss()
    }
}
