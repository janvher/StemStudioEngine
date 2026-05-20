package object_generation

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/userlimits"
)

type ErthGenerateRequest struct {
	Prompt              string `json:"prompt"`
	Style               string `json:"style,omitempty"`
	MaxPrimitives       int    `json:"maxPrimitives,omitempty"`
	SimplificationLevel string `json:"simplificationLevel,omitempty"`
}

func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/ObjectGeneration/Erth/Generate", handleErthGenerate, constants.User)
}

func handleErthGenerate(w http.ResponseWriter, r *http.Request) {
	// 1. Check quota
	if err := userlimits.Require3D(r); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	// 2. Parse request
	var req ErthGenerateRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 3. Validate
	if req.Prompt == "" {
		http.Error(w, "Prompt is required", http.StatusBadRequest)
		return
	}

	// Set defaults - no limit on primitives to allow detailed replicas
	if req.Style == "" {
		req.Style = "low-poly"
	}

	// 4. Create task
	taskID := generateErthTaskID()
	task := &ErthTaskResponse{
		Status:   "processing",
		Progress: 0,
		Stage:    "initializing",
		Message:  "Starting generation...",
		ID:       taskID,
	}
	storeErthTask(taskID, task)

	// 5. Launch async pipeline with background context (not request context)
	// Request context gets canceled when handler returns, so use background with timeout
	pipelineCtx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	go func() {
		defer cancel()
		runErthPipeline(pipelineCtx, taskID, req, r)
	}()

	// 6. Return immediately
	response := struct {
		TaskID string `json:"task_id"`
	}{
		TaskID: taskID,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
