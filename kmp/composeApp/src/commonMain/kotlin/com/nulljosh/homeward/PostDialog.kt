package com.nulljosh.homeward

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

/** A photo the platform picked: its bytes and MIME type. */
class Photo(val bytes: ByteArray, val type: String)

/**
 * Mirrors `app/post/page.tsx`: the required fields, an optional photo, then the edit link once,
 * because signed out that link is the only way back to the post.
 */
@Composable
fun PostDialog(
    client: ListingsClient,
    session: Session?,
    pickPhoto: (suspend () -> Photo?)?,
    openWeb: (String) -> Unit,
    onPosted: (Listing) -> Unit,
    onDismiss: () -> Unit,
) {
    var type by remember { mutableStateOf("lost") }
    var name by remember { mutableStateOf("") }
    var species by remember { mutableStateOf("") }
    var color by remember { mutableStateOf("") }
    var where by remember { mutableStateOf("") }
    var tag by remember { mutableStateOf("") }
    var details by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf(session?.email ?: "") }
    var photo by remember { mutableStateOf<Photo?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var posted by remember { mutableStateOf<Listing?>(null) }
    val scope = rememberCoroutineScope()
    val opt = { s: String -> s.trim().ifEmpty { null } }

    posted?.let { l ->
        AlertDialog(
            onDismissRequest = onDismiss,
            title = { Text("Posted") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Keep this link. It is how you mark ${l.title} found or take the post down.")
                    l.editToken?.let { SelectionContainer { Text(ListingsClient.editLink(it), style = MaterialTheme.typography.bodySmall) } }
                }
            },
            confirmButton = { TextButton(onClick = onDismiss) { Text("Done") } },
            dismissButton = { l.editToken?.let { t -> TextButton(onClick = { openWeb(ListingsClient.editLink(t)) }) { Text("Open edit link") } } },
        )
        return
    }

    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = { Text("Post a pet") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("lost" to "Lost", "found" to "Found").forEach { (k, label) ->
                        FilterChip(selected = type == k, onClick = { type = k }, label = { Text(label) })
                    }
                }
                OutlinedTextField(species, { species = it }, label = { Text("Species, like dog or cat") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(where, { where = it }, label = { Text("Where it was last seen") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(name, { name = it }, label = { Text("Name (optional)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(color, { color = it }, label = { Text("Colour (optional)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(tag, { tag = it }, label = { Text("Tag or chip number (optional)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(details, { details = it }, label = { Text("Details (optional)") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(phone, { phone = it }, label = { Text("Phone") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(email, { email = it }, label = { Text("Email") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                if (pickPhoto != null) {
                    OutlinedButton(onClick = { scope.launch { pickPhoto()?.let { photo = it } } }, enabled = !busy) {
                        Text(if (photo == null) "Add a photo" else "Photo added, change it")
                    }
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            }
        },
        confirmButton = {
            Button(
                enabled = !busy,
                onClick = {
                    error = when {
                        species.isBlank() || where.isBlank() -> "Species and where it was last seen are required."
                        phone.isBlank() && email.isBlank() -> "Leave a phone number or an email so people can reach you."
                        else -> null
                    }
                    if (error != null) return@Button
                    busy = true
                    scope.launch {
                        val url = photo?.let { p -> client.uploadPhoto(p.bytes, p.type).getOrElse { error = "The photo did not upload: ${it.message}"; busy = false; return@launch } }
                        client.post(
                            NewListing(type, species.trim(), where.trim(), opt(name), opt(color), opt(details), opt(tag), opt(phone), opt(email), url),
                            session,
                        ).onSuccess { posted = it; onPosted(it) }.onFailure { error = it.message }
                        busy = false
                    }
                },
            ) { Text(if (busy) "Posting…" else "Post") }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !busy) { Text("Cancel") } },
    )
}
