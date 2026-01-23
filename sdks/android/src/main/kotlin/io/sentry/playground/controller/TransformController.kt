package io.sentry.playground.controller

import io.sentry.playground.dto.TransformRequest
import io.sentry.playground.dto.TransformResponse
import io.sentry.playground.service.TransformService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
class TransformController(private val transformService: TransformService) {

    @PostMapping("/transform")
    fun transform(@RequestBody request: TransformRequest): ResponseEntity<TransformResponse> {
        // Validate request
        if (request.beforeSendCode.trim().isEmpty()) {
            val response = TransformResponse(
                success = false,
                error = "Missing event or beforeSendCode",
                traceback = null
            )
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response)
        }

        // Transform the event
        val result = transformService.transform(
            request.event,
            request.beforeSendCode
        )

        // Build response
        val response = TransformResponse(
            success = result.success,
            transformedEvent = result.transformedEvent,
            error = result.error,
            traceback = result.traceback
        )

        // Return appropriate status code
        return when {
            result.success -> ResponseEntity.ok(response)
            result.traceback != null -> ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response)
            else -> ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response)
        }
    }

    @GetMapping("/health")
    fun health(): ResponseEntity<Map<String, String>> {
        return ResponseEntity.ok(
            mapOf(
                "status" to "healthy",
                "sdk" to "android"
            )
        )
    }
}
