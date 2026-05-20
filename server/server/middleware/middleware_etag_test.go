package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestGenerateFileETag(t *testing.T) {
	// Create a mock FileInfo
	info := &mockFileInfo{
		name:    "test.jpg",
		size:    1024,
		modTime: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
	}
	
	etag := GenerateFileETag(info)
	
	// ETag should be non-empty and quoted
	if etag == "" {
		t.Error("ETag should not be empty")
	}
	
	if etag[0] != '"' || etag[len(etag)-1] != '"' {
		t.Error("ETag should be quoted")
	}
	
	// Same file info should generate same ETag
	etag2 := GenerateFileETag(info)
	if etag != etag2 {
		t.Error("Same file info should generate same ETag")
	}
	
	// Different modification time should generate different ETag
	info2 := &mockFileInfo{
		name:    "test.jpg",
		size:    1024,
		modTime: time.Date(2024, 1, 2, 0, 0, 0, 0, time.UTC),
	}
	etag3 := GenerateFileETag(info2)
	if etag == etag3 {
		t.Error("Different modification time should generate different ETag")
	}
}

func TestStaticETagMiddleware(t *testing.T) {
	// Create a temporary directory and file for testing
	tempDir := t.TempDir()
	testFile := filepath.Join(tempDir, "test.jpg")
	
	// Create test file
	content := []byte("test image content")
	err := os.WriteFile(testFile, content, 0644)
	if err != nil {
		t.Fatal(err)
	}
	
	// Get file info for ETag generation
	info, err := os.Stat(testFile)
	if err != nil {
		t.Fatal(err)
	}
	expectedETag := GenerateFileETag(info)
	
	tests := []struct {
		name               string
		method             string
		path               string
		ifNoneMatch        string
		ifModifiedSince    string
		expectedStatus     int
		expectETag         bool
		expectLastModified bool
	}{
		{
			name:               "GET request without cache headers",
			method:             http.MethodGet,
			path:               "/test.jpg",
			expectedStatus:     http.StatusOK,
			expectETag:         true,
			expectLastModified: true,
		},
		{
			name:               "GET request with matching ETag",
			method:             http.MethodGet,
			path:               "/test.jpg",
			ifNoneMatch:        expectedETag,
			expectedStatus:     http.StatusNotModified,
			expectETag:         true,
			expectLastModified: true,
		},
		{
			name:               "GET request with non-matching ETag",
			method:             http.MethodGet,
			path:               "/test.jpg",
			ifNoneMatch:        `"different-etag"`,
			expectedStatus:     http.StatusOK,
			expectETag:         true,
			expectLastModified: true,
		},
		{
			name:               "HEAD request",
			method:             http.MethodHead,
			path:               "/test.jpg",
			expectedStatus:     http.StatusOK,
			expectETag:         true,
			expectLastModified: true,
		},
		{
			name:           "POST request (should skip)",
			method:         http.MethodPost,
			path:           "/test.jpg",
			expectedStatus: http.StatusOK,
			expectETag:     false,
		},
		{
			name:           "Non-existent file",
			method:         http.MethodGet,
			path:           "/nonexistent.jpg",
			expectedStatus: http.StatusOK,
			expectETag:     false,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			if tt.ifNoneMatch != "" {
				req.Header.Set("If-None-Match", tt.ifNoneMatch)
			}
			if tt.ifModifiedSince != "" {
				req.Header.Set("If-Modified-Since", tt.ifModifiedSince)
			}
			
			recorder := httptest.NewRecorder()
			nextCalled := false
			
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				nextCalled = true
				// Simulate serving the file
				if tt.expectedStatus == http.StatusOK {
					w.WriteHeader(http.StatusOK)
				}
			})
			
			middleware := StaticETagMiddleware(tempDir)
			middleware(recorder, req, next)
			
			// Check if next handler was called
			if tt.expectedStatus == http.StatusNotModified {
				if nextCalled {
					t.Error("Next handler should not be called for 304 response")
				}
			} else if tt.method != http.MethodPost {
				if !nextCalled {
					t.Error("Next handler should be called")
				}
			}
			
			// Check ETag header
			etag := recorder.Header().Get("ETag")
			if tt.expectETag && etag == "" {
				t.Error("Expected ETag header")
			} else if !tt.expectETag && etag != "" {
				t.Error("Unexpected ETag header")
			}
			
			// Check Last-Modified header
			lastModified := recorder.Header().Get("Last-Modified")
			if tt.expectLastModified && lastModified == "" {
				t.Error("Expected Last-Modified header")
			} else if !tt.expectLastModified && lastModified != "" {
				t.Error("Unexpected Last-Modified header")
			}
		})
	}
}

func TestIfModifiedSince(t *testing.T) {
	tempDir := t.TempDir()
	testFile := filepath.Join(tempDir, "test.css")
	
	// Create test file
	err := os.WriteFile(testFile, []byte("test css"), 0644)
	if err != nil {
		t.Fatal(err)
	}
	
	// Get file info
	info, err := os.Stat(testFile)
	if err != nil {
		t.Fatal(err)
	}
	
	// Test with If-Modified-Since in the past
	req := httptest.NewRequest(http.MethodGet, "/test.css", nil)
	pastTime := info.ModTime().Add(-1 * time.Hour).UTC().Format(http.TimeFormat)
	req.Header.Set("If-Modified-Since", pastTime)
	
	recorder := httptest.NewRecorder()
	nextCalled := false
	
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusOK)
	})
	
	middleware := StaticETagMiddleware(tempDir)
	middleware(recorder, req, next)
	
	if !nextCalled {
		t.Error("Should serve file when If-Modified-Since is in the past")
	}
	
	// Test with If-Modified-Since in the future
	req2 := httptest.NewRequest(http.MethodGet, "/test.css", nil)
	futureTime := info.ModTime().Add(1 * time.Hour).UTC().Format(http.TimeFormat)
	req2.Header.Set("If-Modified-Since", futureTime)
	
	recorder2 := httptest.NewRecorder()
	nextCalled2 := false
	
	next2 := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled2 = true
	})
	
	middleware(recorder2, req2, next2)
	
	if nextCalled2 {
		t.Error("Should not serve file when If-Modified-Since is in the future")
	}
	
	if recorder2.Code != http.StatusNotModified {
		t.Errorf("Expected 304 status, got %d", recorder2.Code)
	}
}

// mockFileInfo implements os.FileInfo for testing
type mockFileInfo struct {
	name    string
	size    int64
	modTime time.Time
}

func (m *mockFileInfo) Name() string       { return m.name }
func (m *mockFileInfo) Size() int64        { return m.size }
func (m *mockFileInfo) Mode() os.FileMode  { return 0644 }
func (m *mockFileInfo) ModTime() time.Time { return m.modTime }
func (m *mockFileInfo) IsDir() bool        { return false }
func (m *mockFileInfo) Sys() interface{}   { return nil }