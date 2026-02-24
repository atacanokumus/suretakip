import SwiftUI

/// Obligation detail view — mirrors web app's detail modal
struct ObligationDetailView: View {
    @EnvironmentObject var firestoreService: FirestoreService
    @Environment(\.dismiss) var dismiss
    
    let obligation: Obligation
    @State private var newComment = ""
    @State private var showDatePicker = false
    @State private var newDeadline: Date
    
    init(obligation: Obligation) {
        self.obligation = obligation
        _newDeadline = State(initialValue: obligation.deadline)
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Status Card
                    statusCard
                    
                    // Details Card
                    detailsCard
                    
                    // Actions Card
                    actionsCard
                    
                    // Comments Section
                    commentsSection
                }
                .padding()
            }
            .background(Color(hex: "0a0a1a"))
            .navigationTitle(obligation.projectName)
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
    
    // MARK: - Status Card
    
    private var statusCard: some View {
        VStack(spacing: 12) {
            HStack {
                Text(obligation.computedStatus.emoji)
                    .font(.largeTitle)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(obligation.computedStatus.label)
                        .font(.headline)
                        .foregroundColor(.white)
                    
                    Text(obligation.remainingText)
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.6))
                }
                
                Spacer()
                
                // Toggle completion
                Button {
                    Task {
                        let newStatus = obligation.status == "completed" ? "pending" : "completed"
                        await firestoreService.updateObligationStatus(id: obligation.id, newStatus: newStatus)
                        dismiss()
                    }
                } label: {
                    Image(systemName: obligation.status == "completed" ? "arrow.uturn.backward.circle.fill" : "checkmark.circle.fill")
                        .font(.title)
                        .foregroundColor(obligation.status == "completed" ? .orange : .green)
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
    
    // MARK: - Details Card
    
    private var detailsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            DetailRow(icon: "building.2", label: "Proje", value: obligation.projectName)
            DetailRow(icon: "doc.text", label: "Yükümlülük Türü", value: obligation.obligationType)
            DetailRow(icon: "text.alignleft", label: "Açıklama", value: obligation.obligationDescription)
            DetailRow(icon: "calendar", label: "Son Tarih", value: obligation.deadline.formatted(.dateTime.day().month().year()))
            
            if let notes = obligation.notes, !notes.isEmpty {
                DetailRow(icon: "note.text", label: "Notlar", value: notes)
            }
            
            if let link = obligation.projectLink, !link.isEmpty {
                HStack {
                    Image(systemName: "link")
                        .foregroundColor(Color(hex: "6366f1"))
                    Link("Proje Linki", destination: URL(string: link) ?? URL(string: "https://example.com")!)
                        .foregroundColor(Color(hex: "6366f1"))
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
    
    // MARK: - Actions Card
    
    private var actionsCard: some View {
        VStack(spacing: 12) {
            // Change deadline
            Button {
                showDatePicker.toggle()
            } label: {
                HStack {
                    Image(systemName: "calendar.badge.clock")
                    Text("Tarihi Değiştir")
                    Spacer()
                    Image(systemName: "chevron.right")
                }
                .foregroundColor(.white.opacity(0.8))
                .padding()
                .background(Color.white.opacity(0.05))
                .cornerRadius(12)
            }
            
            if showDatePicker {
                DatePicker("Yeni Tarih", selection: $newDeadline, displayedComponents: .date)
                    .datePickerStyle(.graphical)
                    .tint(Color(hex: "6366f1"))
                    .padding()
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(12)
                
                Button("Tarihi Kaydet") {
                    Task {
                        await firestoreService.updateObligationDeadline(id: obligation.id, newDate: newDeadline)
                        showDatePicker = false
                        dismiss()
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(hex: "6366f1"))
                .foregroundColor(.white)
                .cornerRadius(12)
            }
        }
    }
    
    // MARK: - Comments Section
    
    private var commentsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("💬 Yorumlar")
                .font(.headline)
                .foregroundColor(.white)
            
            // Existing comments
            if let comments = obligation.comments, !comments.isEmpty {
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
            
            // Add comment
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
                        await firestoreService.addObligationComment(id: obligation.id, text: newComment)
                        newComment = ""
                    }
                } label: {
                    Image(systemName: "paperplane.fill")
                        .padding(12)
                        .background(Color(hex: "6366f1"))
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }
                .disabled(newComment.trimmingCharacters(in: .whitespaces).isEmpty)
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

/// Reusable detail row
struct DetailRow: View {
    let icon: String
    let label: String
    let value: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .foregroundColor(Color(hex: "6366f1"))
                .frame(width: 20)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.5))
                Text(value)
                    .font(.subheadline)
                    .foregroundColor(.white)
            }
        }
    }
}
