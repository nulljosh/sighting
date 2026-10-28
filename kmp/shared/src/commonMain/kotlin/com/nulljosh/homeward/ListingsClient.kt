package com.nulljosh.homeward

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

/**
 * Reads the same public `listings` table the web board reads, with the same anon key that
 * already ships in the web bundle -- nothing here is secret, and RLS is what protects
 * writes.
 *
 * ponytail: read-only. Posting needs a photo upload plus the edit-token round trip, so the
 * apps hand that off to the web form; add it here when someone actually posts from desktop.
 */
class ListingsClient(private val http: HttpClient = defaultClient()) {

    companion object {
        const val URL = "https://tjsxsqlxjmanwvmywwvw.supabase.co"
        const val ANON_KEY =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqc3hzcWx4am1hbnd2bXl3d3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTc0MDEsImV4cCI6MjA4NjA3MzQwMX0.LphLfho3wdQC20MhtcnBpzQUNuBoTOobrugQbNGxc68"
        const val WEB = "https://sighting.jaybulb.com"

        fun defaultClient(): HttpClient = HttpClient {
            install(ContentNegotiation) {
                json(Json { ignoreUnknownKeys = true; isLenient = true })
            }
            install(HttpTimeout) {
                requestTimeoutMillis = 10_000
                connectTimeoutMillis = 10_000
            }
        }
    }

    /** Active listings, newest first. Returns an empty list rather than throwing offline. */
    suspend fun active(): List<Listing> = try {
        http.get("$URL/rest/v1/listings") {
            header("apikey", ANON_KEY)
            header("Authorization", "Bearer $ANON_KEY")
            url.parameters.append("select", "*")
            url.parameters.append("status", "eq.active")
            url.parameters.append("order", "created_at.desc")
        }.body()
    } catch (e: Exception) {
        emptyList()
    }
}
