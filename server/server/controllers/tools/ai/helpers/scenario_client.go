// Package helpers provides API clients for various AI services.
package helpers

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// Re-exported for backward compatibility
const ScenarioAPIBaseURLExport = ScenarioAPIBaseURL

// NewScenarioClientWithBaseURL creates a new client for Scenario API with a custom base URL
func NewScenarioClientWithBaseURL(baseURL string) (*ScenarioClient, error) {
	apiKey := os.Getenv("SCENARIO_API_KEY")
	apiSecret := os.Getenv("SCENARIO_API_SECRET")

	if apiKey == "" || apiSecret == "" {
		return nil, fmt.Errorf("Scenario API credentials not set")
	}

	return &ScenarioClient{
		apiKey:    apiKey,
		apiSecret: apiSecret,
		baseURL:   baseURL,
	}, nil
}

// ScenarioGetBaseURL returns the base URL for Scenario API
func ScenarioGetBaseURL(c *ScenarioClient) string {
	return c.baseURL
}

// ScenarioGetAuthHeader returns the auth header for Scenario API
func ScenarioGetAuthHeader(c *ScenarioClient) string {
	return "Basic " + base64.StdEncoding.EncodeToString([]byte(c.apiKey+":"+c.apiSecret))
}

// ScenarioMakeRequest sends an API request to Scenario
func ScenarioMakeRequest(c *ScenarioClient, method, endpoint string, payload interface{}) (*http.Response, error) {
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

	req.Header.Set("Authorization", ScenarioGetAuthHeader(c))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{}
	return client.Do(req)
}

// ScenarioFetchJob fetches the status of a job from Scenario
func ScenarioFetchJob(c *ScenarioClient, jobId string) (*ScenarioJobResponse, error) {
	resp, err := ScenarioMakeRequest(c, "GET", fmt.Sprintf("/jobs/%s", jobId), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch job status: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch job status, status code: %d", resp.StatusCode)
	}

	var responseBody struct {
		Job struct {
			Status   string `json:"status"`
			Metadata struct {
				AssetIds []string `json:"assetIds"`
			} `json:"metadata"`
		} `json:"job"`
	}

	err = json.NewDecoder(resp.Body).Decode(&responseBody)
	if err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &ScenarioJobResponse{
		Status:   responseBody.Job.Status,
		AssetIds: responseBody.Job.Metadata.AssetIds,
	}, nil
}

// ScenarioWaitForJob polls for job completion
func ScenarioWaitForJob(c *ScenarioClient, jobId string, interval time.Duration, timeout time.Duration) (*ScenarioJobResponse, error) {
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		jobStatus, err := ScenarioFetchJob(c, jobId)
		if err != nil {
			return nil, err
		}

		if jobStatus.Status == "failed" || jobStatus.Status == "canceled" || jobStatus.Status == "banned" {
			return nil, fmt.Errorf("job failed with status: %s", jobStatus.Status)
		}

		if jobStatus.Status == "success" {
			return jobStatus, nil
		}

		time.Sleep(interval)
	}

	return nil, fmt.Errorf("timeout waiting for job completion")
}

// ScenarioJobToUnifiedResponse converts a ScenarioJobResponse to a UnifiedTaskResponse
func ScenarioJobToUnifiedResponse(r *ScenarioJobResponse) *UnifiedTaskResponse {
	return &UnifiedTaskResponse{
		Status:   r.Status,
		AssetIds: r.AssetIds,
	}
}
