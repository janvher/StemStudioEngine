package scheduler

import (
	"time"
)

// JobStatus represents the current state of a job
type JobStatus string

const (
	JobStatusPending   JobStatus = "pending"
	JobStatusRunning   JobStatus = "running"
	JobStatusCompleted JobStatus = "completed"
	JobStatusFailed    JobStatus = "failed"
)

// Job represents an async task to be executed
type Job struct {
	ID         string                 `json:"id"`
	Type       string                 `json:"type"`
	Status     JobStatus              `json:"status"`
	Payload    map[string]interface{} `json:"payload"`
	Result     map[string]interface{} `json:"result,omitempty"`
	Error      string                 `json:"error,omitempty"`
	Attempts   int                    `json:"attempts"`
	MaxRetries int                    `json:"maxRetries"`
	CreatedAt  time.Time              `json:"createdAt"`
	StartedAt  *time.Time             `json:"startedAt,omitempty"`
	EndedAt    *time.Time             `json:"endedAt,omitempty"`
}

// JobHandler processes a job and returns a result or error
type JobHandler func(job *Job) (map[string]interface{}, error)
