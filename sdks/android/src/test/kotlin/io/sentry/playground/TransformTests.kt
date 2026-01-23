package io.sentry.playground

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.test.context.junit.jupiter.SpringExtension
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

@ExtendWith(SpringExtension::class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class TransformTests {

    @Autowired
    private lateinit var restTemplate: TestRestTemplate

    private val objectMapper = ObjectMapper()

    @Test
    fun `transform with valid beforeSend should succeed`() {
        // Arrange
        val request = mapOf(
            "event" to mapOf(
                "event_id" to "test123",
                "message" to "Test error"
            ),
            "beforeSendCode" to """
                event.setTag("error_type", "modified")
                event.setExtra("modified_message", "Modified error")
                return event
            """.trimIndent()
        )

        // Act
        val response: ResponseEntity<String> = restTemplate.postForEntity(
            "/transform",
            request,
            String::class.java
        )

        // Assert
        assertEquals(HttpStatus.OK, response.statusCode)
        val result = objectMapper.readTree(response.body)
        assertTrue(result["success"].asBoolean())
        assertNotNull(result["transformedEvent"])
        assertEquals("test123", result["transformedEvent"]["event_id"].asText())
        assertEquals("modified", result["transformedEvent"]["tags"]["error_type"].asText())
        assertEquals("Modified error", result["transformedEvent"]["extra"]["modified_message"].asText())
    }

    @Test
    fun `transform returning null should drop event`() {
        // Arrange
        val request = mapOf(
            "event" to mapOf("event_id" to "test123"),
            "beforeSendCode" to "return null"
        )

        // Act
        val response: ResponseEntity<String> = restTemplate.postForEntity(
            "/transform",
            request,
            String::class.java
        )

        // Assert
        assertEquals(HttpStatus.OK, response.statusCode)
        val result = objectMapper.readTree(response.body)
        assertTrue(result["success"].asBoolean())
        assertTrue(result["transformedEvent"].isNull)
    }

    @Test
    fun `transform with no explicit return should return event`() {
        // Arrange
        val request = mapOf(
            "event" to mapOf("event_id" to "test123"),
            "beforeSendCode" to "event.setTag(\"added\", \"true\")"
        )

        // Act
        val response: ResponseEntity<String> = restTemplate.postForEntity(
            "/transform",
            request,
            String::class.java
        )

        // Assert
        assertEquals(HttpStatus.OK, response.statusCode)
        val result = objectMapper.readTree(response.body)
        assertTrue(result["success"].asBoolean())
        assertNotNull(result["transformedEvent"])
        assertEquals("test123", result["transformedEvent"]["event_id"].asText())
    }

    @Test
    fun `transform with syntax error should return compilation error`() {
        // Arrange
        val request = mapOf(
            "event" to mapOf("event_id" to "test123"),
            "beforeSendCode" to "this is invalid kotlin syntax {{"
        )

        // Act
        val response: ResponseEntity<String> = restTemplate.postForEntity(
            "/transform",
            request,
            String::class.java
        )

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
        val result = objectMapper.readTree(response.body)
        assertFalse(result["success"].asBoolean())
        assertTrue(result["error"].asText().contains("Compilation failed", ignoreCase = true))
    }

    @Test
    fun `transform with runtime error should return error`() {
        // Arrange
        val request = mapOf(
            "event" to mapOf("event_id" to "test123"),
            "beforeSendCode" to """
                throw RuntimeException("Test error")
            """.trimIndent()
        )

        // Act
        val response: ResponseEntity<String> = restTemplate.postForEntity(
            "/transform",
            request,
            String::class.java
        )

        // Assert
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.statusCode)
        val result = objectMapper.readTree(response.body)
        assertFalse(result["success"].asBoolean())
        assertTrue(result["error"].asText().contains("Test error"))
        assertNotNull(result["traceback"])
    }

    @Test
    fun `transform with missing event should return validation error`() {
        // Arrange - no event provided
        val request = mapOf(
            "beforeSendCode" to "return event"
        )

        // Act
        val response: ResponseEntity<String> = restTemplate.postForEntity(
            "/transform",
            request,
            String::class.java
        )

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
        val result = objectMapper.readTree(response.body)
        assertFalse(result["success"].asBoolean())
        assertTrue(result["error"].asText().contains("Missing event"))
    }

    @Test
    fun `transform with empty beforeSendCode should return validation error`() {
        // Arrange
        val request = mapOf(
            "event" to mapOf("event_id" to "test123"),
            "beforeSendCode" to "   "
        )

        // Act
        val response: ResponseEntity<String> = restTemplate.postForEntity(
            "/transform",
            request,
            String::class.java
        )

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
        val result = objectMapper.readTree(response.body)
        assertFalse(result["success"].asBoolean())
        assertTrue(result["error"].asText().contains("beforeSendCode"))
    }

    @Test
    fun `transform with setException should modify exception`() {
        // Arrange
        val request = mapOf(
            "event" to mapOf(
                "event_id" to "test123",
                "exception" to mapOf(
                    "values" to listOf(
                        mapOf(
                            "type" to "Error",
                            "value" to "Original error"
                        )
                    )
                )
            ),
            "beforeSendCode" to """
                event.setException("TransformerError", "Transformers by Sentry 🤖")
                return event
            """.trimIndent()
        )

        // Act
        val response: ResponseEntity<String> = restTemplate.postForEntity(
            "/transform",
            request,
            String::class.java
        )

        // Assert
        assertEquals(HttpStatus.OK, response.statusCode)
        val result = objectMapper.readTree(response.body)
        assertTrue(result["success"].asBoolean())
        val transformedEvent = result["transformedEvent"]
        assertEquals("TransformerError", transformedEvent["exception"]["values"][0]["type"].asText())
        assertEquals("Transformers by Sentry 🤖", transformedEvent["exception"]["values"][0]["value"].asText())
    }

    @Test
    fun `transform with Android-specific Activity context should work`() {
        // Arrange - simulating Android Activity context
        val request = mapOf(
            "event" to mapOf(
                "event_id" to "test123",
                "contexts" to mapOf(
                    "app" to mapOf(
                        "in_foreground" to true
                    )
                ),
                "tags" to mapOf(
                    "activity" to "MainActivity"
                )
            ),
            "beforeSendCode" to """
                val activity = event.get("tags").get("activity")
                event.setExtra("transformed_activity", activity.toString())
                event.setTag("platform", "android")
                return event
            """.trimIndent()
        )

        // Act
        val response: ResponseEntity<String> = restTemplate.postForEntity(
            "/transform",
            request,
            String::class.java
        )

        // Assert
        assertEquals(HttpStatus.OK, response.statusCode)
        val result = objectMapper.readTree(response.body)
        assertTrue(result["success"].asBoolean())
        assertEquals("android", result["transformedEvent"]["tags"]["platform"].asText())
    }

    @Test
    fun `transform with invalid return type should return error`() {
        // Arrange - beforeSend returns a string instead of event
        val request = mapOf(
            "event" to mapOf("event_id" to "test123"),
            "beforeSendCode" to "return \"hello world\""
        )

        // Act
        val response: ResponseEntity<String> = restTemplate.postForEntity(
            "/transform",
            request,
            String::class.java
        )

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
        val result = objectMapper.readTree(response.body)
        assertFalse(result["success"].asBoolean())
        assertTrue(result["error"].asText().contains("must return the event object or null"))
        assertTrue(result["error"].asText().contains("String"))
    }

    @Test
    fun `health endpoint should return healthy status`() {
        // Act
        val response: ResponseEntity<String> = restTemplate.getForEntity(
            "/health",
            String::class.java
        )

        // Assert
        assertEquals(HttpStatus.OK, response.statusCode)
        assertTrue(response.body!!.contains("healthy"))
        assertTrue(response.body!!.contains("android"))
    }

    @Test
    fun `transform with return in comment should not prevent auto-return`() {
        // Arrange - "return" in comment should not be detected as a return statement
        val request = mapOf(
            "event" to mapOf("event_id" to "test-comment"),
            "beforeSendCode" to """
                // This will return the event with tags
                event.setTag("test", "value")
            """.trimIndent()
        )

        // Act
        val response: ResponseEntity<String> = restTemplate.postForEntity(
            "/transform",
            request,
            String::class.java
        )

        // Assert
        assertEquals(HttpStatus.OK, response.statusCode)
        val result = objectMapper.readTree(response.body)
        assertTrue(result["success"].asBoolean())
        assertNotNull(result["transformedEvent"])
        assertEquals("value", result["transformedEvent"]["tags"]["test"].asText())
    }

    @Test
    fun `transform with return in variable name should not prevent auto-return`() {
        // Arrange - "return" in variable name should not be detected as a return statement
        val request = mapOf(
            "event" to mapOf("event_id" to "test-varname"),
            "beforeSendCode" to """
                val returnValue = "test"
                event.setTag("result", returnValue)
            """.trimIndent()
        )

        // Act
        val response: ResponseEntity<String> = restTemplate.postForEntity(
            "/transform",
            request,
            String::class.java
        )

        // Assert
        assertEquals(HttpStatus.OK, response.statusCode)
        val result = objectMapper.readTree(response.body)
        assertTrue(result["success"].asBoolean())
        assertNotNull(result["transformedEvent"])
        assertEquals("test", result["transformedEvent"]["tags"]["result"].asText())
    }

    @Test
    fun `transform with actual return statement should work`() {
        // Arrange - Actual return statement with variable containing "return" in name
        val request = mapOf(
            "event" to mapOf("event_id" to "test-actual-return"),
            "beforeSendCode" to """
                val returnCode = 200
                event.setTag("code", returnCode.toString())
                return event
            """.trimIndent()
        )

        // Act
        val response: ResponseEntity<String> = restTemplate.postForEntity(
            "/transform",
            request,
            String::class.java
        )

        // Assert
        assertEquals(HttpStatus.OK, response.statusCode)
        val result = objectMapper.readTree(response.body)
        assertTrue(result["success"].asBoolean())
        assertNotNull(result["transformedEvent"])
        assertEquals("200", result["transformedEvent"]["tags"]["code"].asText())
    }
}
