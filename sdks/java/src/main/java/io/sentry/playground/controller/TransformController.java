package io.sentry.playground.controller;

import io.sentry.playground.dto.TransformRequest;
import io.sentry.playground.dto.TransformResponse;
import io.sentry.playground.service.TransformService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class TransformController {

    @Autowired
    private TransformService transformService;

    @PostMapping("/transform")
    public ResponseEntity<TransformResponse> transform(@RequestBody TransformRequest request) {
        // Validate request
        if (request.getEvent() == null || request.getBeforeSendCode() == null ||
            request.getBeforeSendCode().trim().isEmpty()) {
            TransformResponse response = new TransformResponse(
                false,
                null,
                "Missing event or beforeSendCode",
                null
            );
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        // Transform the event
        TransformService.TransformResult result = transformService.transform(
            request.getEvent(),
            request.getBeforeSendCode()
        );

        // Build response
        TransformResponse response = new TransformResponse(
            result.isSuccess(),
            result.getTransformedEvent(),
            result.getError(),
            result.getTraceback()
        );

        // Return appropriate status code
        if (result.isSuccess()) {
            return ResponseEntity.ok(response);
        } else if (result.getTraceback() != null) {
            // Runtime error
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        } else {
            // Compilation error or validation error
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "healthy",
            "sdk", "java"
        ));
    }
}
