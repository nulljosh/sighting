package com.nulljosh.homeward

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Listing(
    val id: String,
    @SerialName("created_at") val createdAt: String,
    val type: String,
    @SerialName("pet_name") val petName: String? = null,
    val species: String = "",
    val color: String? = null,
    val description: String? = null,
    @SerialName("tag_number") val tagNumber: String? = null,
    @SerialName("last_seen_location") val lastSeenLocation: String = "",
    @SerialName("photo_url") val photoUrl: String? = null,
    @SerialName("contact_phone") val contactPhone: String? = null,
    @SerialName("contact_email") val contactEmail: String? = null,
    val status: String = "active",
) {
    val title: String get() = petName?.takeIf { it.isNotBlank() } ?: species.ifBlank { "Pet" }
}

enum class Kind { ALL, LOST, FOUND }

/**
 * Client-side filter, matching the web board's fields: name, species, colour, tag/chip
 * number and last-seen location. Kept here rather than in the UI so both the desktop and
 * Android apps share one behaviour, and so it can be tested without a network.
 */
fun List<Listing>.search(query: String, kind: Kind = Kind.ALL): List<Listing> {
    val q = query.trim().lowercase()
    return filter { l ->
        (kind == Kind.ALL || l.type.equals(kind.name, ignoreCase = true)) &&
            (q.isEmpty() || listOfNotNull(
                l.petName, l.species, l.color, l.tagNumber, l.lastSeenLocation, l.description,
            ).any { it.lowercase().contains(q) })
    }
}
