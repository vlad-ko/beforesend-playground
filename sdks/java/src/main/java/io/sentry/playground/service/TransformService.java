package io.sentry.playground.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import groovy.lang.Binding;
import groovy.lang.GroovyShell;
import io.sentry.SentryEvent;
import org.springframework.stereotype.Service;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Map;

@Service
public class TransformService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public TransformResult transform(JsonNode eventJson, String beforeSendCode) {
        try {
            // Validate inputs
            if (eventJson == null || beforeSendCode == null || beforeSendCode.trim().isEmpty()) {
                return TransformResult.error("Missing event or beforeSendCode", null);
            }

            // Work with event as a Map (similar to Go SDK approach)
            // This avoids Java deserialization issues with property naming
            @SuppressWarnings("unchecked")
            Map<String, Object> eventMap = objectMapper.convertValue(eventJson, Map.class);

            // Create a wrapper that provides SentryEvent-like methods
            EventWrapper event = new EventWrapper(eventMap);

            // Wrap user code to ensure return value
            // If user code doesn't contain return, automatically return event
            String wrappedCode = wrapUserCode(beforeSendCode);

            // Execute the transformation using Groovy
            try {
                Binding binding = new Binding();
                binding.setVariable("event", event);

                GroovyShell shell = new GroovyShell(binding);
                Object result = shell.evaluate(wrappedCode);

                // Handle the result
                if (result == null) {
                    // User explicitly returned null to drop event
                    return TransformResult.success(null);
                }

                // Only accept EventWrapper as valid return type
                if (result instanceof EventWrapper) {
                    JsonNode transformedJson = objectMapper.valueToTree(((EventWrapper) result).getEventMap());
                    return TransformResult.success(transformedJson);
                }

                // Invalid return type - user must return event or null
                return TransformResult.error(
                    "beforeSend must return the event object or null. Got: " + result.getClass().getSimpleName(),
                    null
                );

            } catch (org.codehaus.groovy.control.CompilationFailedException e) {
                return TransformResult.error("Compilation failed for beforeSend code: " + e.getMessage(), null);
            } catch (Exception e) {
                StringWriter sw = new StringWriter();
                e.printStackTrace(new PrintWriter(sw));
                return TransformResult.error("Transformation error: " + e.getMessage(), sw.toString());
            }

        } catch (Exception e) {
            StringWriter sw = new StringWriter();
            e.printStackTrace(new PrintWriter(sw));
            return TransformResult.error("Unexpected error: " + e.getMessage(), sw.toString());
        }
    }

    private String wrapUserCode(String userCode) {
        String trimmedCode = userCode.trim();

        // Check for return as a standalone keyword using word boundaries
        // This prevents false positives from "return" in comments, strings, or variable names
        boolean hasReturn = trimmedCode.matches(".*\\breturn\\b.*");

        if (hasReturn) {
            // User has explicit return, use code as-is
            return trimmedCode;
        } else {
            // No return statement, wrap to automatically return event
            return trimmedCode + "\nreturn event;";
        }
    }

    public static class TransformResult {
        private final boolean success;
        private final JsonNode transformedEvent;
        private final String error;
        private final String traceback;

        private TransformResult(boolean success, JsonNode transformedEvent, String error, String traceback) {
            this.success = success;
            this.transformedEvent = transformedEvent;
            this.error = error;
            this.traceback = traceback;
        }

        public static TransformResult success(JsonNode transformedEvent) {
            return new TransformResult(true, transformedEvent, null, null);
        }

        public static TransformResult error(String error, String traceback) {
            return new TransformResult(false, null, error, traceback);
        }

        public boolean isSuccess() {
            return success;
        }

        public JsonNode getTransformedEvent() {
            return transformedEvent;
        }

        public String getError() {
            return error;
        }

        public String getTraceback() {
            return traceback;
        }
    }

    /**
     * Wrapper class that provides SentryEvent-like methods while working with a Map.
     * This allows Groovy scripts to call event.setTag(), event.setExtra(), etc.
     */
    public static class EventWrapper {
        private final Map<String, Object> eventMap;

        public EventWrapper(Map<String, Object> eventMap) {
            this.eventMap = eventMap;
        }

        public Map<String, Object> getEventMap() {
            return eventMap;
        }

        @SuppressWarnings("unchecked")
        public void setTag(String key, String value) {
            Map<String, String> tags = (Map<String, String>) eventMap.computeIfAbsent("tags", k -> new java.util.HashMap<>());
            tags.put(key, value);
        }

        @SuppressWarnings("unchecked")
        public void setExtra(String key, Object value) {
            Map<String, Object> extras = (Map<String, Object>) eventMap.computeIfAbsent("extra", k -> new java.util.HashMap<>());
            extras.put(key, value);
        }

        public String getEnvironment() {
            return (String) eventMap.get("environment");
        }

        public void setEnvironment(String environment) {
            eventMap.put("environment", environment);
        }

        /**
         * Set the exception type and value for the first exception in the event.
         * This is a convenience method for the common case of modifying the exception.
         *
         * @param type The exception type (e.g., "TransformerError")
         * @param value The exception message/value
         */
        @SuppressWarnings("unchecked")
        public void setException(String type, String value) {
            Map<String, Object> exception = (Map<String, Object>) eventMap.computeIfAbsent("exception", k -> new java.util.HashMap<>());
            java.util.List<Map<String, Object>> values = (java.util.List<Map<String, Object>>) exception.computeIfAbsent("values", k -> new java.util.ArrayList<>());

            if (values.isEmpty()) {
                values.add(new java.util.HashMap<>());
            }

            Map<String, Object> firstException = values.get(0);
            firstException.put("type", type);
            firstException.put("value", value);
        }

        /**
         * Get the exception value from the first exception in the event.
         *
         * @return The exception value, or null if no exception exists
         */
        @SuppressWarnings("unchecked")
        public String getExceptionValue() {
            Map<String, Object> exception = (Map<String, Object>) eventMap.get("exception");
            if (exception == null) return null;

            java.util.List<Map<String, Object>> values = (java.util.List<Map<String, Object>>) exception.get("values");
            if (values == null || values.isEmpty()) return null;

            return (String) values.get(0).get("value");
        }

        /**
         * Get the exception type from the first exception in the event.
         *
         * @return The exception type, or null if no exception exists
         */
        @SuppressWarnings("unchecked")
        public String getExceptionType() {
            Map<String, Object> exception = (Map<String, Object>) eventMap.get("exception");
            if (exception == null) return null;

            java.util.List<Map<String, Object>> values = (java.util.List<Map<String, Object>>) exception.get("values");
            if (values == null || values.isEmpty()) return null;

            return (String) values.get(0).get("type");
        }

        // Allow accessing the map directly for advanced use cases
        public Object get(String key) {
            return eventMap.get(key);
        }

        public void put(String key, Object value) {
            eventMap.put(key, value);
        }
    }
}
