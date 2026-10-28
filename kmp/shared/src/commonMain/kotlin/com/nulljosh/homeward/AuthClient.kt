package com.nulljosh.homeward

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class Session(val accessToken: String, val email: String)

@Serializable
private data class AuthResponse(
    val access_token: String? = null,
    val user: AuthUser? = null,
)

@Serializable
private data class AuthUser(val email: String? = null)

@Serializable
private data class AuthError(val msg: String? = null, val error_description: String? = null)

/**
 * Email+password auth against the same Supabase project the board reads from, mirroring
 * `app/login` and `app/register` on the web. Session lives in memory only for now.
 * ponytail: add multiplatform-settings for persistence across restarts if that's wanted.
 */
class AuthClient(private val http: HttpClient = ListingsClient.defaultClient()) {

    suspend fun signIn(email: String, password: String): Result<Session> =
        request("token?grant_type=password", mapOf("email" to email, "password" to password))

    suspend fun signUp(email: String, password: String): Result<Session> =
        request("signup", mapOf("email" to email, "password" to password))

    private suspend fun request(path: String, body: Map<String, String>): Result<Session> = try {
        val response: AuthResponse = http.post("${ListingsClient.URL}/auth/v1/$path") {
            header("apikey", ListingsClient.ANON_KEY)
            contentType(ContentType.Application.Json)
            setBody(Json.encodeToString(body))
        }.body()
        val token = response.access_token
        val email = response.user?.email
        if (token != null && email != null) Result.success(Session(token, email))
        else Result.failure(Exception("Check your email to confirm your account, then log in."))
    } catch (e: ClientRequestException) {
        val message = runCatching {
            Json { ignoreUnknownKeys = true }.decodeFromString<AuthError>(e.response.bodyAsText())
        }.getOrNull()?.let { it.msg ?: it.error_description } ?: "Something went wrong."
        Result.failure(Exception(message))
    } catch (e: Exception) {
        Result.failure(Exception("Couldn't reach the server."))
    }
}
