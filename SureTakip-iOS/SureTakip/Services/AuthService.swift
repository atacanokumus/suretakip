import Foundation
import FirebaseAuth
import Combine

/// Handles Firebase Authentication — mirrors web app's auth.js
@MainActor
class AuthService: ObservableObject {
    @Published var currentUser: FirebaseAuth.User?
    @Published var isAuthenticated = false
    @Published var isLoading = true
    @Published var errorMessage: String?
    
    var userEmail: String? {
        currentUser?.email
    }
    
    private var authStateHandle: AuthStateDidChangeListenerHandle?
    
    init() {
        listenToAuthState()
    }
    
    deinit {
        if let handle = authStateHandle {
            Auth.auth().removeStateDidChangeListener(handle)
        }
    }
    
    // MARK: - Auth State Listener
    
    private func listenToAuthState() {
        authStateHandle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            guard let self = self else { return }
            self.currentUser = user
            self.isAuthenticated = user != nil
            self.isLoading = false
        }
    }
    
    // MARK: - Sign In (Email/Password — matching web app)
    
    func signIn(email: String, password: String) async -> Bool {
        errorMessage = nil
        do {
            let result = try await Auth.auth().signIn(withEmail: email, password: password)
            currentUser = result.user
            isAuthenticated = true
            return true
        } catch {
            errorMessage = mapAuthError(error)
            return false
        }
    }
    
    // MARK: - Sign Out
    
    func signOut() {
        do {
            try Auth.auth().signOut()
            currentUser = nil
            isAuthenticated = false
        } catch {
            errorMessage = "Çıkış yapılamadı: \(error.localizedDescription)"
        }
    }
    
    // MARK: - Error Mapping (Turkish)
    
    private func mapAuthError(_ error: Error) -> String {
        let nsError = error as NSError
        switch nsError.code {
        case AuthErrorCode.wrongPassword.rawValue:
            return "Hatalı şifre. Lütfen tekrar deneyin."
        case AuthErrorCode.invalidEmail.rawValue:
            return "Geçersiz e-posta adresi."
        case AuthErrorCode.userNotFound.rawValue:
            return "Bu e-posta ile kayıtlı kullanıcı bulunamadı."
        case AuthErrorCode.networkError.rawValue:
            return "İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin."
        case AuthErrorCode.tooManyRequests.rawValue:
            return "Çok fazla başarısız deneme. Lütfen biraz bekleyin."
        default:
            return "Giriş yapılamadı. Hata: \(error.localizedDescription)"
        }
    }
}
