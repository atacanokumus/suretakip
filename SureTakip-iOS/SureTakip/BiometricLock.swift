import SwiftUI
import LocalAuthentication

/// Face ID / passcode gate in front of the app.
///
/// The device holds a logged-in session for the company's regulatory tracker,
/// and that session deliberately survives app restarts (nobody wants to type a
/// password every morning). This is what stops "phone left unlocked on a desk"
/// from meaning "anyone can read and edit EPDK deadlines".
@MainActor
final class BiometricLock: ObservableObject {
    /// True while the app should be covered by the lock screen.
    @Published var isLocked = true
    @Published var lastError: String?

    /// Re-locking on every return to foreground makes the app tedious to use
    /// (glance at a notification, come back, authenticate again). Only re-lock
    /// once the app has genuinely been away.
    private let relockAfter: TimeInterval = 5 * 60
    private var backgroundedAt: Date?

    /// `.deviceOwnerAuthentication`, not `...WithBiometrics`: it falls back to
    /// the device passcode, so the app stays usable if Face ID fails or isn't
    /// enrolled rather than locking the user out entirely.
    private let policy: LAPolicy = .deviceOwnerAuthentication

    /// If a device has no passcode at all there is nothing to authenticate
    /// against; gating would lock the user out permanently.
    var isAvailable: Bool {
        LAContext().canEvaluatePolicy(policy, error: nil)
    }

    func authenticate() {
        guard isAvailable else {
            isLocked = false
            return
        }

        let context = LAContext()
        context.localizedCancelTitle = "İptal"

        context.evaluatePolicy(policy, localizedReason: "Süre Takip'i açmak için kimliğinizi doğrulayın") { success, error in
            Task { @MainActor in
                if success {
                    self.isLocked = false
                    self.lastError = nil
                } else {
                    self.lastError = (error as? LAError)?.friendlyMessage
                        ?? error?.localizedDescription
                }
            }
        }
    }

    func appDidEnterBackground() {
        backgroundedAt = Date()
    }

    func appWillEnterForeground() {
        guard let since = backgroundedAt else { return }
        if Date().timeIntervalSince(since) >= relockAfter {
            isLocked = true
        }
        backgroundedAt = nil
    }
}

private extension LAError {
    var friendlyMessage: String? {
        switch code {
        case .userCancel, .appCancel, .systemCancel:
            return nil // not an error worth showing
        case .biometryNotEnrolled:
            return "Face ID tanımlı değil. Cihaz şifrenizi kullanabilirsiniz."
        case .biometryLockout:
            return "Çok fazla deneme yapıldı. Cihaz şifrenizi kullanın."
        default:
            return "Kimlik doğrulanamadı."
        }
    }
}

/// Full-screen cover shown while `isLocked`.
struct LockScreen: View {
    @ObservedObject var lock: BiometricLock

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "lock.shield.fill")
                .font(.system(size: 52))
                .foregroundStyle(Color.accentIndigo)

            Text("Süre Takip Kilitli")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)

            if let error = lock.lastError {
                Text(error)
                    .font(.system(size: 13))
                    .foregroundStyle(.white.opacity(0.65))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }

            Button(action: lock.authenticate) {
                Text("Kilidi Aç")
                    .font(.system(size: 16, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(Color.accentIndigo)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .padding(.horizontal, 48)
            .padding(.top, 6)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.appBackground)
        .ignoresSafeArea()
    }
}
