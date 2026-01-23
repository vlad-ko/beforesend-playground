package io.sentry.playground.dto

import com.fasterxml.jackson.databind.JsonNode

data class TransformRequest(
    val event: JsonNode,
    val beforeSendCode: String
)
