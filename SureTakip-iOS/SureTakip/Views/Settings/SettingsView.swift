import SwiftUI

/// Settings view — mirrors web app's profile and settings
struct SettingsView: View {
    @EnvironmentObject var authService: AuthService
    @EnvironmentObject var firestoreService: FirestoreService
    
    @State private var showLogoutConfirm = false
    
    // Current user profile
    private var currentUserProfile: AppUser? {
        guard let email = authService.currentUser?.email else { return nil }
        return firestoreService.users.first { $0.email == email }
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Profile Card
                    profileCard
                    
                    // App Info
                    appInfoCard
                    
                    // Data Info
                    dataInfoCard
                    
                    // Notifications
                    notificationsCard
                    
                    // Logout
                    logoutButton
                }
                .padding()
            }
            .background(Color(hex: "0a0a1a"))
            .navigationTitle("Ayarlar")
            .navigationBarTitleDisplayMode(.large)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .alert("Çıkış Yap", isPresented: $showLogoutConfirm) {
                Button("İptal", role: .cancel) {}
                Button("Çıkış Yap", role: .destructive) {
                    authService.signOut()
                }
            } message: {
                Text("Oturumunuzu kapatmak istediğinize emin misiniz?")
            }
        }
    }
    
    // MARK: - Profile Card
    
    private var profileCard: some View {
        VStack(spacing: 16) {
            // Avatar
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: "6366f1"), Color(hex: "8b5cf6")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 80, height: 80)
                
                Text(currentUserProfile?.initials ?? "??")
                    .font(.title.bold())
                    .foregroundColor(.white)
            }
            
            VStack(spacing: 4) {
                Text(currentUserProfile?.displayName ?? authService.currentUser?.email ?? "Kullanıcı")
                    .font(.title3.bold())
                    .foregroundColor(.white)
                
                if let title = currentUserProfile?.title {
                    Text(title)
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.6))
                }
                
                Text(authService.currentUser?.email ?? "")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.4))
            }
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.05))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }
    
    // MARK: - App Info
    
    private var appInfoCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("UYGULAMA")
                .font(.caption.bold())
                .foregroundColor(.white.opacity(0.5))
                .tracking(1.5)
            
            InfoRow(icon: "app.badge", label: "Versiyon", value: "1.0.0")
            InfoRow(icon: "iphone", label: "Platform", value: "iOS (SwiftUI)")
            InfoRow(icon: "globe", label: "Web Versiyonu", value: "sure-takip.web.app")
        }
        .padding()
        .background(RoundedRectangle(cornerRadius: 16).fill(Color.white.opacity(0.05)))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.08)))
    }
    
    // MARK: - Data Info
    
    private var dataInfoCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("VERİ")
                .font(.caption.bold())
                .foregroundColor(.white.opacity(0.5))
                .tracking(1.5)
            
            InfoRow(icon: "list.clipboard", label: "Yükümlülükler", value: "\(firestoreService.obligations.count)")
            InfoRow(icon: "briefcase", label: "İşler", value: "\(firestoreService.jobs.count)")
            InfoRow(icon: "folder", label: "Projeler", value: "\(firestoreService.projects.count)")
            InfoRow(icon: "person.2", label: "Kullanıcılar", value: "\(firestoreService.users.count)")
            
            if let lastUpdate = firestoreService.lastUpdate {
                InfoRow(icon: "arrow.clockwise", label: "Son Senkronizasyon", value: lastUpdate.formatted(.dateTime.day().month().hour().minute()))
            }
        }
        .padding()
        .background(RoundedRectangle(cornerRadius: 16).fill(Color.white.opacity(0.05)))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.08)))
    }
    
    // MARK: - Notifications Card
    
    private var notificationsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("BİLDİRİMLER")
                .font(.caption.bold())
                .foregroundColor(.white.opacity(0.5))
                .tracking(1.5)
            
            Button {
                Task {
                    let granted = await NotificationService.shared.requestPermission()
                    if granted {
                        NotificationService.shared.scheduleObligationReminders(for: firestoreService.obligations)
                        NotificationService.shared.scheduleJobReminders(for: firestoreService.jobs)
                    }
                }
            } label: {
                HStack {
                    Image(systemName: "bell.badge")
                        .foregroundColor(Color(hex: "6366f1"))
                    Text("Hatırlatıcıları Güncelle")
                        .foregroundColor(.white)
                    Spacer()
                    Image(systemName: "arrow.clockwise")
                        .foregroundColor(.white.opacity(0.3))
                }
                .padding()
                .background(Color.white.opacity(0.05))
                .cornerRadius(12)
            }
        }
        .padding()
        .background(RoundedRectangle(cornerRadius: 16).fill(Color.white.opacity(0.05)))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.08)))
    }
    
    // MARK: - Logout
    
    private var logoutButton: some View {
        Button {
            showLogoutConfirm = true
        } label: {
            HStack {
                Image(systemName: "rectangle.portrait.and.arrow.forward")
                Text("Çıkış Yap")
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.red.opacity(0.15))
            .foregroundColor(.red)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.red.opacity(0.3), lineWidth: 1)
            )
        }
    }
}

/// Settings info row
struct InfoRow: View {
    let icon: String
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(Color(hex: "6366f1"))
                .frame(width: 24)
            Text(label)
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.7))
            Spacer()
            Text(value)
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.5))
        }
    }
}
