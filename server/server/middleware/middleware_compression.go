package middleware

import (
	"compress/gzip"
	"github.com/CAFxX/httpcompression"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/helper"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/logger"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"go.uber.org/zap"
	"net/http"
)

const (
	// Minimum response size in bytes to enable compression
	compressionThreshold = 100
)

var (
	// Global compression adapter configured with our settings
	compressionAdapter func(http.Handler) http.Handler
)

func init() {
	// Configure compression with brotli preferred, then gzip, then deflate
	// Set minimum size threshold to match current behavior
	adapter, err := httpcompression.Adapter(
		httpcompression.ContentTypes([]string{
			// Text content
			"text/html",
			"text/css",
			"text/plain",
			"text/javascript",
			"text/csv",
			"text/markdown",
			"text/x-component",

			// JavaScript/JSON
			"application/javascript",
			"application/json",
			"application/ld+json",
			"application/manifest+json",

			// XML/XHTML
			"application/xml",
			"text/xml",
			"application/xhtml+xml",
			"application/rss+xml",
			"application/atom+xml",

			// Images (vector)
			"image/svg+xml",

			// Fonts
			"font/woff",
			"font/woff2",
			"font/ttf",
			"font/otf",
			"font/eot",
			"application/font-woff",
			"application/font-woff2",
			"application/vnd.ms-fontobject",
			"application/x-font-ttf",
			"application/x-font-opentype",

			// 3D Models and Assets
			"model/gltf+json",            // .gltf files
			"model/gltf-binary",          // .glb files
			"model/obj",                  // .obj files
			"model/stl",                  // .stl files
			"model/fbx",                  // .fbx files
			"model/dae",                  // .dae (Collada) files
			"model/x3d+xml",              // .x3d files
			"model/3mf",                  // .3mf files
			"model/ply",                  // .ply files
			"model/vrml",                 // .wrl files
			"application/octet-stream",   // .glb, .bin, .fbx, .stl, .3ds, .blend files
			"application/x-3ds",          // .3ds files
			"application/x-blender",      // .blend files
			"application/x-maya-ascii",   // .ma files
			"application/x-maya-binary",  // .mb files
			"application/x-cinema4d",     // .c4d files
			"application/x-lightwave",    // .lwo, .lws files
			"application/x-autodesk-fbx", // .fbx files (alternative)
			"application/sla",            // .stl files (alternative)
			"text/plain",                 // .obj, .mtl, .dae, .x3d, .wrl, .asc files
			"application/json",           // Three.js JSON models, .babylon files
			"application/xml",            // .dae, .x3d XML-based models
			"text/xml",                   // XML-based 3D formats

			// Point Clouds and Gaussian Splats
			"application/x-pointcloud",     // .pcd, .ply point clouds
			"application/x-gaussian-splat", // Gaussian splat files
			"application/x-splat",          // .splat files

			// Animation and Motion Capture
			"application/x-bvh",       // .bvh motion capture files
			"application/x-animation", // .anim, .lanim files

			// Texture and Material Files
			"application/x-material",  // .mtl material files
			"application/x-substance", // Substance files

			// WebAssembly
			"application/wasm",

			// Archives and containers
			"application/zip",
			"application/x-gzip",
			"application/gzip",

			// Shaders
			"text/x-vertex-shader",
			"text/x-fragment-shader",
			"application/x-glsl",

			// Configuration files
			"application/toml",
			"application/yaml",
			"text/yaml",

			// Development files
			"application/typescript",
			"text/typescript",
			"application/sourcemap",
		}, false), // false = whitelist these content types
		httpcompression.MinSize(compressionThreshold),
		// Enable compression algorithms - brotli, gzip, deflate
		httpcompression.BrotliCompressionLevel(5),  // Enable brotli with compression level 5
		httpcompression.GzipCompressionLevel(6),    // Enable gzip with compression level 6
		httpcompression.DeflateCompressionLevel(6), // Enable deflate with compression level 6
	)
	if err != nil {
		// Fallback to default adapter if configuration fails
		adapter, _ = httpcompression.DefaultAdapter()
	}
	compressionAdapter = adapter
}

// CompressionMiddleware handles request decompression and response compression.
// Supports brotli (br), gzip, and deflate compression based on client Accept-Encoding.
// Decompresses incoming requests with supported Content-Encoding formats and compresses
// responses larger than 100 bytes using the best compression algorithm supported by the client.
func CompressionMiddleware(w http.ResponseWriter, r *http.Request, next http.HandlerFunc) {
	// Handle request decompression for supported formats
	if err := handleRequestDecompression(w, r); err != nil {
		return // Error response already sent
	}

	// Create a handler that will call next and then apply compression
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
	})

	// Apply compression to the handler and serve the request
	compressedHandler := compressionAdapter(handler)
	compressedHandler.ServeHTTP(w, r)
}

// handleRequestDecompression decompresses incoming request bodies based on Content-Encoding header
func handleRequestDecompression(w http.ResponseWriter, r *http.Request) error {
	requestEncoding := r.Header.Get("Content-Encoding")
	if requestEncoding == "" {
		return nil // No compression, continue normally
	}

	switch requestEncoding {
	case "gzip":
		// Decompress the request body
		reader, err := gzip.NewReader(r.Body)
		if err != nil {
			logger.GetLogger().Error("Failed to decompress gzip request body",
				zap.String("path", r.URL.Path),
				zap.String("method", r.Method),
				zap.String("content_encoding", requestEncoding),
				zap.Error(err),
				zap.String("remote_addr", r.RemoteAddr),
				zap.String("operation", "compression_gzip_decompress_error"),
			)
			helper.WriteJSON(w, context.Result{
				Code: constants.ErrorCodeInternalError,
				Msg:  "Failed to decompress gzip request body",
			})
			return err
		}
		// Replace the request body with the decompressed reader
		// Don't close here - let the normal request lifecycle handle cleanup
		r.Body = reader

	case "br":
		// Brotli decompression is handled automatically by httpcompression
		// For incoming requests, we'd need to implement brotli decompression here
		// Currently focusing on response compression as requested
		logger.GetLogger().Warn("Brotli request decompression not yet supported",
			zap.String("path", r.URL.Path),
			zap.String("method", r.Method),
			zap.String("content_encoding", requestEncoding),
			zap.String("remote_addr", r.RemoteAddr),
			zap.String("operation", "compression_brotli_not_supported"),
		)
		helper.WriteJSON(w, context.Result{
			Code: constants.ErrorCodeInternalError,
			Msg:  "Brotli request decompression not yet supported",
		})
		return http.ErrNotSupported

	default:
		// Unsupported compression format
		logger.GetLogger().Warn("Unsupported request compression format",
			zap.String("path", r.URL.Path),
			zap.String("method", r.Method),
			zap.String("content_encoding", requestEncoding),
			zap.String("remote_addr", r.RemoteAddr),
			zap.String("operation", "compression_unsupported_format"),
		)
		helper.WriteJSON(w, context.Result{
			Code: constants.ErrorCodeInternalError,
			Msg:  "Unsupported request compression format: " + requestEncoding,
		})
		return http.ErrNotSupported
	}

	return nil
}
