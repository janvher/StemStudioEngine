package middleware

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
)

func TestCacheMiddleware(t *testing.T) {
	tests := []struct {
		name           string
		path           string
		queryParams    map[string]string
		expectedCache  string
		expectedPragma string
	}{
		{
			name:          "Versioned JS file",
			path:          "/app.js",
			queryParams:   map[string]string{"v": "1.2.3"},
			expectedCache: "public, max-age=31536000, immutable",
		},
		{
			name:          "Unversioned JS file",
			path:          "/app.js",
			queryParams:   map[string]string{},
			expectedCache: "public, max-age=3600, must-revalidate",
		},
		{
			name:          "CSS file without version",
			path:          "/styles.css",
			queryParams:   map[string]string{},
			expectedCache: "public, max-age=3600, must-revalidate",
		},
		{
			name:          "WASM file without version",
			path:          "/module.wasm",
			queryParams:   map[string]string{},
			expectedCache: "public, max-age=3600, must-revalidate",
		},
		{
			name:          "Image file (JPG)",
			path:          "/image.jpg",
			queryParams:   map[string]string{},
			expectedCache: "public, max-age=604800, must-revalidate",
		},
		{
			name:          "Image file (PNG)",
			path:          "/logo.png",
			queryParams:   map[string]string{},
			expectedCache: "public, max-age=604800, must-revalidate",
		},
		{
			name:          "SVG file",
			path:          "/icon.svg",
			queryParams:   map[string]string{},
			expectedCache: "public, max-age=604800, must-revalidate",
		},
		{
			name:          "Font file (WOFF2)",
			path:          "/font.woff2",
			queryParams:   map[string]string{},
			expectedCache: "public, max-age=2592000",
		},
		{
			name:          "3D model (GLB)",
			path:          "/model.glb",
			queryParams:   map[string]string{},
			expectedCache: "public, max-age=604800, must-revalidate",
		},
		{
			name:          "3D model (GLTF)",
			path:          "/scene.gltf",
			queryParams:   map[string]string{},
			expectedCache: "public, max-age=604800, must-revalidate",
		},
		{
			name:          "Audio file (MP3)",
			path:          "/sound.mp3",
			queryParams:   map[string]string{},
			expectedCache: "public, max-age=604800, must-revalidate",
		},
		{
			name:          "Video file (MP4)",
			path:          "/video.mp4",
			queryParams:   map[string]string{},
			expectedCache: "public, max-age=604800, must-revalidate",
		},
		{
			name:           "HTML file (no cache)",
			path:           "/index.html",
			queryParams:    map[string]string{},
			expectedCache:  "no-cache, no-store, must-revalidate",
			expectedPragma: "no-cache",
		},
		{
			name:           "Unknown file type",
			path:           "/data.xyz",
			queryParams:    map[string]string{},
			expectedCache:  "no-cache, no-store, must-revalidate",
			expectedPragma: "no-cache",
		},
		{
			name:          "Versioned image",
			path:          "/logo.png",
			queryParams:   map[string]string{"v": "abc123"},
			expectedCache: "public, max-age=31536000, immutable",
		},
		{
			name:          "JSON file",
			path:          "/data.json",
			queryParams:   map[string]string{},
			expectedCache: "public, max-age=300, must-revalidate",
		},
		{
			name:          "3D model DAE",
			path:          "/model.dae",
			queryParams:   map[string]string{},
			expectedCache: "public, max-age=604800, must-revalidate",
		},
		{
			name:          "Audio FLAC",
			path:          "/music.flac",
			queryParams:   map[string]string{},
			expectedCache: "public, max-age=604800, must-revalidate",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			
			// Add query parameters
			if len(tt.queryParams) > 0 {
				q := url.Values{}
				for k, v := range tt.queryParams {
					q.Add(k, v)
				}
				req.URL.RawQuery = q.Encode()
			}

			recorder := httptest.NewRecorder()
			nextCalled := false

			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				nextCalled = true
			})

			CacheMiddleware(recorder, req, next)

			// Check if next handler was called
			if !nextCalled {
				t.Error("Next handler was not called")
			}

			// Check Cache-Control header
			cacheControl := recorder.Header().Get("Cache-Control")
			if cacheControl != tt.expectedCache {
				t.Errorf("Expected Cache-Control '%s', got '%s'", tt.expectedCache, cacheControl)
			}

			// Check Pragma header for no-cache scenarios
			if tt.expectedPragma != "" {
				pragma := recorder.Header().Get("Pragma")
				if pragma != tt.expectedPragma {
					t.Errorf("Expected Pragma '%s', got '%s'", tt.expectedPragma, pragma)
				}
			}

			// Check Expires header for no-cache scenarios
			if tt.expectedCache == "no-cache, no-store, must-revalidate" {
				expires := recorder.Header().Get("Expires")
				if expires != "0" {
					t.Errorf("Expected Expires '0', got '%s'", expires)
				}
			}
		})
	}
}

func TestCacheMiddlewareWithMixedCase(t *testing.T) {
	// Test that file extensions are case insensitive
	paths := []struct {
		path          string
		expectedCache string
	}{
		{"/file.JS", "public, max-age=3600, must-revalidate"},
		{"/file.Css", "public, max-age=3600, must-revalidate"},
		{"/file.PNG", "public, max-age=604800, must-revalidate"},
		{"/file.WOFF2", "public, max-age=2592000"},
	}

	for _, p := range paths {
		req := httptest.NewRequest(http.MethodGet, p.path, nil)
		recorder := httptest.NewRecorder()

		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})
		CacheMiddleware(recorder, req, next)

		cacheControl := recorder.Header().Get("Cache-Control")
		if cacheControl != p.expectedCache {
			t.Errorf("Path %s: Expected Cache-Control '%s', got '%s'", 
				p.path, p.expectedCache, cacheControl)
		}
	}
}