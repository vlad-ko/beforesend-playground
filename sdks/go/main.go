package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

type TransformRequest struct {
	Event          map[string]interface{} `json:"event" binding:"required"`
	BeforeSendCode string                 `json:"beforeSendCode" binding:"required"`
}

type TransformResponse struct {
	Success          bool                   `json:"success"`
	TransformedEvent map[string]interface{} `json:"transformedEvent,omitempty"`
	Error            string                 `json:"error,omitempty"`
	Traceback        string                 `json:"traceback,omitempty"`
}

type HealthResponse struct {
	Status string `json:"status"`
	SDK    string `json:"sdk"`
}

func setupRouter() *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()

	router.POST("/transform", transformHandler)
	router.GET("/health", healthHandler)

	return router
}

func transformHandler(c *gin.Context) {
	var req TransformRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, TransformResponse{
			Success: false,
			Error:   "Missing event or beforeSendCode",
		})
		return
	}

	// Create temporary directory for the transform execution
	tmpDir, err := ioutil.TempDir("", "beforesend-*")
	if err != nil {
		c.JSON(http.StatusInternalServerError, TransformResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to create temp directory: %v", err),
		})
		return
	}
	defer os.RemoveAll(tmpDir)

	// Create the transform program
	programPath := filepath.Join(tmpDir, "transform.go")
	eventJSON, _ := json.Marshal(req.Event)

	program := fmt.Sprintf(`package main

import (
	"encoding/json"
	"fmt"
)

type Event map[string]interface{}
type EventHint map[string]interface{}

func main() {
	eventJSON := %s

	var event Event
	if err := json.Unmarshal([]byte(eventJSON), &event); err != nil {
		panic(err)
	}

	// User's beforeSend code
	transformedEvent := func(event Event, hint EventHint) Event {
		%s
	}(event, EventHint{})

	if transformedEvent == nil {
		fmt.Println("null")
		return
	}

	result, err := json.Marshal(transformedEvent)
	if err != nil {
		panic(err)
	}

	fmt.Println(string(result))
}
`, "`"+string(eventJSON)+"`", req.BeforeSendCode)

	// Write the program to file
	if err := ioutil.WriteFile(programPath, []byte(program), 0644); err != nil {
		c.JSON(http.StatusInternalServerError, TransformResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to write program: %v", err),
		})
		return
	}

	// Initialize go module in temp directory
	// Include sentry-go in case users want to use sentry types
	goModContent := `module transform
go 1.22
`
	goModPath := filepath.Join(tmpDir, "go.mod")
	if err := ioutil.WriteFile(goModPath, []byte(goModContent), 0644); err != nil {
		c.JSON(http.StatusInternalServerError, TransformResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to write go.mod: %v", err),
		})
		return
	}

	// Run go mod tidy to create go.sum
	tidyCmd := exec.Command("go", "mod", "tidy")
	tidyCmd.Dir = tmpDir
	var tidyErr bytes.Buffer
	tidyCmd.Stderr = &tidyErr
	if err := tidyCmd.Run(); err != nil {
		c.JSON(http.StatusBadRequest, TransformResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to resolve dependencies: %s", tidyErr.String()),
		})
		return
	}

	// Try to compile first to catch syntax errors
	compileCmd := exec.Command("go", "build", "-mod=readonly", "-o", "/dev/null", "transform.go")
	compileCmd.Dir = tmpDir
	var compileErr bytes.Buffer
	compileCmd.Stderr = &compileErr

	if err := compileCmd.Run(); err != nil {
		errorMsg := compileErr.String()
		c.JSON(http.StatusBadRequest, TransformResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to compile beforeSend code: %s", errorMsg),
		})
		return
	}

	// Execute the program
	runCmd := exec.Command("go", "run", "transform.go")
	runCmd.Dir = tmpDir
	var stdout, stderr bytes.Buffer
	runCmd.Stdout = &stdout
	runCmd.Stderr = &stderr

	if err := runCmd.Run(); err != nil {
		errorMsg := stderr.String()
		if errorMsg == "" {
			errorMsg = err.Error()
		}
		c.JSON(http.StatusInternalServerError, TransformResponse{
			Success:   false,
			Error:     "Transformation error: " + errorMsg,
			Traceback: errorMsg,
		})
		return
	}

	// Parse the result
	output := strings.TrimSpace(stdout.String())

	if output == "null" {
		c.JSON(http.StatusOK, TransformResponse{
			Success:          true,
			TransformedEvent: nil,
		})
		return
	}

	var transformedEvent map[string]interface{}
	if err := json.Unmarshal([]byte(output), &transformedEvent); err != nil {
		c.JSON(http.StatusInternalServerError, TransformResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to parse result: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, TransformResponse{
		Success:          true,
		TransformedEvent: transformedEvent,
	})
}

func healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, HealthResponse{
		Status: "healthy",
		SDK:    "go",
	})
}

func main() {
	router := setupRouter()
	router.Run(":5006")
}
