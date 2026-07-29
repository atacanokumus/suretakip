import SwiftUI

/// Hosts the web app and layers the native-only affordances on top:
/// a launch splash, an offline notice, and an error/retry state.
struct RootView: View {
    @StateObject private var model = WebAppModel()
    @StateObject private var lock = BiometricLock()
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()

            WebAppView(model: model)
                // The page itself handles the notch and home indicator via
                // `viewport-fit=cover` + env(safe-area-inset-*) in mobile.css,
                // so the web view is allowed to fill the whole screen.
                .ignoresSafeArea()
                .opacity(model.hasLoadedOnce ? 1 : 0)

            if !model.hasLoadedOnce && model.loadError == nil {
                SplashView()
                    .transition(.opacity)
            }

            if let error = model.loadError {
                LoadErrorView(message: error) {
                    model.reload()
                }
            }

            if model.isOffline && model.hasLoadedOnce {
                VStack {
                    OfflineBanner()
                    Spacer()
                }
                .transition(.move(edge: .top).combined(with: .opacity))
            }

            // Outermost layer: covers the page (including anything already
            // rendered) whenever the app is locked, and while backgrounded so
            // company data isn't exposed in the app switcher.
            if lock.isLocked {
                LockScreen(lock: lock)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: model.hasLoadedOnce)
        .animation(.easeInOut(duration: 0.25), value: model.isOffline)
        .animation(.easeInOut(duration: 0.2), value: lock.isLocked)
        // The PDF report is generated inside the web app; the shell receives the
        // bytes and presents the system share sheet (save to Files, mail, ...).
        .sheet(item: $model.pendingShare) { item in
            ShareSheet(items: [item.url])
        }
        .onAppear {
            lock.authenticate()
            // Asked only after the app is on screen, so the system prompt has
            // context rather than appearing over a blank launch screen.
            PushCenter.shared.requestAuthorization()
        }
        // Single-parameter form: the two-parameter (oldValue, newValue) overload
        // used above previously requires iOS 17, but the app targets iOS 16.
        .onChange(of: scenePhase) { phase in
            switch phase {
            case .background:
                lock.appDidEnterBackground()
            case .active:
                let wasLocked = lock.isLocked
                lock.appWillEnterForeground()
                if lock.isLocked && !wasLocked { lock.authenticate() }
            default:
                break
            }
        }
    }
}

// MARK: - Splash

private struct SplashView: View {
    var body: some View {
        VStack(spacing: 18) {
            Image("AppLogo")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 84, height: 84)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

            Text("Süre Takip")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)

            ProgressView()
                .tint(.white.opacity(0.7))
                .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.appBackground)
        .ignoresSafeArea()
    }
}

// MARK: - Offline banner

private struct OfflineBanner: View {
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "wifi.slash")
            Text("İnternet bağlantısı yok — değişiklikler kaydedilmeyebilir")
                .font(.system(size: 13, weight: .semibold))
                .lineLimit(2)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity)
        .background(Color(red: 0.79, green: 0.24, blue: 0.16))
    }
}

// MARK: - Load failure

private struct LoadErrorView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 42))
                .foregroundStyle(.orange)

            Text("Uygulama yüklenemedi")
                .font(.system(size: 19, weight: .bold))
                .foregroundStyle(.white)

            Text(message)
                .font(.system(size: 14))
                .foregroundStyle(.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Button(action: retry) {
                Text("Tekrar Dene")
                    .font(.system(size: 16, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(Color.accentIndigo)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .padding(.horizontal, 40)
            .padding(.top, 6)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.appBackground)
        .ignoresSafeArea()
    }
}

// MARK: - Share sheet

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}

// MARK: - Palette (mirrors the web app's CSS variables)

extension Color {
    /// --bg-primary: #05050a
    static let appBackground = Color(red: 0x05 / 255, green: 0x05 / 255, blue: 0x0a / 255)
    /// --accent-primary: #6366f1
    static let accentIndigo = Color(red: 0x63 / 255, green: 0x66 / 255, blue: 0xf1 / 255)
}
