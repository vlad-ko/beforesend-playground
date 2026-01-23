package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
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
