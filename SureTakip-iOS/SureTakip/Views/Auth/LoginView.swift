import SwiftUI

/// Login screen — mirrors web app's login overlay
struct LoginView: View {
    @EnvironmentObject var authService: AuthService
    
    @State private var email = ""
    @State private var password = ""
    @State private var rememberMe = true
    @State private var isLoggingIn = false
    @State private var showPassword = false
    @State private var shakeOffset: CGFloat = 0
    
    var body: some View {
        ZStack {
            // Background gradient (matching web app's dark theme)
            LinearGradient(
                colors: [
                    Color(hex: "0a0a1a"),
                    Color(hex: "1a1a3e"),
                    Color(hex: "0d0d2b")
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            // Animated background blobs (simplified from web)
            GeometryReader { geo in
                Circle()
                    .fill(Color(hex: "6366f1").opacity(0.15))
                    .frame(width: 200, height: 200)
                    .blur(radius: 60)
                    .offset(x: geo.size.width * 0.6, y: geo.size.height * 0.1)
                
                Circle()
                    .fill(Color(hex: "8b5cf6").opacity(0.1))
                    .frame(width: 300, height: 300)
                    .blur(radius: 80)
                    .offset(x: -geo.size.width * 0.2, y: geo.size.height * 0.6)
            }
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 32) {
                    Spacer(minLength: 60)
                    
                    // Logo & Branding
                    VStack(spacing: 12) {
                        Image(systemName: "clock.badge.checkmark")
                            .font(.system(size: 50))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [Color(hex: "6366f1"), Color(hex: "8b5cf6")],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                        
                        Text("DaVinci Enerji")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                        
                        Text("Lisans Müdürlüğü Süre Takip Platformu")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.6))
                            .multilineTextAlignment(.center)
                    }
                    
                    // Login Form Card
                    VStack(spacing: 20) {
                        // Email Field
                        VStack(alignment: .leading, spacing: 8) {
                            Label("E-posta", systemImage: "envelope")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.7))
                            
                            TextField("ornek@davinci.com.tr", text: $email)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .disableAutocorrection(true)
                                .padding()
                                .background(Color.white.opacity(0.08))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                                )
                                .foregroundColor(.white)
                        }
                        
                        // Password Field
                        VStack(alignment: .leading, spacing: 8) {
                            Label("Şifre", systemImage: "lock")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.7))
                            
                            HStack {
                                if showPassword {
                                    TextField("••••••••", text: $password)
                                        .foregroundColor(.white)
                                } else {
                                    SecureField("••••••••", text: $password)
                                        .foregroundColor(.white)
                                }
                                
                                Button {
                                    showPassword.toggle()
                                } label: {
                                    Image(systemName: showPassword ? "eye.slash" : "eye")
                                        .foregroundColor(.white.opacity(0.5))
                                }
                            }
                            .textContentType(.password)
                            .padding()
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.white.opacity(0.15), lineWidth: 1)
                            )
                        }
                        
                        // Remember Me Toggle
                        Toggle(isOn: $rememberMe) {
                            Text("Beni Hatırla")
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.7))
                        }
                        .tint(Color(hex: "6366f1"))
                        
                        // Error Message
                        if let error = authService.errorMessage {
                            HStack {
                                Image(systemName: "exclamationmark.triangle")
                                Text(error)
                            }
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(8)
                            .transition(.scale.combined(with: .opacity))
                        }
                        
                        // Login Button
                        Button {
                            Task { await performLogin() }
                        } label: {
                            HStack(spacing: 8) {
                                if isLoggingIn {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Text("Giriş Yap")
                                        .fontWeight(.semibold)
                                    Image(systemName: "arrow.right")
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                LinearGradient(
                                    colors: [Color(hex: "6366f1"), Color(hex: "8b5cf6")],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .foregroundColor(.white)
                            .cornerRadius(12)
                            .shadow(color: Color(hex: "6366f1").opacity(0.3), radius: 10, y: 5)
                        }
                        .disabled(isLoggingIn || email.isEmpty || password.isEmpty)
                        .opacity(email.isEmpty || password.isEmpty ? 0.6 : 1)
                    }
                    .padding(24)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(.ultraThinMaterial)
                            .opacity(0.3)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
                    .offset(x: shakeOffset)
                    .padding(.horizontal, 24)
                    
                    Text("Yetkili personel için erişim")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.4))
                    
                    Spacer(minLength: 40)
                }
            }
        }
    }
    
    // MARK: - Login Action
    
    private func performLogin() async {
        isLoggingIn = true
        let success = await authService.signIn(email: email, password: password)
        isLoggingIn = false
        
        if !success {
            // Shake animation (matching web app's shake effect)
            withAnimation(.default) {
                shakeOffset = 10
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                withAnimation(.default) { shakeOffset = -10 }
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                withAnimation(.default) { shakeOffset = 10 }
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                withAnimation(.spring()) { shakeOffset = 0 }
            }
        }
    }
}
