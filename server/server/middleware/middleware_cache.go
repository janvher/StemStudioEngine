package middleware

import (
	"net/http"
	"path/filepath"
	"strings"
)

// CacheMiddleware sets appropriate cache headers based on file type and version
func CacheMiddleware(w http.ResponseWriter, r *http.Request, next http.HandlerFunc) {
	// Skip API endpoints - they should control their own cache headers
	if strings.HasPrefix(r.URL.Path, "/api/") {
		next.ServeHTTP(w, r)
		return
	}

	// Check if request has version parameter
	hasVersion := r.URL.Query().Get("v") != ""

	// Get file extension
	ext := strings.ToLower(filepath.Ext(r.URL.Path))
	
	// Determine cache policy based on file type and version
	if hasVersion {
		// Versioned assets - cache for 1 year
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		switch ext {
		case ".js", ".css", ".wasm":
			// Code files without version - short cache with revalidation
			w.Header().Set("Cache-Control", "public, max-age=3600, must-revalidate") // 1 hour
		case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico":
			// Images - long cache with revalidation
			w.Header().Set("Cache-Control", "public, max-age=604800, must-revalidate") // 7 days
		case ".woff", ".woff2", ".ttf", ".eot":
			// Fonts - long cache
			w.Header().Set("Cache-Control", "public, max-age=2592000") // 30 days
		case ".glb", ".gltf", ".fbx", ".obj", ".mtl", ".dae", ".3ds", ".ply", ".stl":
			// 3D models - long cache with revalidation
			w.Header().Set("Cache-Control", "public, max-age=604800, must-revalidate") // 7 days
		case ".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac":
			// Audio files - long cache with revalidation
			w.Header().Set("Cache-Control", "public, max-age=604800, must-revalidate") // 7 days
		case ".mp4", ".webm", ".ogv", ".mov", ".avi":
			// Video files - long cache with revalidation
			w.Header().Set("Cache-Control", "public, max-age=604800, must-revalidate") // 7 days
		case ".json":
			// JSON files - short cache for dynamic data
			w.Header().Set("Cache-Control", "public, max-age=300, must-revalidate") // 5 minutes
		case ".html", ".htm":
			// HTML files - no cache to ensure fresh content
			w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
			w.Header().Set("Pragma", "no-cache")
			w.Header().Set("Expires", "0")
		default:
			// Everything else - no cache
			w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
			w.Header().Set("Pragma", "no-cache")
			w.Header().Set("Expires", "0")
		}
	}
	
	// Continue to next handler
	next.ServeHTTP(w, r)
}