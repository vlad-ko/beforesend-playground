package io.sentry.playground.dto

import com.fasterxml.jackson.databind.JsonNode

data class TransformResponse(
    val success: Boolean,
    val transformedEvent: JsonNode? = null,
    val error: String? = null,
    val traceback: String? = null
)
