package io.sentry.playground;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class TransformTests {

    @Autowired
    private TestRestTemplate restTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void transformWithValidBeforeSend() throws Exception {
        // Arrange
        Map<String, Object> request = new HashMap<>();

        Map<String, Object> event = new HashMap<>();
        event.put("event_id", "test123");
        event.put("message", "Original error");

        String beforeSendCode = """
            // Transform error message
            event.setTag("error_type", "modified");
            event.setExtra("modified_message", "Modified error");
            return event;
        """;

        request.put("event", event);
        request.put("beforeSendCode", beforeSendCode);

        // Act
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/transform",
            request,
            String.class
        );

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode result = objectMapper.readTree(response.getBody());
        assertTrue(result.get("success").asBoolean());
        assertNotNull(result.get("transformedEvent"));
        assertNull(result.get("error").asText(null));
    }

    @Test
    void transformReturnsNullDropsEvent() throws Exception {
        // Arrange
        Map<String, Object> request = new HashMap<>();
        Map<String, Object> event = new HashMap<>();
        event.put("event_id", "test123");

        request.put("event", event);
        request.put("beforeSendCode", "return null;");

        // Act
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/transform",
            request,
            String.class
        );

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode result = objectMapper.readTree(response.getBody());
        assertTrue(result.get("success").asBoolean());
        assertTrue(result.get("transformedEvent").isNull());
    }

    @Test
    void missingEventReturns400() throws Exception {
        // Arrange
        Map<String, Object> request = new HashMap<>();
        request.put("beforeSendCode", "return event;");

        // Act
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/transform",
            request,
            String.class
        );

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        JsonNode result = objectMapper.readTree(response.getBody());
        assertFalse(result.get("success").asBoolean());
        assertNotNull(result.get("error"));
    }

    @Test
    void missingBeforeSendCodeReturns400() throws Exception {
        // Arrange
        Map<String, Object> request = new HashMap<>();
        Map<String, Object> event = new HashMap<>();
        event.put("event_id", "test123");
        request.put("event", event);

        // Act
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/transform",
            request,
            String.class
        );

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        JsonNode result = objectMapper.readTree(response.getBody());
        assertFalse(result.get("success").asBoolean());
        assertNotNull(result.get("error"));
    }

    @Test
    void invalidJavaSyntaxReturns400() throws Exception {
        // Arrange
        Map<String, Object> request = new HashMap<>();
        Map<String, Object> event = new HashMap<>();
        event.put("event_id", "test123");

        request.put("event", event);
        request.put("beforeSendCode", "this is not valid Java syntax @#$");

        // Act
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/transform",
            request,
            String.class
        );

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        JsonNode result = objectMapper.readTree(response.getBody());
        assertFalse(result.get("success").asBoolean());
        assertNotNull(result.get("error"));
        assertTrue(result.get("error").asText().contains("Compilation") ||
                   result.get("error").asText().contains("syntax"));
    }

    @Test
    void runtimeErrorReturns500() throws Exception {
        // Arrange
        Map<String, Object> request = new HashMap<>();
        Map<String, Object> event = new HashMap<>();
        event.put("event_id", "test123");

        request.put("event", event);
        request.put("beforeSendCode", "throw new RuntimeException(\"Test error\");");

        // Act
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/transform",
            request,
            String.class
        );

        // Assert
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        JsonNode result = objectMapper.readTree(response.getBody());
        assertFalse(result.get("success").asBoolean());
        assertNotNull(result.get("error"));
        assertNotNull(result.get("traceback"));
    }

    @Test
    void preserveEventStructure() throws Exception {
        // Arrange
        Map<String, Object> request = new HashMap<>();

        Map<String, Object> event = new HashMap<>();
        event.put("event_id", "test123");
        event.put("message", "Test message");
        event.put("level", "error");

        request.put("event", event);
        request.put("beforeSendCode", "event.setTag(\"test\", \"value\"); return event;");

        // Act
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/transform",
            request,
            String.class
        );

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode result = objectMapper.readTree(response.getBody());
        assertTrue(result.get("success").asBoolean());

        JsonNode transformedEvent = result.get("transformedEvent");
        assertNotNull(transformedEvent);
        assertEquals("test123", transformedEvent.get("eventId").asText());
    }

    @Test
    void addCustomProperties() throws Exception {
        // Arrange
        Map<String, Object> request = new HashMap<>();
        Map<String, Object> event = new HashMap<>();
        event.put("event_id", "test123");

        request.put("event", event);
        request.put("beforeSendCode", """
            event.setTag("custom", "value");
            event.setTag("user_id", "user123");
            event.setExtra("user_info", "Additional user data");
            return event;
        """);

        // Act
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/transform",
            request,
            String.class
        );

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode result = objectMapper.readTree(response.getBody());
        assertTrue(result.get("success").asBoolean());
        assertNotNull(result.get("transformedEvent"));
    }

    @Test
    void complexTransformation() throws Exception {
        // Arrange
        Map<String, Object> request = new HashMap<>();

        Map<String, Object> event = new HashMap<>();
        event.put("event_id", "test123");
        event.put("environment", "production");

        Map<String, Object> contexts = new HashMap<>();
        contexts.put("device", Map.of("name", "iPhone 12"));
        event.put("contexts", contexts);

        request.put("event", event);
        request.put("beforeSendCode", """
            // Redact sensitive data
            if ("production".equals(event.getEnvironment())) {
                event.setTag("redacted", "true");
            }
            return event;
        """);

        // Act
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/transform",
            request,
            String.class
        );

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        JsonNode result = objectMapper.readTree(response.getBody());
        assertTrue(result.get("success").asBoolean());
        assertNotNull(result.get("transformedEvent"));
    }

    @Test
    void healthEndpoint() {
        // Act
        ResponseEntity<String> response = restTemplate.getForEntity(
            "/health",
            String.class
        );

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().contains("healthy"));
        assertTrue(response.getBody().contains("java"));
    }
}
