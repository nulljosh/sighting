package com.nulljosh.homeward

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts.PickVisualMedia
import kotlinx.coroutines.CompletableDeferred

class MainActivity : ComponentActivity() {
    private var pending: CompletableDeferred<Photo?>? = null
    private val picker = registerForActivityResult(PickVisualMedia()) { uri ->
        pending?.complete(uri?.let { u ->
            contentResolver.openInputStream(u)?.use { it.readBytes() }?.let { Photo(it, contentResolver.getType(u) ?: "image/jpeg") }
        })
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SightingTheme {
                BoardScreen(
                    openWeb = { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(it))) },
                    pickPhoto = {
                        CompletableDeferred<Photo?>().also { pending = it; picker.launch(PickVisualMediaRequest(PickVisualMedia.ImageOnly)) }.await()
                    },
                )
            }
        }
    }
}
