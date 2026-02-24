import SwiftUI

/// Main tab navigation — mirrors web app's sidebar navigation
struct MainTabView: View {
    @EnvironmentObject var firestoreService: FirestoreService
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem {
                    Image(systemName: "chart.bar.fill")
                    Text("Ana Sayfa")
                }
                .tag(0)
            
            ObligationListView()
                .tabItem {
                    Image(systemName: "list.clipboard.fill")
                    Text("Yükümlülükler")
                }
                .tag(1)
                .badge(urgentObligationCount)
            
            JobListView()
                .tabItem {
                    Image(systemName: "briefcase.fill")
                    Text("İşler")
                }
                .tag(2)
                .badge(activeJobCount)
            
            ProjectListView()
                .tabItem {
                    Image(systemName: "folder.fill")
                    Text("Projeler")
                }
                .tag(3)
            
            SettingsView()
                .tabItem {
                    Image(systemName: "gearshape.fill")
                    Text("Ayarlar")
                }
                .tag(4)
        }
        .tint(Color(hex: "6366f1"))
    }
    
    // Badges for tab items
    private var urgentObligationCount: Int {
        firestoreService.obligations.filter { o in
            o.status != "completed" && o.deadline < Calendar.current.date(byAdding: .day, value: 7, to: Date())!
        }.count
    }
    
    private var activeJobCount: Int {
        firestoreService.jobs.filter { $0.status == "active" }.count
    }
}
