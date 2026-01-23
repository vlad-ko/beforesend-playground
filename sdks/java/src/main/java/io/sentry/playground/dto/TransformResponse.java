package io.sentry.playground.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;

@JsonInclude(JsonInclude.Include.ALWAYS)
public class TransformResponse {
    private boolean success;
    private JsonNode transformedEvent;
    private String error;
    private String traceback;

    public TransformResponse(boolean success, JsonNode transformedEvent, String error, String traceback) {
        this.success = success;
        this.transformedEvent = transformedEvent;
        this.error = error;
        this.traceback = traceback;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public JsonNode getTransformedEvent() {
        return transformedEvent;
    }

    public void setTransformedEvent(JsonNode transformedEvent) {
        this.transformedEvent = transformedEvent;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public String getTraceback() {
        return traceback;
    }

    public void setTraceback(String traceback) {
        this.traceback = traceback;
    }
}
