// Package helpers provides API clients for various AI services.
package helpers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/byok"
)

// Re-exported for backward compatibility
const MeshyAPIBaseURLExport = MeshyAPIBaseURL

// NewMeshyClientWithBaseURL creates a new client for Meshy API with a custom base URL using the env var.
func NewMeshyClientWithBaseURL(baseURL string) (*MeshyClient, error) {
	return NewMeshyClientWithBaseURLAndKey(baseURL, "")
}

// NewMeshyClientWithBaseURLAndKey creates a Meshy client with a custom base
// URL, honoring BYOK precedence (env > per-request byokKey > session store).
func NewMeshyClientWithBaseURLAndKey(baseURL, byokKey string) (*MeshyClient, error) {
	apiKey, _ := byok.LookupKey("meshy", []string{"MESHY_API_KEY"}, byokKey)
	if apiKey == "" {
		return nil, fmt.Errorf("Meshy API key not set")
	}
	return &MeshyClient{
		apiKey:  apiKey,
		baseURL: baseURL,
	}, nil
}

// MeshyMakeRequest sends an API request to Meshy
func MeshyMakeRequest(c *MeshyClient, method, endpoint string, payload interface{}) (*http.Response, error) {
	var body io.Reader

	if payload != nil {
		payloadBytes, err := json.Marshal(payload)
		if err != nil {
			return nil, fmt.Errorf("error encoding request payload: %w", err)
		}
		body = bytes.NewReader(payloadBytes)
	}

	url := fmt.Sprintf("%s%s", c.baseURL, endpoint)
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{}
	return client.Do(req)
}

// MeshyFetchTask fetches the status of a task from Meshy
func MeshyFetchTask(c *MeshyClient, taskId string) (*UnifiedTaskResponse, error) {
	resp, err := MeshyMakeRequest(c, "GET", fmt.Sprintf("/text-to-3d/%s", taskId), nil)
	if err != nil {
		return nil, fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch task status, status code: %d", resp.StatusCode)
	}

	var responseBody MeshyTaskResponse
	if err := json.NewDecoder(resp.Body).Decode(&responseBody); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &UnifiedTaskResponse{
		ID:        responseBody.ID,
		Status:    responseBody.Status,
		Thumbnail: responseBody.ThumbnailURL,
		Model:     responseBody.ModelURLs.GLB,
		Progress:  responseBody.Progress,
		Topology:  "",    // Meshy API does not provide topology data
		Riggable:  false, // Meshy API does not provide riggable data
		Error:     responseBody.TaskError.Message,
	}, nil
}

// MeshyWaitForTask polls for task completion
func MeshyWaitForTask(c *MeshyClient, taskId string, interval time.Duration, timeout time.Duration) (*UnifiedTaskResponse, error) {
	deadline := time.Now().Add(timeout)

	// Give Meshy a few seconds to register the task
	time.Sleep(5 * time.Second)

	for time.Now().Before(deadline) {
		taskStatus, err := MeshyFetchTask(c, taskId)
		if err != nil {
			log.Printf("⚠️ [Meshy] Error fetching task %s: %v", taskId, err)
			time.Sleep(interval)
			continue
		}

		statusLower := strings.ToLower(taskStatus.Status)
		elapsed := time.Since(deadline.Add(-timeout))
		log.Printf("⏱ [Meshy] Task %s status: %s (elapsed: %v)", taskId, taskStatus.Status, elapsed)

		if statusLower == "failed" || statusLower == "canceled" || statusLower == "cancelled" {
			if taskStatus.Error != "" {
				return nil, fmt.Errorf("task %s failed: %s", taskId, taskStatus.Error)
			}
			return nil, fmt.Errorf("task %s failed", taskId)
		}

		if statusLower == "completed" || statusLower == "success" || statusLower == "succeeded" {
			log.Printf("✅ [Meshy] Task %s completed successfully", taskId)
			return taskStatus, nil
		}

		time.Sleep(interval)
	}

	return nil, fmt.Errorf("timeout waiting for task %s completion", taskId)
}

// MeshyRigTaskResponse represents the response from Meshy rigging task status
type MeshyRigTaskResponse struct {
	ID       string `json:"id"`
	Status   string `json:"status"`
	Progress int    `json:"progress"`
	Result   struct {
		RiggedCharacterGLBURL string `json:"rigged_character_glb_url"`
		RiggedCharacterFBXURL string `json:"rigged_character_fbx_url"`
	} `json:"result"`
}

// MeshyFetchRigTask fetches the status of a rigging task from Meshy
func MeshyFetchRigTask(c *MeshyClient, taskId string) (*MeshyRigTaskResponse, error) {
	resp, err := MeshyMakeRequest(c, "GET", fmt.Sprintf("/rigging/%s", taskId), nil)
	if err != nil {
		return nil, fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch rigging task status, status code: %d", resp.StatusCode)
	}

	var responseBody MeshyRigTaskResponse
	if err := json.NewDecoder(resp.Body).Decode(&responseBody); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &responseBody, nil
}
