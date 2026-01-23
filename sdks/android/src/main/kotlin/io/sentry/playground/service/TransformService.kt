package io.sentry.playground.service

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import groovy.lang.Binding
import groovy.lang.GroovyShell
import org.springframework.stereotype.Service
import java.io.PrintWriter
import java.io.StringWriter

@Service
class TransformService {

    private val objectMapper = ObjectMapper()

    fun transform(eventJson: JsonNode, beforeSendCode: String): TransformResult {
        try {
            // Validate inputs
            if (beforeSendCode.trim().isEmpty()) {
                return TransformResult.error("Missing event or beforeSendCode", null)
            }

            // Work with event as a Map (similar to Go/Java SDK approach)
            // This avoids Android-specific deserialization issues
            @Suppress("UNCHECKED_CAST")
            val eventMap = objectMapper.convertValue(eventJson, Map::class.java) as MutableMap<String, Any?>

            // Create a wrapper that provides SentryEvent-like methods
            val event = EventWrapper(eventMap)

            // Wrap user code to ensure return value
            val wrappedCode = wrapUserCode(beforeSendCode)

            // Execute the transformation using Kotlin script compilation
            try {
                val result = executeKotlinCode(event, wrappedCode)

                // Handle the result
                if (result == null) {
                    // User explicitly returned null to drop event
                    return TransformResult.success(null)
                }

                // Only accept EventWrapper as valid return type
                if (result is EventWrapper) {
                    val transformedJson = objectMapper.valueToTree<JsonNode>(result.eventMap)
                    return TransformResult.success(transformedJson)
                }

                // Invalid return type - user must return event or null
                return TransformResult.error(
                    "beforeSend must return the event object or null. Got: ${result::class.simpleName}",
                    null
                )

            } catch (e: Exception) {
                val sw = StringWriter()
                e.printStackTrace(PrintWriter(sw))
                return TransformResult.error("Transformation error: ${e.message}", sw.toString())
            }

        } catch (e: Exception) {
            val sw = StringWriter()
            e.printStackTrace(PrintWriter(sw))
            return TransformResult.error("Unexpected error: ${e.message}", sw.toString())
        }
    }

    private fun wrapUserCode(userCode: String): String {
        val trimmedCode = userCode.trim()

        // Check if user code contains explicit return statement
        val hasReturn = trimmedCode.contains("return")

        return if (hasReturn) {
            // User has explicit return, use code as-is
            trimmedCode
        } else {
            // No return statement, wrap to automatically return event
            "$trimmedCode\nevent"
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun executeKotlinCode(event: EventWrapper, code: String): EventWrapper? {
        // Use Groovy for reliable script execution (same as Java SDK)
        val binding = Binding()
        binding.setVariable("event", event)

        val shell = GroovyShell(binding)
        val result = shell.evaluate(code)

        return when {
            result == null -> null
            result is EventWrapper -> result
            else -> throw IllegalStateException("beforeSend must return the event object or null. Got: ${result::class.simpleName}")
        }
    }

    data class TransformResult(
        val success: Boolean,
        val transformedEvent: JsonNode?,
        val error: String?,
        val traceback: String?
    ) {
        companion object {
            fun success(transformedEvent: JsonNode?): TransformResult {
                return TransformResult(true, transformedEvent, null, null)
            }

            fun error(error: String, traceback: String?): TransformResult {
                return TransformResult(false, null, error, traceback)
            }
        }
    }

    /**
     * Wrapper class that provides SentryEvent-like methods while working with a Map.
     * This allows Kotlin scripts to call event.setTag(), event.setExtra(), etc.
     */
    class EventWrapper(val eventMap: MutableMap<String, Any?>) {

        fun setTag(key: String, value: String) {
            @Suppress("UNCHECKED_CAST")
            val tags = eventMap.computeIfAbsent("tags") { mutableMapOf<String, String>() } as MutableMap<String, String>
            tags[key] = value
        }

        fun setExtra(key: String, value: Any?) {
            @Suppress("UNCHECKED_CAST")
            val extras = eventMap.computeIfAbsent("extra") { mutableMapOf<String, Any?>() } as MutableMap<String, Any?>
            extras[key] = value
        }

        fun getEnvironment(): String? {
            return eventMap["environment"] as? String
        }

        fun setEnvironment(environment: String) {
            eventMap["environment"] = environment
        }

        /**
         * Set the exception type and value for the first exception in the event.
         * This is a convenience method for the common case of modifying the exception.
         *
         * @param type The exception type (e.g., "TransformerError")
         * @param value The exception message/value
         */
        fun setException(type: String, value: String) {
            @Suppress("UNCHECKED_CAST")
            val exception = eventMap.computeIfAbsent("exception") { mutableMapOf<String, Any?>() } as MutableMap<String, Any?>
            val values = exception.computeIfAbsent("values") { mutableListOf<MutableMap<String, Any?>>() } as MutableList<MutableMap<String, Any?>>

            if (values.isEmpty()) {
                values.add(mutableMapOf())
            }

            val firstException = values[0]
            firstException["type"] = type
            firstException["value"] = value
        }

        /**
         * Get the exception value from the first exception in the event.
         *
         * @return The exception value, or null if no exception exists
         */
        fun getExceptionValue(): String? {
            @Suppress("UNCHECKED_CAST")
            val exception = eventMap["exception"] as? Map<String, Any?> ?: return null
            val values = exception["values"] as? List<Map<String, Any?>> ?: return null
            if (values.isEmpty()) return null
            return values[0]["value"] as? String
        }

        /**
         * Get the exception type from the first exception in the event.
         *
         * @return The exception type, or null if no exception exists
         */
        fun getExceptionType(): String? {
            @Suppress("UNCHECKED_CAST")
            val exception = eventMap["exception"] as? Map<String, Any?> ?: return null
            val values = exception["values"] as? List<Map<String, Any?>> ?: return null
            if (values.isEmpty()) return null
            return values[0]["type"] as? String
        }

        // Allow accessing the map directly for advanced use cases
        operator fun get(key: String): Any? {
            return eventMap[key]
        }

        operator fun set(key: String, value: Any?) {
            eventMap[key] = value
        }
    }
}
