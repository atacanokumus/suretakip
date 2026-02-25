import SwiftUI
import FirebaseAuth

/// Job detail view — mirrors web app's job detail modal
struct JobDetailView: View {
    @EnvironmentObject var firestoreService: FirestoreService
    @Environment(\.dismiss) var dismiss
    
    let job: Job
    @State private var newComment = ""
    @State private var isEditing = false
    @State private var editTitle = ""
    @State private var editDescription = ""
    @State private var editPriority = "medium"
    @State private var editDueDate = Date()
    @State private var hasDueDate = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Header with emoji and status
                    headerCard
                    
                    if isEditing {
                        editForm
                    } else {
                        // Details
                        detailsCard
                        
                        // Linked Obligation
                        if let label = job.linkedObligationLabel {
                            linkedObligationCard(label: label)
                        }
                        
                        // History
                        historyCard
                        
                        // Comments
                        commentsCard
                    }
                }
                .padding()
            }
            .background(Color(hex: "0a0a1a"))
            .navigationTitle(isEditing ? "Düzenle" : "İş Detayı")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if isEditing {
                        Button("İptal") {
                            isEditing = false
                        }
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    if isEditing {
                        Button("Kaydet") {
                            Task { await saveEdit() }
                        }
                        .fontWeight(.bold)
                        .foregroundColor(Color(hex: "6366f1"))
                    } else {
                        Menu {
                            Button {
                                editTitle = job.title
                                editDescription = job.description ?? ""
                                editPriority = job.priority ?? "medium"
                                editDueDate = job.dueDate ?? Date()
                                hasDueDate = job.dueDate != nil
                                isEditing = true
                            } label: {
                                Label("Düzenle", systemImage: "pencil")
                            }
                            
                            Button {
                                Task {
                                    await firestoreService.toggleJobStatus(id: job.id)
                                    dismiss()
                                }
                            } label: {
                                Label(
                                    job.isCompleted ? "Tekrar Aç" : "Tamamla",
                                    systemImage: job.isCompleted ? "arrow.uturn.backward" : "checkmark.circle"
                                )
                            }
                            
                            Divider()
                            
                            Button(role: .destructive) {
                                Task {
                                    await firestoreService.deleteJob(id: job.id)
                                    dismiss()
                                }
                            } label: {
                                Label("Sil", systemImage: "trash")
                            }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                                .foregroundColor(Color(hex: "6366f1"))
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Header Card
    
    private var headerCard: some View {
        HStack(spacing: 16) {
            Text(job.emoji ?? "💼")
                .font(.system(size: 44))
            
            VStack(alignment: .leading, spacing: 4) {
                Text(job.title)
                    .font(.title3.bold())
                    .foregroundColor(.white)
                    .strikethrough(job.isCompleted)
                
                HStack(spacing: 8) {
                    StatusBadge(status: job.status)
                    if let priority = job.priority {
                        PriorityBadge(priority: priority)
                    }
                }
            }
            
            Spacer()
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(
                    LinearGradient(
                        colors: [Color(hex: "6366f1").opacity(0.15), Color(hex: "8b5cf6").opacity(0.05)],
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
    
    // MARK: - Details Card
    
    private var detailsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            if let desc = job.description, !desc.isEmpty {
                DetailRow(icon: "text.alignleft", label: "Açıklama", value: desc)
            }
            
            if let project = job.projectName {
                DetailRow(icon: "folder", label: "Proje", value: project)
            }
            
            if let assignee = job.assignedTo {
                DetailRow(icon: "person", label: "Atanan Kişi", value: firestoreService.getUserName(email: assignee))
            }
            
            if let dueDate = job.dueDate {
                DetailRow(icon: "calendar", label: "Son Tarih", value: dueDate.formatted(.dateTime.day().month().year()))
            }
            
            DetailRow(icon: "clock", label: "Oluşturulma", value: job.createdAt.formatted(.dateTime.day().month().year().hour().minute()))
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
    
    // MARK: - Linked Obligation
    
    private func linkedObligationCard(label: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "link")
                .foregroundColor(Color(hex: "6366f1"))
            VStack(alignment: .leading, spacing: 2) {
                Text("Bağlı Yükümlülük")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.5))
                Text(label)
                    .font(.subheadline)
                    .foregroundColor(.white)
            }
            Spacer()
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(hex: "6366f1").opacity(0.08))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color(hex: "6366f1").opacity(0.2), lineWidth: 1)
        )
    }
    
    // MARK: - History Card
    
    private var historyCard: some View {
        Group {
            if let history = job.history, !history.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Text("📜 Geçmiş")
                        .font(.headline)
                        .foregroundColor(.white)
                    
                    ForEach(Array(history.enumerated()), id: \.offset) { _, entry in
                        HStack(spacing: 10) {
                            Circle()
                                .fill(Color(hex: "6366f1"))
                                .frame(width: 6, height: 6)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(entry.action == "completed" ? "Tamamlandı" : entry.action == "reopened" ? "Yeniden Açıldı" : entry.action)
                                    .font(.caption.bold())
                                    .foregroundColor(.white.opacity(0.8))
                                
                                HStack {
                                    Text(entry.user.components(separatedBy: "@").first ?? entry.user)
                                    Text("•")
                                    Text(entry.date, style: .relative)
                                }
                                .font(.caption2)
                                .foregroundColor(.white.opacity(0.4))
                            }
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
        }
    }
    
    // MARK: - Comments Card
    
    private var commentsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("💬 Yorumlar")
                .font(.headline)
                .foregroundColor(.white)
            
            if let comments = job.comments, !comments.isEmpty {
                ForEach(comments) { comment in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(firestoreService.getUserName(email: comment.user))
                                .font(.caption.bold())
                                .foregroundColor(Color(hex: "6366f1"))
                            Spacer()
                            Text(comment.timestamp, style: .relative)
                                .font(.caption2)
                                .foregroundColor(.white.opacity(0.4))
                        }
                        Text(comment.text)
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.8))
                    }
                    .padding(12)
                    .background(Color.white.opacity(0.03))
                    .cornerRadius(10)
                }
            }
            
            HStack(spacing: 8) {
                TextField("Yorum ekle...", text: $newComment)
                    .textFieldStyle(.plain)
                    .padding(12)
                    .background(Color.white.opacity(0.08))
                    .cornerRadius(10)
                    .foregroundColor(.white)
                
                Button {
                    guard !newComment.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                    Task {
                        await firestoreService.addJobComment(id: job.id, text: newComment)
                        newComment = ""
                    }
                } label: {
                    Image(systemName: "paperplane.fill")
                        .padding(12)
                        .background(Color(hex: "6366f1"))
                        .foregroundColor(.white)
                        .cornerRadius(10)
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
    
    // MARK: - Edit Form
    
    private var editForm: some View {
        VStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Text("İş Başlığı")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.6))
                TextField("İş başlığı", text: $editTitle)
                    .textFieldStyle(.plain)
                    .padding(12)
                    .background(Color.white.opacity(0.08))
                    .cornerRadius(10)
                    .foregroundColor(.white)
            }
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Açıklama")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.6))
                TextEditor(text: $editDescription)
                    .frame(minHeight: 80)
                    .padding(8)
                    .background(Color.white.opacity(0.08))
                    .cornerRadius(10)
                    .foregroundColor(.white)
                    .scrollContentBackground(.hidden)
            }
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Öncelik")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.6))
                Picker("Öncelik", selection: $editPriority) {
                    Text("Yüksek").tag("high")
                    Text("Orta").tag("medium")
                    Text("Düşük").tag("low")
                }
                .pickerStyle(.segmented)
            }
            
            Toggle(isOn: $hasDueDate) {
                Text("Son Tarih")
                    .foregroundColor(.white.opacity(0.6))
            }
            .tint(Color(hex: "6366f1"))
            
            if hasDueDate {
                DatePicker("Son Tarih", selection: $editDueDate, displayedComponents: .date)
                    .tint(Color(hex: "6366f1"))
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
    
    // MARK: - Save Edit
    
    private func saveEdit() async {
        await firestoreService.updateJob(id: job.id) { j in
            j.title = editTitle
            j.description = editDescription.isEmpty ? nil : editDescription
            j.priority = editPriority
            j.dueDate = hasDueDate ? editDueDate : nil
        }
        isEditing = false
        dismiss()
    }
}

/// Priority badge component
struct PriorityBadge: View {
    let priority: String
    
    var body: some View {
        Text(label)
            .font(.caption2.bold())
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.2))
            .foregroundColor(color)
            .cornerRadius(6)
    }
    
    private var label: String {
        switch priority {
        case "high": return "Yüksek"
        case "medium": return "Orta"
        case "low": return "Düşük"
        default: return priority
        }
    }
    
    private var color: Color {
        switch priority {
        case "high": return .red
        case "medium": return .orange
        case "low": return .green
        default: return .gray
        }
    }
}
