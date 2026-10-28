import AuthenticationServices
import SwiftUI

/// Mirrors `app/login` and `app/register` on the web: email and password or Sign in with Apple,
/// all through jaybulb-api. Toolbar entry point, shown as a sheet.
struct AuthBar: View {
    @State private var account = Account.shared
    @State private var showingSheet = false

    var body: some View {
        Group {
            if let email = account.email {
                Menu(email) {
                    Button("Log out", role: .destructive) { account.signOut() }
                    Button("Delete account", role: .destructive) { Task { await account.deleteAccount() } }
                }
                .font(.caption)
            } else {
                Button("Log in") { showingSheet = true }
                    .font(.caption)
            }
        }
        .sheet(isPresented: $showingSheet) { AuthSheet() }
    }
}

private struct AuthSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var account = Account.shared

    @State private var email = ""
    @State private var password = ""
    @State private var isRegister = false
    @State private var submitting = false

    var body: some View {
        NavigationStack {
            Form {
                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    #if os(iOS)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    #endif
                SecureField("Password", text: $password)
                    .textContentType(isRegister ? .newPassword : .password)
                if !isRegister {
                    Button("Forgot password?") { Task { await account.recover(email: email) } }
                        .font(.caption)
                        .disabled(email.isEmpty)
                }
                if let error = account.error { Text(error).foregroundStyle(.red).font(.caption) }
                if let notice = account.notice { Text(notice).foregroundStyle(.secondary).font(.caption) }
                Button(isRegister ? "Have an account? Log in" : "Need an account? Register") {
                    isRegister.toggle()
                    account.error = nil
                }
                .font(.caption)

                Section {
                    SignInWithAppleButton(.signIn) { account.prepare($0) } onCompletion: { result in
                        Task { if await account.finish(result) { dismiss() } }
                    }
                    .signInWithAppleButtonStyle(.black)
                    .frame(height: 44)
                }
            }
            .navigationTitle(isRegister ? "Register" : "Log in")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(submitting ? "..." : (isRegister ? "Register" : "Log in")) { Task { await submit() } }
                        .disabled(submitting || email.isEmpty || password.isEmpty)
                }
            }
        }
    }

    private func submit() async {
        submitting = true
        defer { submitting = false }
        if isRegister {
            await account.signUp(email: email, password: password)
        } else if await account.signIn(email: email, password: password) {
            dismiss()
        }
    }
}
