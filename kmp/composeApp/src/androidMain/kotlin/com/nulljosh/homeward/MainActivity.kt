package com.nulljosh.homeward

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SightingTheme {
                BoardScreen(openWeb = {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(it)))
                })
            }
        }
    }
}
