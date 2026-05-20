package object_generation

import (
	"fmt"
	"math/rand"
	"sync"
	"time"
)

// ErthTaskResponse represents the response structure for Erth generation tasks
type ErthTaskResponse struct {
	Status            string                `json:"status"`
	Progress          int                   `json:"progress"`
	Stage             string                `json:"stage"`
	Message           string                `json:"message,omitempty"`
	IntermediateImage string                `json:"intermediateImage,omitempty"`
	Composition       *PrimitiveComposition `json:"composition,omitempty"`
	Error             string                `json:"error,omitempty"`
	ID                string                `json:"id"`
}

// PrimitiveComposition represents the final 3D composition
type PrimitiveComposition struct {
	Primitives []PrimitiveObject   `json:"primitives"`
	Metadata   CompositionMetadata `json:"metadata"`
}

// PrimitiveObject represents a single Three.js primitive in the composition
type PrimitiveObject struct {
	Type     string              `json:"type"` // "box"|"sphere"|"cylinder"|"cone"|"plane"
	Name     string              `json:"name"`
	Position [3]float64          `json:"position"` // [x, y, z] in meters
	Rotation [3]float64          `json:"rotation"` // [rx, ry, rz] in radians
	Scale    [3]float64          `json:"scale"`    // [sx, sy, sz] full dimensions
	Color    string              `json:"color"`    // "#RRGGBB"
	Material *MaterialProperties `json:"material,omitempty"`
}

// MaterialProperties represents optional material properties
type MaterialProperties struct {
	Roughness float64 `json:"roughness,omitempty"`
	Metalness float64 `json:"metalness,omitempty"`
}

// CompositionMetadata contains metadata about the composition
type CompositionMetadata struct {
	TotalPrimitives int         `json:"totalPrimitives"`
	BoundingBox     BoundingBox `json:"boundingBox"`
	GeneratedImage  string      `json:"generatedImage"`
}

// BoundingBox represents the overall dimensions of the composition
type BoundingBox struct {
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
	Depth  float64 `json:"depth"`
}

var (
	erthTaskStore = make(map[string]*ErthTaskResponse)
	erthTaskMutex sync.RWMutex
)

// generateErthTaskID creates a unique task ID
func generateErthTaskID() string {
	return fmt.Sprintf("erth_%d_%s", time.Now().Unix(), randomString(8))
}

// randomString generates a random alphanumeric string
func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

// storeErthTask stores a task in the task store
func storeErthTask(taskID string, task *ErthTaskResponse) {
	erthTaskMutex.Lock()
	defer erthTaskMutex.Unlock()
	erthTaskStore[taskID] = task
}

// getErthTask retrieves a task from the task store
func getErthTask(taskID string) (*ErthTaskResponse, bool) {
	erthTaskMutex.RLock()
	defer erthTaskMutex.RUnlock()
	task, exists := erthTaskStore[taskID]
	return task, exists
}

// updateErthTaskProgress updates the progress of a task
func updateErthTaskProgress(taskID string, progress int, stage, message string) {
	erthTaskMutex.Lock()
	defer erthTaskMutex.Unlock()
	if task, exists := erthTaskStore[taskID]; exists {
		task.Progress = progress
		task.Stage = stage
		task.Message = message
	}
}

// updateErthTaskComplete marks a task as complete
func updateErthTaskComplete(taskID string, composition *PrimitiveComposition) {
	erthTaskMutex.Lock()
	defer erthTaskMutex.Unlock()
	if task, exists := erthTaskStore[taskID]; exists {
		task.Status = "completed"
		task.Progress = 100
		task.Stage = "complete"
		task.Message = "Generation complete"
		task.Composition = composition
		// Copy image from composition metadata to task level, then clear from metadata
		// to avoid sending the same image data twice in the response
		if composition != nil {
			task.IntermediateImage = composition.Metadata.GeneratedImage
			composition.Metadata.GeneratedImage = "" // Clear to avoid duplication
		}
	}
}

// updateErthTaskError marks a task as failed
func updateErthTaskError(taskID, stage, errorMsg string) {
	erthTaskMutex.Lock()
	defer erthTaskMutex.Unlock()
	if task, exists := erthTaskStore[taskID]; exists {
		task.Status = "failed"
		task.Stage = stage
		task.Error = errorMsg
		task.Message = "Generation failed"
	}
}

// cleanupOldErthTasks removes tasks older than the specified duration
func cleanupOldErthTasks(maxAge time.Duration) {
	erthTaskMutex.Lock()
	defer erthTaskMutex.Unlock()

	cutoff := time.Now().Add(-maxAge).Unix()
	for taskID := range erthTaskStore {
		// Extract timestamp from taskID (format: erth_<unix>_<random>)
		var timestamp int64
		fmt.Sscanf(taskID, "erth_%d_", &timestamp)
		if timestamp < cutoff {
			delete(erthTaskStore, taskID)
		}
	}
}
