package com.nulljosh.homeward

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlin.random.Random

/** What a new post sends, the same fields the web form and the iOS app send to `create_listing`. */
@Serializable
data class NewListing(
    val type: String,
    val species: String,
    val last_seen_location: String,
    val pet_name: String? = null,
    val color: String? = null,
    val description: String? = null,
    val tag_number: String? = null,
    val contact_phone: String? = null,
    val contact_email: String? = null,
    val photo_url: String? = null,
)

@Serializable
private data class Uploaded(val url: String)

@Serializable
internal data class ApiError(val error: String? = null)

/**
 * The same backend as the web board and the iOS app: jaybulb-api (Cloudflare Workers + D1).
 * Reads are public. A post comes back with its edit token, the only key to it when you
 * are signed out, so the app shows the edit link once, like the web form does.
 */
class ListingsClient(private val http: HttpClient = defaultClient()) {

    companion object {
        const val API = "https://api.jaybulb.com"
        const val WEB = "https://sighting.jaybulb.com"
        internal val json = Json { ignoreUnknownKeys = true; isLenient = true; explicitNulls = false }

        fun defaultClient(): HttpClient = HttpClient {
            install(ContentNegotiation) { json(json) }
            install(HttpTimeout) {
                requestTimeoutMillis = 20_000
                connectTimeoutMillis = 10_000
            }
        }

        fun editLink(token: String) = "$WEB/listing/edit?token=$token"

        internal suspend fun failure(r: HttpResponse): Exception = Exception(
            runCatching { json.decodeFromString<ApiError>(r.bodyAsText()).error }.getOrNull() ?: "Something went wrong.",
        )
    }

    /** Active listings, newest first. Returns an empty list rather than throwing offline. */
    suspend fun active(): List<Listing> = try {
        http.get("$API/rest/listings") {
            url.parameters.append("select", "*")
            url.parameters.append("status", "eq.active")
            url.parameters.append("order", "created_at.desc")
            url.parameters.append("limit", "500")
        }.body()
    } catch (e: Exception) {
        emptyList()
    }

    /** Uploads a photo to the pet-photos bucket and returns its public URL. */
    suspend fun uploadPhoto(bytes: ByteArray, type: String = "image/jpeg"): Result<String> = runCatching {
        val ext = if (type == "image/png") "png" else "jpg"
        val name = (1..16).joinToString("") { Random.nextInt(16).toString(16) }
        val r = http.post("$API/storage/pet-photos/$name.$ext") { contentType(ContentType.parse(type)); setBody(bytes) }
        if (!r.status.isSuccess()) throw failure(r)
        json.decodeFromString<Uploaded>(r.bodyAsText()).url
    }

    /** Posts a listing. Signed in, it is tied to the account; the returned row carries the edit token either way. */
    suspend fun post(new: NewListing, session: Session? = null): Result<Listing> = runCatching {
        val r = http.post("$API/rpc/create_listing") {
            contentType(ContentType.Application.Json)
            session?.let { header("Authorization", "Bearer ${it.accessToken}") }
            setBody(json.encodeToString(NewListing.serializer(), new))
        }
        if (!r.status.isSuccess()) throw failure(r)
        json.decodeFromString<Listing>(r.bodyAsText())
    }
}
