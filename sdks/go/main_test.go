package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// TestTransformWithValidBeforeSend tests transformation with valid beforeSend code
func TestTransformWithValidBeforeSend(t *testing.T) {
	router := setupRouter()

	event := map[string]interface{}{
		"exception": map[string]interface{}{
			"values": []map[string]interface{}{
				{
					"type":  "Error",
					"value": "Original error",
				},
			},
		},
	}

	beforeSendCode := `if exception, ok := event["exception"].(map[string]interface{}); ok {
		if values, ok := exception["values"].([]interface{}); ok && len(values) > 0 {
			if firstValue, ok := values[0].(map[string]interface{}); ok {
				firstValue["value"] = "Modified error"
			}
		}
	}
	return event`

	payload := map[string]interface{}{
		"event":          event,
		"beforeSendCode": beforeSendCode,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/transform", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["success"] != true {
		t.Errorf("Expected success=true, got %v", response["success"])
	}

	transformedEvent := response["transformedEvent"].(map[string]interface{})
	exception := transformedEvent["exception"].(map[string]interface{})
	values := exception["values"].([]interface{})
	firstValue := values[0].(map[string]interface{})

	if firstValue["value"] != "Modified error" {
		t.Errorf("Expected 'Modified error', got %v", firstValue["value"])
	}
}

// TestTransformReturnsNilDropsEvent tests that returning nil drops the event
func TestTransformReturnsNilDropsEvent(t *testing.T) {
	router := setupRouter()

	event := map[string]interface{}{
		"exception": map[string]interface{}{
			"values": []map[string]interface{}{
				{
					"type":  "Error",
					"value": "Test error",
				},
			},
		},
	}

	beforeSendCode := `return nil`

	payload := map[string]interface{}{
		"event":          event,
		"beforeSendCode": beforeSendCode,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/transform", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["success"] != true {
		t.Errorf("Expected success=true, got %v", response["success"])
	}

	if response["transformedEvent"] != nil {
		t.Errorf("Expected transformedEvent=nil, got %v", response["transformedEvent"])
	}
}

// TestMissingEventReturns400 tests that missing event returns 400
func TestMissingEventReturns400(t *testing.T) {
	router := setupRouter()

	payload := map[string]interface{}{
		"beforeSendCode": "return event",
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/transform", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", w.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["success"] != false {
		t.Errorf("Expected success=false, got %v", response["success"])
	}

	if response["error"] == nil {
		t.Error("Expected error message")
	}
}

// TestMissingBeforeSendCodeReturns400 tests that missing beforeSendCode returns 400
func TestMissingBeforeSendCodeReturns400(t *testing.T) {
	router := setupRouter()

	event := map[string]interface{}{
		"event_id": "test123",
	}

	payload := map[string]interface{}{
		"event": event,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/transform", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", w.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["success"] != false {
		t.Errorf("Expected success=false, got %v", response["success"])
	}
}

// TestInvalidGoSyntaxReturns400 tests that invalid Go syntax returns 400
func TestInvalidGoSyntaxReturns400(t *testing.T) {
	router := setupRouter()

	event := map[string]interface{}{
		"event_id": "test123",
	}

	beforeSendCode := `this is not valid go syntax {{{`

	payload := map[string]interface{}{
		"event":          event,
		"beforeSendCode": beforeSendCode,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/transform", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", w.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["success"] != false {
		t.Errorf("Expected success=false, got %v", response["success"])
	}
}

// TestRuntimeErrorReturns500 tests that runtime errors return 500
func TestRuntimeErrorReturns500(t *testing.T) {
	router := setupRouter()

	event := map[string]interface{}{
		"event_id": "test123",
	}

	beforeSendCode := `panic("Runtime error")`

	payload := map[string]interface{}{
		"event":          event,
		"beforeSendCode": beforeSendCode,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/transform", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("Expected status 500, got %d", w.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["success"] != false {
		t.Errorf("Expected success=false, got %v", response["success"])
	}
}

// TestPreserveEventStructure tests that event structure is preserved
func TestPreserveEventStructure(t *testing.T) {
	router := setupRouter()

	event := map[string]interface{}{
		"event_id": "test123",
		"timestamp": "2024-01-15T12:00:00",
		"platform": "go",
		"exception": map[string]interface{}{
			"values": []map[string]interface{}{
				{
					"type":  "Error",
					"value": "Test error",
				},
			},
		},
	}

	beforeSendCode := `return event`

	payload := map[string]interface{}{
		"event":          event,
		"beforeSendCode": beforeSendCode,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/transform", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	transformedEvent := response["transformedEvent"].(map[string]interface{})

	if transformedEvent["event_id"] != "test123" {
		t.Error("Event ID not preserved")
	}

	if transformedEvent["timestamp"] != "2024-01-15T12:00:00" {
		t.Error("Timestamp not preserved")
	}

	if transformedEvent["platform"] != "go" {
		t.Error("Platform not preserved")
	}
}

// TestAddCustomProperties tests adding custom properties to event
func TestAddCustomProperties(t *testing.T) {
	router := setupRouter()

	event := map[string]interface{}{
		"event_id": "test123",
	}

	beforeSendCode := `event["tags"] = map[string]string{"custom": "value"}
	event["user"] = map[string]interface{}{"id": "user123"}
	return event`

	payload := map[string]interface{}{
		"event":          event,
		"beforeSendCode": beforeSendCode,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/transform", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	transformedEvent := response["transformedEvent"].(map[string]interface{})

	if transformedEvent["tags"] == nil {
		t.Error("Tags not added")
	}

	if transformedEvent["user"] == nil {
		t.Error("User not added")
	}
}

// TestBackticksInEventData tests that events containing backticks are handled correctly
func TestBackticksInEventData(t *testing.T) {
	router := setupRouter()

	event := map[string]interface{}{
		"event_id": "test123",
		"exception": map[string]interface{}{
			"values": []map[string]interface{}{
				{
					"type":  "CommandError",
					"value": "Command failed: `npm install` returned error",
				},
			},
		},
		"extra": map[string]interface{}{
			"command": "Run `docker build` with backticks",
		},
	}

	beforeSendCode := `if exception, ok := event["exception"].(map[string]interface{}); ok {
		if values, ok := exception["values"].([]interface{}); ok && len(values) > 0 {
			if firstValue, ok := values[0].(map[string]interface{}); ok {
				firstValue["value"] = "Modified: " + firstValue["value"].(string)
			}
		}
	}
	return event`

	payload := map[string]interface{}{
		"event":          event,
		"beforeSendCode": beforeSendCode,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/transform", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d. Error: %s", w.Code, w.Body.String())
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["success"] != true {
		t.Errorf("Expected success=true, got %v. Error: %v", response["success"], response["error"])
	}

	transformedEvent := response["transformedEvent"].(map[string]interface{})
	exception := transformedEvent["exception"].(map[string]interface{})
	values := exception["values"].([]interface{})
	firstValue := values[0].(map[string]interface{})

	expectedValue := "Modified: Command failed: `npm install` returned error"
	if firstValue["value"] != expectedValue {
		t.Errorf("Expected value to contain backticks and be modified, got: %v", firstValue["value"])
	}

	// Verify extra field with backticks is preserved
	extra := transformedEvent["extra"].(map[string]interface{})
	if !strings.Contains(extra["command"].(string), "`docker build`") {
		t.Error("Backticks in extra field should be preserved")
	}
}

// TestComplexUnityMetadataCleanup tests complex metadata cleanup scenario
func TestComplexUnityMetadataCleanup(t *testing.T) {
	router := setupRouter()

	event := map[string]interface{}{
		"event_id": "test123",
		"contexts": map[string]interface{}{
			"unity": map[string]interface{}{
				"debug_info": "sensitive data",
				"internal_state": "internal",
			},
		},
		"extra": map[string]interface{}{
			"unity_metadata": "remove this",
		},
	}

	beforeSendCode := `if contexts, ok := event["contexts"].(map[string]interface{}); ok {
		if unity, ok := contexts["unity"].(map[string]interface{}); ok {
			delete(unity, "debug_info")
			delete(unity, "internal_state")
		}
	}
	if extra, ok := event["extra"].(map[string]interface{}); ok {
		delete(extra, "unity_metadata")
	}
	return event`

	payload := map[string]interface{}{
		"event":          event,
		"beforeSendCode": beforeSendCode,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/transform", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	transformedEvent := response["transformedEvent"].(map[string]interface{})
	contexts := transformedEvent["contexts"].(map[string]interface{})
	unity := contexts["unity"].(map[string]interface{})

	if _, exists := unity["debug_info"]; exists {
		t.Error("debug_info should be removed")
	}

	if _, exists := unity["internal_state"]; exists {
		t.Error("internal_state should be removed")
	}
}

// ============================================
// TracesSampler Tests - Return numbers instead of events
// ============================================

// TestTracesSamplerReturnsFloat tests that returning a float works for tracesSampler
func TestTracesSamplerReturnsFloat(t *testing.T) {
	router := setupRouter()

	// Sampling context (what tracesSampler receives)
	samplingContext := map[string]interface{}{
		"transactionContext": map[string]interface{}{
			"name": "GET /api/users",
			"op":   "http.server",
		},
		"parentSampled": true,
	}

	// Code that returns a sample rate (float)
	tracesSamplerCode := `return 0.5`

	payload := map[string]interface{}{
		"event":          samplingContext,
		"beforeSendCode": tracesSamplerCode,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/transform", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["success"] != true {
		t.Errorf("Expected success=true, got %v. Error: %v", response["success"], response["error"])
	}

	// The transformedEvent should be a number (0.5)
	transformedEvent := response["transformedEvent"]
	if transformedEvent == nil {
		t.Fatal("Expected transformedEvent to be a number, got nil")
	}

	// JSON unmarshals numbers as float64
	sampleRate, ok := transformedEvent.(float64)
	if !ok {
		t.Errorf("Expected transformedEvent to be a float64, got %T", transformedEvent)
	}

	if sampleRate != 0.5 {
		t.Errorf("Expected sample rate 0.5, got %v", sampleRate)
	}
}

// TestTracesSamplerReturns100Percent tests returning 1.0 for full sampling
func TestTracesSamplerReturns100Percent(t *testing.T) {
	router := setupRouter()

	samplingContext := map[string]interface{}{
		"transactionContext": map[string]interface{}{
			"name": "POST /api/checkout",
			"op":   "http.server",
		},
	}

	// Always sample critical endpoints
	tracesSamplerCode := `
	if ctx, ok := event["transactionContext"].(map[string]interface{}); ok {
		if name, ok := ctx["name"].(string); ok {
			if strings.Contains(name, "/checkout") {
				return 1.0
			}
		}
	}
	return 0.1`

	payload := map[string]interface{}{
		"event":          samplingContext,
		"beforeSendCode": tracesSamplerCode,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/transform", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["success"] != true {
		t.Errorf("Expected success=true, got %v", response["success"])
	}

	sampleRate, ok := response["transformedEvent"].(float64)
	if !ok {
		t.Errorf("Expected float64, got %T", response["transformedEvent"])
	}

	if sampleRate != 1.0 {
		t.Errorf("Expected sample rate 1.0, got %v", sampleRate)
	}
}

// TestTracesSamplerReturnsZero tests returning 0.0 to drop transaction
func TestTracesSamplerReturnsZero(t *testing.T) {
	router := setupRouter()

	samplingContext := map[string]interface{}{
		"transactionContext": map[string]interface{}{
			"name": "GET /health",
			"op":   "http.server",
		},
	}

	// Never sample health checks
	tracesSamplerCode := `
	if ctx, ok := event["transactionContext"].(map[string]interface{}); ok {
		if name, ok := ctx["name"].(string); ok {
			if name == "GET /health" {
				return 0.0
			}
		}
	}
	return 0.1`

	payload := map[string]interface{}{
		"event":          samplingContext,
		"beforeSendCode": tracesSamplerCode,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/transform", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	sampleRate, ok := response["transformedEvent"].(float64)
	if !ok {
		t.Errorf("Expected float64, got %T", response["transformedEvent"])
	}

	if sampleRate != 0.0 {
		t.Errorf("Expected sample rate 0.0, got %v", sampleRate)
	}
}

// TestTracesSamplerWithIntegerReturn tests that integer returns are converted to float
func TestTracesSamplerWithIntegerReturn(t *testing.T) {
	router := setupRouter()

	samplingContext := map[string]interface{}{
		"transactionContext": map[string]interface{}{
			"name": "GET /api/users",
		},
	}

	// Return integer 1 (should be treated as 1.0)
	tracesSamplerCode := `return 1`

	payload := map[string]interface{}{
		"event":          samplingContext,
		"beforeSendCode": tracesSamplerCode,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/transform", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	sampleRate, ok := response["transformedEvent"].(float64)
	if !ok {
		t.Errorf("Expected float64, got %T", response["transformedEvent"])
	}

	if sampleRate != 1.0 {
		t.Errorf("Expected sample rate 1.0, got %v", sampleRate)
	}
}

// TestHealthEndpoint tests the health check endpoint
func TestHealthEndpoint(t *testing.T) {
	router := setupRouter()

	req, _ := http.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["status"] != "healthy" {
		t.Errorf("Expected status=healthy, got %v", response["status"])
	}

	if response["sdk"] != "go" {
		t.Errorf("Expected sdk=go, got %v", response["sdk"])
	}
}
