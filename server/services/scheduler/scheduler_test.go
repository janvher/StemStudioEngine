package scheduler

import (
	"errors"
	"sync/atomic"
	"testing"
	"time"
)

func TestScheduler_EnqueueAndProcess(t *testing.T) {
	store := NewMemoryStore()
	config := DefaultConfig()
	config.WorkerCount = 1

	sched := New(store, config)

	var processed atomic.Bool
	sched.RegisterHandler("test", func(job *Job) (map[string]interface{}, error) {
		processed.Store(true)
		return map[string]interface{}{"done": true}, nil
	})

	sched.Start()
	defer sched.Stop()

	jobID, err := sched.Enqueue("test", map[string]interface{}{"key": "value"})
	if err != nil {
		t.Fatalf("Enqueue failed: %v", err)
	}

	// Wait for processing
	time.Sleep(100 * time.Millisecond)

	if !processed.Load() {
		t.Error("Job was not processed")
	}

	job, err := sched.GetJob(jobID)
	if err != nil {
		t.Fatalf("GetJob failed: %v", err)
	}

	if job.Status != JobStatusCompleted {
		t.Errorf("Expected status %s, got %s", JobStatusCompleted, job.Status)
	}

	if job.Result["done"] != true {
		t.Error("Expected result to contain done=true")
	}
}

func TestScheduler_Retry(t *testing.T) {
	store := NewMemoryStore()
	config := DefaultConfig()
	config.WorkerCount = 1
	config.MaxRetries = 3
	config.RetryBaseDelay = 10 * time.Millisecond

	sched := New(store, config)

	var attempts atomic.Int32
	sched.RegisterHandler("flaky", func(job *Job) (map[string]interface{}, error) {
		count := attempts.Add(1)
		if count < 3 {
			return nil, errors.New("temporary failure")
		}
		return map[string]interface{}{"success": true}, nil
	})

	sched.Start()
	defer sched.Stop()

	jobID, _ := sched.Enqueue("flaky", nil)

	// Wait for retries
	time.Sleep(200 * time.Millisecond)

	job, _ := sched.GetJob(jobID)
	if job.Status != JobStatusCompleted {
		t.Errorf("Expected status %s, got %s", JobStatusCompleted, job.Status)
	}

	if attempts.Load() != 3 {
		t.Errorf("Expected 3 attempts, got %d", attempts.Load())
	}
}

func TestScheduler_UnknownHandler(t *testing.T) {
	store := NewMemoryStore()
	sched := New(store, DefaultConfig())

	_, err := sched.Enqueue("unknown", nil)
	if err == nil {
		t.Error("Expected error for unknown handler")
	}
}
