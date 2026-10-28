package com.nulljosh.homeward

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun SightingTheme(content: @Composable () -> Unit) =
    MaterialTheme(colorScheme = lightColorScheme(), content = content)

@Composable
fun BoardScreen(client: ListingsClient = ListingsClient(), openWeb: (String) -> Unit = {}) {
    var listings by remember { mutableStateOf<List<Listing>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var query by remember { mutableStateOf("") }
    var kind by remember { mutableStateOf(Kind.ALL) }
    var selected by remember { mutableStateOf<Listing?>(null) }
    var session by remember { mutableStateOf<Session?>(null) }

    LaunchedEffect(Unit) {
        listings = client.active()
        loading = false
    }

    val shown = listings.search(query, kind)

    Row(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Column(Modifier.weight(1f).padding(20.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Sighting", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold)
                AuthBar(session, onSession = { session = it })
            }
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                singleLine = true,
                label = { Text("Name, colour, tag number or where it was last seen") },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Kind.entries.forEach { k ->
                    FilterChip(
                        selected = kind == k,
                        onClick = { kind = k },
                        label = { Text(k.name.lowercase().replaceFirstChar { it.uppercase() }) },
                    )
                }
            }
            Spacer(Modifier.height(14.dp))
            when {
                loading -> Text("Loading the board…", color = MaterialTheme.colorScheme.outline)
                shown.isEmpty() -> Text(
                    if (listings.isEmpty()) "Nothing on the board, or you are offline."
                    else "No listings match that.",
                    color = MaterialTheme.colorScheme.outline,
                )
                else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(shown, key = { it.id }) { l ->
                        ListingRow(l, l.id == selected?.id) { selected = l }
                    }
                }
            }
        }
        // ponytail: the two-pane split is the whole "desktop app" story -- on a phone the
        // detail pane collapses to nothing and the row expands instead.
        selected?.let { l ->
            Column(
                Modifier.width(340.dp).fillMaxHeight()
                    .background(MaterialTheme.colorScheme.surfaceVariant).padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text(l.title, style = MaterialTheme.typography.titleLarge)
                Text("${l.type.replaceFirstChar { it.uppercase() }} · ${l.species}")
                l.color?.let { Text("Colour: $it") }
                l.tagNumber?.let { Text("Tag or chip: $it") }
                Text("Last seen: ${l.lastSeenLocation}")
                l.description?.let { Text(it) }
                l.contactPhone?.let { Text("Phone: $it") }
                l.contactEmail?.let { Text("Email: $it") }
                Spacer(Modifier.weight(1f))
                TextButton(onClick = { openWeb("${ListingsClient.WEB}/listing?id=${l.id}") }) {
                    Text("Open on the web")
                }
            }
        }
    }
}

@Composable
private fun ListingRow(l: Listing, isSelected: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
        tonalElevation = if (isSelected) 4.dp else 0.dp,
        border = ButtonDefaults.outlinedButtonBorder(true),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(l.title, fontWeight = FontWeight.Medium)
                Text(l.lastSeenLocation, style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline)
            }
            AssistChip(onClick = onClick, label = { Text(l.type) })
        }
    }
}
