package scheduler

import (
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Config holds scheduler configuration
type Config struct {
	WorkerCount      int           // Number of concurrent workers
	MaxRetries       int           // Default max retries for jobs
	RetryBaseDelay   time.Duration // Base delay for exponential backoff
	JobTTL           time.Duration // How long to keep completed/failed jobs
	CleanupInterval  time.Duration // How often to run cleanup
}

// DefaultConfig returns sensible defaults
func DefaultConfig() Config {
	return Config{
		WorkerCount:      3,
		MaxRetries:       3,
		RetryBaseDelay:   time.Second * 2,
		JobTTL:           time.Hour * 24, // Keep jobs for 24 hours
		CleanupInterval:  time.Hour,      // Cleanup every hour
	}
}

// Scheduler manages async job execution
type Scheduler struct {
	config   Config
	store    JobStore
	handlers map[string]JobHandler
	queue    chan string
	wg       sync.WaitGroup
	mu       sync.RWMutex
	running  bool
	stopCh   chan struct{}
}

// New creates a new Scheduler
func New(store JobStore, config Config) *Scheduler {
	return &Scheduler{
		config:   config,
		store:    store,
		handlers: make(map[string]JobHandler),
		queue:    make(chan string, 100),
		stopCh:   make(chan struct{}),
	}
}

// RegisterHandler registers a handler for a job type
func (s *Scheduler) RegisterHandler(jobType string, handler JobHandler) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.handlers[jobType] = handler
}

// Start begins processing jobs
func (s *Scheduler) Start() {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return
	}
	s.running = true
	s.mu.Unlock()

	for i := 0; i < s.config.WorkerCount; i++ {
		s.wg.Add(1)
		go s.worker(i)
	}

	// Start cleanup goroutine
	s.wg.Add(1)
	go s.cleanupWorker()

	log.Printf("[Scheduler] Started with %d workers", s.config.WorkerCount)
}

// Stop gracefully stops the scheduler
func (s *Scheduler) Stop() {
	s.mu.Lock()
	if !s.running {
		s.mu.Unlock()
		return
	}
	s.running = false
	s.mu.Unlock()

	close(s.stopCh)
	s.wg.Wait()
	log.Printf("[Scheduler] Stopped")
}

// Enqueue adds a job to the queue and returns the job ID
func (s *Scheduler) Enqueue(jobType string, payload map[string]interface{}) (string, error) {
	s.mu.RLock()
	_, hasHandler := s.handlers[jobType]
	s.mu.RUnlock()

	if !hasHandler {
		return "", fmt.Errorf("no handler registered for job type: %s", jobType)
	}

	job := &Job{
		ID:         uuid.New().String(),
		Type:       jobType,
		Status:     JobStatusPending,
		Payload:    payload,
		MaxRetries: s.config.MaxRetries,
		CreatedAt:  time.Now(),
	}

	if err := s.store.Save(job); err != nil {
		return "", fmt.Errorf("failed to save job: %w", err)
	}

	// Non-blocking send to queue
	select {
	case s.queue <- job.ID:
	default:
		log.Printf("[Scheduler] Queue full, job %s will be picked up later", job.ID)
	}

	log.Printf("[Scheduler] Enqueued job %s (type: %s)", job.ID, job.Type)
	return job.ID, nil
}

// GetJob returns the current state of a job
func (s *Scheduler) GetJob(id string) (*Job, error) {
	return s.store.Get(id)
}

func (s *Scheduler) worker(id int) {
	defer s.wg.Done()

	for {
		select {
		case <-s.stopCh:
			return
		case jobID := <-s.queue:
			s.processJob(jobID)
		}
	}
}

func (s *Scheduler) cleanupWorker() {
	defer s.wg.Done()

	ticker := time.NewTicker(s.config.CleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopCh:
			return
		case <-ticker.C:
			cutoff := time.Now().Add(-s.config.JobTTL)
			deleted, err := s.store.DeleteCompletedBefore(cutoff)
			if err != nil {
				log.Printf("[Scheduler] Cleanup error: %v", err)
			} else if deleted > 0 {
				log.Printf("[Scheduler] Cleaned up %d old jobs", deleted)
			}
		}
	}
}

func (s *Scheduler) processJob(jobID string) {
	job, err := s.store.Get(jobID)
	if err != nil {
		log.Printf("[Scheduler] Failed to get job %s: %v", jobID, err)
		return
	}

	s.mu.RLock()
	handler, ok := s.handlers[job.Type]
	s.mu.RUnlock()

	if !ok {
		log.Printf("[Scheduler] No handler for job type %s", job.Type)
		return
	}

	// Mark as running
	now := time.Now()
	job.Status = JobStatusRunning
	job.StartedAt = &now
	job.Attempts++
	s.store.Update(job)

	// Execute handler
	result, err := handler(job)

	endTime := time.Now()
	job.EndedAt = &endTime

	if err != nil {
		job.Error = err.Error()

		if job.Attempts < job.MaxRetries {
			// Schedule retry with exponential backoff
			job.Status = JobStatusPending
			s.store.Update(job)

			delay := s.config.RetryBaseDelay * time.Duration(1<<(job.Attempts-1))
			go func(jid string, d time.Duration, stopCh <-chan struct{}) {
				timer := time.NewTimer(d)
				defer timer.Stop()
				select {
				case <-stopCh:
					return
				case <-timer.C:
					select {
					case s.queue <- jid:
					default:
					}
				}
			}(job.ID, delay, s.stopCh)

			log.Printf("[Scheduler] Job %s failed, retrying in %v (attempt %d/%d)",
				job.ID, delay, job.Attempts, job.MaxRetries)
		} else {
			job.Status = JobStatusFailed
			s.store.Update(job)
			log.Printf("[Scheduler] Job %s failed after %d attempts: %v",
				job.ID, job.Attempts, err)
		}
	} else {
		job.Status = JobStatusCompleted
		job.Result = result
		s.store.Update(job)
		log.Printf("[Scheduler] Job %s completed", job.ID)
	}
}
