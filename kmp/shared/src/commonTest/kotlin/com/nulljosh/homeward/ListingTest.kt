package com.nulljosh.homeward

import kotlin.test.Test
import kotlin.test.assertEquals

private fun listing(id: String, type: String, name: String? = null, tag: String? = null, where: String = "") =
    Listing(id = id, createdAt = "", type = type, petName = name, species = "dog", tagNumber = tag, lastSeenLocation = where)

class ListingTest {
    private val all = listOf(
        listing("1", "lost", name = "Muffin", where = "Commercial Drive"),
        listing("2", "found", tag = "AB1234", where = "Trout Lake"),
        listing("3", "lost", name = "Biscuit", where = "Trout Lake"),
    )

    @Test fun filtersByKind() =
        assertEquals(listOf("1", "3"), all.search("", Kind.LOST).map { it.id })

    @Test fun searchesNameTagAndLocation() {
        assertEquals(listOf("1"), all.search("muffin").map { it.id })
        assertEquals(listOf("2"), all.search("ab1234").map { it.id })
        assertEquals(listOf("2", "3"), all.search("trout").map { it.id })
    }

    @Test fun kindAndQueryCombine() =
        assertEquals(listOf("3"), all.search("trout", Kind.LOST).map { it.id })

    @Test fun titleFallsBackToSpecies() =
        assertEquals("dog", all[1].title)
}
