package object_generation

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
)

// GenerateResponse represents the response from the Tripo generate API
type GenerateResponse struct {
	Code int `json:"code"`
	Data struct {
		TaskID string `json:"task_id"`
	} `json:"data"`
}

// TaskData represents the data for a Tripo task
type TaskData struct {
	TaskID string `json:"task_id"`
	Type   string `json:"type"`
	Status string `json:"status"`
	Input  struct {
		Prompt string `json:"prompt"`
	} `json:"input"`
	Output struct {
		Model         string `json:"model,omitempty"`
		BaseModel     string `json:"base_model,omitempty"`
		PBRModel      string `json:"pbr_model,omitempty"`
		RenderedImage string `json:"rendered_image,omitempty"`
		Riggable      bool   `json:"riggable,omitempty"`
		Topology      string `json:"topology,omitempty"`
	} `json:"output"`
	Progress   int   `json:"progress"`
	CreateTime int64 `json:"create_time"`
}

// TaskResponse wraps the task data with the API response code
type TaskResponse struct {
	Code int      `json:"code"`
	Data TaskData `json:"data"`
}

// WaitForTaskCompletion polls for task completion
func WaitForTaskCompletion(taskID string, provider string) (*helpers.UnifiedTaskResponse, error) {
	switch provider {
	case "tripo":
		client, err := helpers.NewTripoClient()
		if err != nil {
			return nil, err
		}
		return client.WaitForTask(taskID, 5*time.Second, 10*time.Minute)
	case "meshy":
		client, err := helpers.NewMeshyClient()
		if err != nil {
			return nil, err
		}
		return client.WaitForTask(taskID, 5*time.Second, 10*time.Minute)
	default:
		return nil, fmt.Errorf("unknown provider: %s", provider)
	}
}

// GenerateTripoModel calls the Tripo API to generate a 3D model
func GenerateTripoModel(prompt string) (string, error) {
	client, err := helpers.NewTripoClient()
	if err != nil {
		return "", err
	}

	payload := map[string]interface{}{
		"prompt": prompt,
		"type":   "text-to-3d",
	}

	resp, err := client.MakeRequest("POST", "/text-to-3d/task", payload)
	if err != nil {
		return "", fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to generate model, status code: %d", resp.StatusCode)
	}

	var responseBody GenerateResponse
	if err := json.NewDecoder(resp.Body).Decode(&responseBody); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	return responseBody.Data.TaskID, nil
}

// GenerateMeshyModel calls the Meshy API to generate a 3D model
func GenerateMeshyModel(prompt string) (string, error) {
	client, err := helpers.NewMeshyClient()
	if err != nil {
		return "", err
	}

	payload := map[string]interface{}{
		"prompt": prompt,
	}

	resp, err := client.MakeRequest("POST", "/text-to-3d", payload)
	if err != nil {
		return "", fmt.Errorf("error sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to generate model, status code: %d", resp.StatusCode)
	}

	var responseBody struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&responseBody); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	return responseBody.ID, nil
}
