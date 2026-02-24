import SwiftUI

/// Obligation list view — mirrors web app's obligations table
struct ObligationListView: View {
    @EnvironmentObject var firestoreService: FirestoreService
    
    @State private var searchText = ""
    @State private var statusFilter: ObligationStatus? = nil
    @State private var typeFilter: String? = nil
    @State private var selectedObligation: Obligation?
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Filter Bar
                filterBar
                
                // Obligations List
                if filteredObligations.isEmpty {
                    emptyState
                } else {
                    List {
                        ForEach(filteredObligations) { obligation in
                            ObligationRowView(obligation: obligation)
                                .listRowBackground(Color.white.opacity(0.03))
                                .listRowSeparatorTint(Color.white.opacity(0.08))
                                .onTapGesture {
                                    selectedObligation = obligation
                                }
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .background(Color(hex: "0a0a1a"))
            .navigationTitle("Yükümlülükler")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .searchable(text: $searchText, prompt: "Proje veya yükümlülük ara...")
            .sheet(item: $selectedObligation) { obligation in
                ObligationDetailView(obligation: obligation)
            }
            .refreshable {
                await firestoreService.loadData()
            }
        }
    }
    
    // MARK: - Filter Bar
    
    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // Status filters
                FilterChip(title: "Tümü", isSelected: statusFilter == nil) {
                    statusFilter = nil
                }
                
                ForEach(ObligationStatus.allCases, id: \.self) { status in
                    FilterChip(
                        title: "\(status.emoji) \(status.label)",
                        isSelected: statusFilter == status,
                        count: countForStatus(status)
                    ) {
                        statusFilter = statusFilter == status ? nil : status
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 10)
        }
        .background(Color.white.opacity(0.03))
    }
    
    // MARK: - Empty State
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(.white.opacity(0.2))
            Text("Yükümlülük bulunamadı")
                .font(.headline)
                .foregroundColor(.white.opacity(0.5))
            Text("Filtrelerinizi değiştirmeyi deneyin")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.3))
            Spacer()
        }
    }
    
    // MARK: - Filtered Data
    
    private var filteredObligations: [Obligation] {
        var result = firestoreService.obligations
        
        // Status filter
        if let status = statusFilter {
            result = result.filter { $0.computedStatus == status }
        }
        
        // Type filter
        if let type = typeFilter {
            result = result.filter { $0.obligationType == type }
        }
        
        // Search
        if !searchText.isEmpty {
            let term = searchText.lowercased()
            result = result.filter {
                $0.projectName.lowercased().contains(term) ||
                $0.obligationType.lowercased().contains(term) ||
                $0.obligationDescription.lowercased().contains(term)
            }
        }
        
        // Sort by deadline
        return result.sorted { $0.deadline < $1.deadline }
    }
    
    private func countForStatus(_ status: ObligationStatus) -> Int {
        firestoreService.obligations.filter { $0.computedStatus == status }.count
    }
}

/// Filter chip button
struct FilterChip: View {
    let title: String
    let isSelected: Bool
    var count: Int? = nil
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Text(title)
                    .font(.caption.bold())
                if let count = count, count > 0 {
                    Text("\(count)")
                        .font(.caption2.bold())
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isSelected ? Color.white.opacity(0.2) : Color.white.opacity(0.1))
                        .cornerRadius(8)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(isSelected ? Color(hex: "6366f1") : Color.white.opacity(0.08))
            .foregroundColor(isSelected ? .white : .white.opacity(0.7))
            .cornerRadius(20)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(isSelected ? Color.clear : Color.white.opacity(0.1), lineWidth: 1)
            )
        }
    }
}
