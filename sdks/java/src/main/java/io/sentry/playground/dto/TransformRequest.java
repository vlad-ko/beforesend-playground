package io.sentry.playground.dto;

import com.fasterxml.jackson.databind.JsonNode;

public class TransformRequest {
    private JsonNode event;
    private String beforeSendCode;

    public JsonNode getEvent() {
        return event;
    }

    public void setEvent(JsonNode event) {
        this.event = event;
    }

    public String getBeforeSendCode() {
        return beforeSendCode;
    }

    public void setBeforeSendCode(String beforeSendCode) {
        this.beforeSendCode = beforeSendCode;
    }
}
