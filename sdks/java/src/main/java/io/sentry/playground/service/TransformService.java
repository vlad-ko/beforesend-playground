package io.sentry.playground.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import groovy.lang.Binding;
import groovy.lang.GroovyShell;
import io.sentry.SentryEvent;
import org.springframework.stereotype.Service;

import java.io.PrintWriter;
import java.io.StringWriter;

@Service
public class TransformService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public TransformResult transform(JsonNode eventJson, String beforeSendCode) {
        try {
            // Validate inputs
            if (eventJson == null || beforeSendCode == null || beforeSendCode.trim().isEmpty()) {
                return TransformResult.error("Missing event or beforeSendCode", null);
            }

            // Convert JsonNode to SentryEvent
            SentryEvent sentryEvent;
            try {
                sentryEvent = objectMapper.treeToValue(eventJson, SentryEvent.class);
            } catch (Exception e) {
                return TransformResult.error("Failed to parse event: " + e.getMessage(), null);
            }

            // Wrap user code to ensure return value
            // If user code doesn't contain return, automatically return event
            String wrappedCode = wrapUserCode(beforeSendCode);

            // Execute the transformation using Groovy
            try {
                Binding binding = new Binding();
                binding.setVariable("event", sentryEvent);

                GroovyShell shell = new GroovyShell(binding);
                Object result = shell.evaluate(wrappedCode);

                // Handle the result
                if (result == null) {
                    // User explicitly returned null to drop event
                    return TransformResult.success(null);
                }

                // Convert SentryEvent back to JsonNode
                JsonNode transformedJson = objectMapper.valueToTree(result);
                return TransformResult.success(transformedJson);

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

        // Check if user code contains explicit return statement
        boolean hasReturn = trimmedCode.contains("return");

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
}
