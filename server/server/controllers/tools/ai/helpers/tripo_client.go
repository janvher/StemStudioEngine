// Package helpers provides API clients for various AI services.
package helpers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/byok"
)

// Re-exported for backward compatibility
const Tripo3dAPIBaseURLExport = Tripo3dAPIBaseURL

// NewTripoClientWithBaseURL creates a new client for Tripo3D API with a custom base URL using the env var.
func NewTripoClientWithBaseURL(baseURL string) (*TripoClient, error) {
	return NewTripoClientWithBaseURLAndKey(baseURL, "")
}

// NewTripoClientWithBaseURLAndKey creates a Tripo client with a custom base
// URL, honoring BYOK precedence (env > per-request byokKey > session store).
func NewTripoClientWithBaseURLAndKey(baseURL, byokKey string) (*TripoClient, error) {
	apiKey, _ := byok.LookupKey("tripo", []string{"TRIPO_API_KEY"}, byokKey)
	if apiKey == "" {
		return nil, fmt.Errorf("Tripo API key not set")
	}
	return &TripoClient{
		apiKey:  apiKey,
		baseURL: baseURL,
	}, nil
}

// TripoMakeRequest sends an API request to Tripo
func TripoMakeRequest(c *TripoClient, method, endpoint string, payload interface{}) (*http.Response, error) {
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

// TripoFetchTask fetches the status of a task from Tripo
func TripoFetchTask(c *TripoClient, taskId string) (*UnifiedTaskResponse, error) {
	resp, err := TripoMakeRequest(c, "GET", fmt.Sprintf("/task/%s", taskId), nil)
	if err != nil {
		return nil, fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch task status, status code: %d", resp.StatusCode)
	}

	var responseBody TripoTaskResponse
	if err := json.NewDecoder(resp.Body).Decode(&responseBody); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	data := responseBody.Data
	return &UnifiedTaskResponse{
		ID:        data.TaskID,
		Status:    data.Status,
		Thumbnail: data.Output.RenderedImage,
		Model:     data.Output.PBRModel,
		Progress:  data.Progress,
		Topology:  data.Output.Topology,
		Riggable:  data.Output.Riggable,
	}, nil
}

// TripoWaitForTask polls for task completion
func TripoWaitForTask(c *TripoClient, taskId string, interval time.Duration, timeout time.Duration) (*UnifiedTaskResponse, error) {
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		taskStatus, err := TripoFetchTask(c, taskId)
		if err != nil {
			return nil, err
		}

		if taskStatus.Status == "failed" {
			return nil, fmt.Errorf("task failed")
		}

		if taskStatus.Status == "completed" {
			return taskStatus, nil
		}

		time.Sleep(interval)
	}

	return nil, fmt.Errorf("timeout waiting for task completion")
}
