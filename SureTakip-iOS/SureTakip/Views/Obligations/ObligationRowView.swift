import SwiftUI

/// Individual obligation row in the list
struct ObligationRowView: View {
    let obligation: Obligation
    
    var body: some View {
        HStack(spacing: 14) {
            // Status indicator
            Circle()
                .fill(statusColor)
                .frame(width: 10, height: 10)
                .shadow(color: statusColor.opacity(0.5), radius: 3)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(obligation.projectName)
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                Text(obligation.obligationType)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.6))
                    .lineLimit(1)
                
                if !obligation.obligationDescription.isEmpty {
                    Text(obligation.obligationDescription)
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.4))
                        .lineLimit(2)
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text(obligation.deadline, format: .dateTime.day().month().year())
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.5))
                
                Text(obligation.remainingText)
                    .font(.caption.bold())
                    .foregroundColor(statusColor)
                
                if let commentCount = obligation.comments?.count, commentCount > 0 {
                    HStack(spacing: 2) {
                        Image(systemName: "bubble.left.fill")
                        Text("\(commentCount)")
                    }
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.4))
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    private var statusColor: Color {
        switch obligation.computedStatus {
        case .overdue: return .red
        case .thisWeek: return .orange
        case .thisMonth: return .yellow
        case .upcoming: return .green
        case .completed: return .gray
        }
    }
}
