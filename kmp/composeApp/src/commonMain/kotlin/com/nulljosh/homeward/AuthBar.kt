package com.nulljosh.homeward

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

/** Mirrors `lib/AuthBar.tsx`: signed-out shows a log in link, signed-in shows email + log out. */
@Composable
fun AuthBar(session: Session?, onSession: (Session?) -> Unit, client: AuthClient = AuthClient()) {
    var showDialog by remember { mutableStateOf(false) }

    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        if (session != null) {
            Text(session.email, style = MaterialTheme.typography.bodySmall)
            TextButton(onClick = { onSession(null) }) { Text("log out") }
        } else {
            TextButton(onClick = { showDialog = true }) { Text("log in") }
        }
    }

    if (showDialog) {
        AuthDialog(
            client = client,
            onDismiss = { showDialog = false },
            onSignedIn = { onSession(it); showDialog = false },
        )
    }
}

@Composable
private fun AuthDialog(client: AuthClient, onDismiss: () -> Unit, onSignedIn: (Session) -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isRegister by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var submitting by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (isRegister) "register" else "log in") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(email, { email = it }, label = { Text("email") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(password, { password = it }, label = { Text("password") }, singleLine = true,
                    visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth())
                error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                TextButton(onClick = { isRegister = !isRegister; error = null }) {
                    Text(if (isRegister) "have an account? log in" else "need an account? register")
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = !submitting && email.isNotBlank() && password.isNotBlank(),
                onClick = {
                    submitting = true
                    error = null
                    scope.launch {
                        val result = if (isRegister) client.signUp(email, password) else client.signIn(email, password)
                        submitting = false
                        result.onSuccess(onSignedIn).onFailure { error = it.message }
                    }
                },
            ) { Text(if (submitting) "..." else if (isRegister) "register" else "log in") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("cancel") } },
    )
}
