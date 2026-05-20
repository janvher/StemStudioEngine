package middleware

import (
	"crypto/md5"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// responseWriter wraps http.ResponseWriter to capture response for ETag generation
type responseWriter struct {
	http.ResponseWriter
	statusCode int
	body       []byte
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	// Only capture body for successful responses
	if rw.statusCode == 0 || rw.statusCode == http.StatusOK {
		rw.body = append(rw.body, b...)
	}
	return rw.ResponseWriter.Write(b)
}

// ETagMiddleware adds ETag support for static files
func ETagMiddleware(w http.ResponseWriter, r *http.Request, next http.HandlerFunc) {
	// Skip non-GET/HEAD requests
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		next.ServeHTTP(w, r)
		return
	}

	// Get file extension
	ext := strings.ToLower(filepath.Ext(r.URL.Path))
	
	// Only process cacheable asset files
	switch ext {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico",
		 ".glb", ".gltf", ".fbx", ".obj", ".mtl", ".dae", ".3ds", ".ply", ".stl",
		 ".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac",
		 ".mp4", ".webm", ".ogv", ".mov", ".avi",
		 ".woff", ".woff2", ".ttf", ".eot",
		 ".js", ".css", ".wasm":
		// Continue with ETag processing
	default:
		// Skip ETag for other file types
		next.ServeHTTP(w, r)
		return
	}

	// Try to get file info for static files
	// This assumes files are served from a public directory
	// You may need to adjust the path based on your server configuration
	filePath := r.URL.Path
	if strings.HasPrefix(filePath, "/") {
		filePath = filePath[1:]
	}
	
	// Generate ETag based on file modification time and size
	// In a real implementation, you'd need to map URL path to actual file path
	// For now, we'll use a wrapped response writer to generate ETag from content
	
	wrapped := &responseWriter{ResponseWriter: w}
	
	// Check for If-None-Match header
	clientETag := r.Header.Get("If-None-Match")
	
	// Process the request
	next.ServeHTTP(wrapped, r)
	
	// Only add ETag for successful responses
	if wrapped.statusCode == 0 || wrapped.statusCode == http.StatusOK {
		// Generate ETag from response body if we have it
		if len(wrapped.body) > 0 {
			hash := md5.Sum(wrapped.body)
			etag := fmt.Sprintf(`"%x"`, hash)
			
			// Set ETag header
			wrapped.Header().Set("ETag", etag)
			
			// Check if client has matching ETag
			if clientETag == etag {
				// Content hasn't changed, send 304
				wrapped.Header().Del("Content-Type")
				wrapped.Header().Del("Content-Length")
				wrapped.WriteHeader(http.StatusNotModified)
				return
			}
		}
	}
}

// GenerateFileETag generates an ETag for a file based on its modification time and size
func GenerateFileETag(info os.FileInfo) string {
	// Use modification time and size to generate ETag
	// This is more efficient than reading the entire file
	modTime := info.ModTime().Unix()
	size := info.Size()
	
	data := fmt.Sprintf("%d-%d", modTime, size)
	hash := md5.Sum([]byte(data))
	return fmt.Sprintf(`"%x"`, hash)
}

// StaticETagMiddleware is a more efficient ETag middleware for static files
// It should be used with negroni's static middleware
func StaticETagMiddleware(basePath string) func(http.ResponseWriter, *http.Request, http.HandlerFunc) {
	return func(w http.ResponseWriter, r *http.Request, next http.HandlerFunc) {
		// Skip non-GET/HEAD requests
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			next.ServeHTTP(w, r)
			return
		}

		// Get the file path
		urlPath := r.URL.Path
		if urlPath == "/" {
			urlPath = "/index.html"
		}
		
		// Clean the path
		urlPath = strings.TrimPrefix(urlPath, "/")
		filePath := filepath.Join(basePath, urlPath)
		
		// Get file info
		info, err := os.Stat(filePath)
		if err != nil || info.IsDir() {
			// File doesn't exist or is a directory, let next handler deal with it
			next.ServeHTTP(w, r)
			return
		}
		
		// Generate ETag
		etag := GenerateFileETag(info)
		w.Header().Set("ETag", etag)
		
		// Set Last-Modified
		modTime := info.ModTime()
		w.Header().Set("Last-Modified", modTime.UTC().Format(http.TimeFormat))
		
		// Check If-None-Match
		if match := r.Header.Get("If-None-Match"); match != "" {
			if match == etag {
				w.WriteHeader(http.StatusNotModified)
				return
			}
		}
		
		// Check If-Modified-Since
		if ifModSince := r.Header.Get("If-Modified-Since"); ifModSince != "" {
			t, err := time.Parse(http.TimeFormat, ifModSince)
			if err == nil && !modTime.After(t) {
				w.WriteHeader(http.StatusNotModified)
				return
			}
		}
		
		// Continue to serve the file
		next.ServeHTTP(w, r)
	}
}