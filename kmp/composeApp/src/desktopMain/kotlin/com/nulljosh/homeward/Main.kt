package com.nulljosh.homeward

import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import java.awt.Desktop
import java.awt.FileDialog
import java.awt.Frame
import java.io.File
import java.net.URI

fun main() = application {
    Window(
        onCloseRequest = ::exitApplication,
        title = "Sighting",
        state = rememberWindowState(width = 1040.dp, height = 720.dp),
    ) {
        SightingTheme {
            BoardScreen(
                openWeb = { url -> runCatching { Desktop.getDesktop().browse(URI(url)) } },
                pickPhoto = { pickPhoto(window) },
            )
        }
    }
}

/** The system file dialog, images only. Returns null when cancelled. */
private fun pickPhoto(owner: Frame): Photo? {
    val d = FileDialog(owner, "Choose a photo", FileDialog.LOAD)
    d.setFilenameFilter { _, n -> n.lowercase().run { endsWith(".jpg") || endsWith(".jpeg") || endsWith(".png") } }
    d.isVisible = true
    val f = File(d.directory ?: return null, d.file ?: return null)
    return Photo(f.readBytes(), if (f.extension.lowercase() == "png") "image/png" else "image/jpeg")
}
