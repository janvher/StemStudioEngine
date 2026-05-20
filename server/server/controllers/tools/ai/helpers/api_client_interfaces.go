// Package helpers provides API clients for various AI services.
package helpers

import (
	"net/http"
	"time"
)

// UnifiedTaskResponseInterface represents a standardized task response
// that works across different APIs
type UnifiedTaskResponseInterface interface {
	GetID() string
	GetStatus() string
	GetThumbnail() string
	GetModel() string
	GetProgress() int
	GetTopology() string
	IsRiggable() bool
	GetAssetIds() []string
}

// APIClientInterface defines a common interface for all API clients
type APIClientInterface interface {
	// MakeRequest makes an HTTP request to the API
	MakeRequest(method, endpoint string, payload interface{}) (*http.Response, error)

	// GetBaseURL returns the base URL for the API
	GetBaseURL() string

	// GetAuthHeader returns the authorization header
	GetAuthHeader() string
}

// TaskStatusClientInterface extends APIClientInterface for APIs that support task status
type TaskStatusClientInterface interface {
	APIClientInterface

	// FetchTask retrieves the status of a task
	FetchTask(taskId string) (*UnifiedTaskResponse, error)

	// WaitForTask polls for task completion
	WaitForTask(taskId string, interval time.Duration, timeout time.Duration) (*UnifiedTaskResponse, error)
}

// JobStatusClientInterface extends APIClientInterface for APIs that support job status
type JobStatusClientInterface interface {
	APIClientInterface

	// FetchJob retrieves the status of a job
	FetchJob(jobId string) (*ScenarioJobResponse, error)

	// WaitForJob polls for job completion
	WaitForJob(jobId string, interval time.Duration, timeout time.Duration) (*ScenarioJobResponse, error)
}
