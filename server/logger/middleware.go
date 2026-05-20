package logger

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// RequestIDKey is the context key for request ID
type RequestIDKey string

const (
	// RequestIDContextKey is the key used to store request ID in context
	RequestIDContextKey RequestIDKey = "request_id"
	// UserIDContextKey is the key used to store user ID in context
	UserIDContextKey RequestIDKey = "user_id"
)

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
	written    int64
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{
		ResponseWriter: w,
		statusCode:     http.StatusOK,
	}
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	n, err := rw.ResponseWriter.Write(b)
	rw.written += int64(n)
	return n, err
}

// HTTPLoggingMiddleware creates a middleware that logs HTTP requests and responses
func HTTPLoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// Generate request ID
		requestID := uuid.New().String()

		// Add request ID to context
		ctx := context.WithValue(r.Context(), RequestIDContextKey, requestID)
		r = r.WithContext(ctx)

		// Set request ID header for response
		w.Header().Set("X-Request-ID", requestID)

		// Wrap response writer
		wrapped := newResponseWriter(w)

		// Get logger
		logger := GetLogger()

		if r.URL.Path != "/" {

			// Log request start
			logger.Info("HTTP request started",
				zap.String("request_id", requestID),
				zap.String("method", r.Method),
				zap.String("path", r.URL.Path),
				zap.String("query", r.URL.RawQuery),
				zap.String("remote_addr", getClientIP(r)),
				zap.String("user_agent", r.UserAgent()),
				zap.String("referer", r.Referer()),
			)
		}

		// Call the next handler
		next.ServeHTTP(wrapped, r)

		// Log request completion
		fields := []zap.Field{
			zap.String("request_id", requestID),
			zap.String("method", r.Method),
			zap.String("path", r.URL.Path),
			zap.Int("status", wrapped.statusCode),
			zap.Int64("response_size", wrapped.written),
			zap.String("remote_addr", getClientIP(r)),
		}

		// Add user ID if available in context
		if userID, ok := ctx.Value(UserIDContextKey).(string); ok && userID != "" {
			fields = append(fields, zap.String("user_id", userID))
		}

		// Log with appropriate level based on status code
		if wrapped.statusCode >= 500 {
			logger.Error("HTTP request completed with server error", fields...)
		} else if wrapped.statusCode >= 400 {
			logger.Warn("HTTP request completed with client error", fields...)
		} else {
			if r.URL.Path != "/" {
				logger.Info("HTTP request completed", fields...)
			}
		}
	})
}

// getClientIP extracts the real client IP from the request
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header
	xForwardedFor := r.Header.Get("X-Forwarded-For")
	if xForwardedFor != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		if idx := strings.Index(xForwardedFor, ","); idx != -1 {
			return strings.TrimSpace(xForwardedFor[:idx])
		}
		return strings.TrimSpace(xForwardedFor)
	}

	// Check X-Real-IP header
	xRealIP := r.Header.Get("X-Real-IP")
	if xRealIP != "" {
		return strings.TrimSpace(xRealIP)
	}

	// Fallback to RemoteAddr
	return r.RemoteAddr
}

// GetRequestIDFromContext extracts request ID from context
func GetRequestIDFromContext(ctx context.Context) string {
	if requestID, ok := ctx.Value(RequestIDContextKey).(string); ok {
		return requestID
	}
	return ""
}

// GetUserIDFromContext extracts user ID from context
func GetUserIDFromContext(ctx context.Context) string {
	if userID, ok := ctx.Value(UserIDContextKey).(string); ok {
		return userID
	}
	return ""
}

// AddUserIDToContext adds user ID to the request context
func AddUserIDToContext(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, UserIDContextKey, userID)
}

// LogHTTPError logs an HTTP error with request context
func LogHTTPError(ctx context.Context, err error, message string, fields ...zap.Field) {
	logger := GetLogger()

	allFields := []zap.Field{zap.Error(err)}

	// Add request ID if available
	if requestID := GetRequestIDFromContext(ctx); requestID != "" {
		allFields = append(allFields, zap.String("request_id", requestID))
	}

	// Add user ID if available
	if userID := GetUserIDFromContext(ctx); userID != "" {
		allFields = append(allFields, zap.String("user_id", userID))
	}

	// Add any additional fields
	allFields = append(allFields, fields...)

	logger.Error(message, allFields...)
}

// LogHTTPInfo logs an HTTP info message with request context
func LogHTTPInfo(ctx context.Context, message string, fields ...zap.Field) {
	logger := GetLogger()

	allFields := []zap.Field{}

	// Add request ID if available
	if requestID := GetRequestIDFromContext(ctx); requestID != "" {
		allFields = append(allFields, zap.String("request_id", requestID))
	}

	// Add user ID if available
	if userID := GetUserIDFromContext(ctx); userID != "" {
		allFields = append(allFields, zap.String("user_id", userID))
	}

	// Add any additional fields
	allFields = append(allFields, fields...)

	logger.Info(message, allFields...)
}
