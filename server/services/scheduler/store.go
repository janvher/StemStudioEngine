package scheduler

import (
	"errors"
	"sync"
	"time"
)

var ErrJobNotFound = errors.New("job not found")

// JobStore defines the interface for job persistence
type JobStore interface {
	Save(job *Job) error
	Get(id string) (*Job, error)
	Update(job *Job) error
	Delete(id string) error
	ListByStatus(status JobStatus) ([]*Job, error)
	// DeleteCompletedBefore deletes completed/failed jobs older than cutoff
	DeleteCompletedBefore(cutoff time.Time) (int, error)
}

// MemoryStore is an in-memory implementation of JobStore
type MemoryStore struct {
	mu   sync.RWMutex
	jobs map[string]*Job
}

// NewMemoryStore creates a new in-memory job store
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		jobs: make(map[string]*Job),
	}
}

func (s *MemoryStore) Save(job *Job) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.jobs[job.ID] = job
	return nil
}

func (s *MemoryStore) Get(id string) (*Job, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	job, ok := s.jobs[id]
	if !ok {
		return nil, ErrJobNotFound
	}
	return job, nil
}

func (s *MemoryStore) Update(job *Job) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.jobs[job.ID]; !ok {
		return ErrJobNotFound
	}
	s.jobs[job.ID] = job
	return nil
}

func (s *MemoryStore) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.jobs, id)
	return nil
}

func (s *MemoryStore) ListByStatus(status JobStatus) ([]*Job, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var result []*Job
	for _, job := range s.jobs {
		if job.Status == status {
			result = append(result, job)
		}
	}
	return result, nil
}

func (s *MemoryStore) DeleteCompletedBefore(cutoff time.Time) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	deleted := 0
	for id, job := range s.jobs {
		// Only delete completed or failed jobs
		if job.Status != JobStatusCompleted && job.Status != JobStatusFailed {
			continue
		}
		// Check if job ended before cutoff
		if job.EndedAt != nil && job.EndedAt.Before(cutoff) {
			delete(s.jobs, id)
			deleted++
		}
	}
	return deleted, nil
}
