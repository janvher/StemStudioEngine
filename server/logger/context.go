package logger

import (
	"context"

	"go.uber.org/zap"
)

// ContextLogger wraps a zap logger with context-aware functionality
type ContextLogger struct {
	logger *zap.Logger
	ctx    context.Context
}

// WithContext creates a new ContextLogger with the given context
func WithContext(ctx context.Context) *ContextLogger {
	return &ContextLogger{
		logger: GetLogger(),
		ctx:    ctx,
	}
}

// WithFields returns a new ContextLogger with additional fields
func (cl *ContextLogger) WithFields(fields ...zap.Field) *ContextLogger {
	return &ContextLogger{
		logger: cl.logger.With(fields...),
		ctx:    cl.ctx,
	}
}

// getContextFields extracts common fields from context
func (cl *ContextLogger) getContextFields() []zap.Field {
	var fields []zap.Field

	// Add request ID if available
	if requestID := GetRequestIDFromContext(cl.ctx); requestID != "" {
		fields = append(fields, zap.String("request_id", requestID))
	}

	// Add user ID if available
	if userID := GetUserIDFromContext(cl.ctx); userID != "" {
		fields = append(fields, zap.String("user_id", userID))
	}

	return fields
}

// Info logs a message at info level with context
func (cl *ContextLogger) Info(msg string, fields ...zap.Field) {
	contextFields := cl.getContextFields()
	allFields := append(contextFields, fields...)
	cl.logger.Info(msg, allFields...)
}

// Debug logs a message at debug level with context
func (cl *ContextLogger) Debug(msg string, fields ...zap.Field) {
	contextFields := cl.getContextFields()
	allFields := append(contextFields, fields...)
	cl.logger.Debug(msg, allFields...)
}

// Warn logs a message at warn level with context
func (cl *ContextLogger) Warn(msg string, fields ...zap.Field) {
	contextFields := cl.getContextFields()
	allFields := append(contextFields, fields...)
	cl.logger.Warn(msg, allFields...)
}

// Error logs a message at error level with context
func (cl *ContextLogger) Error(msg string, fields ...zap.Field) {
	contextFields := cl.getContextFields()
	allFields := append(contextFields, fields...)
	cl.logger.Error(msg, allFields...)
}

// Fatal logs a message at fatal level with context and exits
func (cl *ContextLogger) Fatal(msg string, fields ...zap.Field) {
	contextFields := cl.getContextFields()
	allFields := append(contextFields, fields...)
	cl.logger.Fatal(msg, allFields...)
}

// Convenience functions for common use cases

// InfoCtx logs an info message with context
func InfoCtx(ctx context.Context, msg string, fields ...zap.Field) {
	WithContext(ctx).Info(msg, fields...)
}

// DebugCtx logs a debug message with context
func DebugCtx(ctx context.Context, msg string, fields ...zap.Field) {
	WithContext(ctx).Debug(msg, fields...)
}

// WarnCtx logs a warn message with context
func WarnCtx(ctx context.Context, msg string, fields ...zap.Field) {
	WithContext(ctx).Warn(msg, fields...)
}

// ErrorCtx logs an error message with context
func ErrorCtx(ctx context.Context, msg string, fields ...zap.Field) {
	WithContext(ctx).Error(msg, fields...)
}

// FatalCtx logs a fatal message with context and exits
func FatalCtx(ctx context.Context, msg string, fields ...zap.Field) {
	WithContext(ctx).Fatal(msg, fields...)
}

// Business logic specific logging functions

// LogSceneOperation logs a scene-related operation
func LogSceneOperation(ctx context.Context, operation string, sceneID string, fields ...zap.Field) {
	allFields := append(fields, zap.String("operation", operation), zap.String("scene_id", sceneID))
	InfoCtx(ctx, "Scene operation", allFields...)
}

// LogAssetOperation logs an asset-related operation
func LogAssetOperation(ctx context.Context, operation string, assetID string, assetType string, fields ...zap.Field) {
	allFields := append(fields,
		zap.String("operation", operation),
		zap.String("asset_id", assetID),
		zap.String("asset_type", assetType),
	)
	InfoCtx(ctx, "Asset operation", allFields...)
}

// LogDatabaseOperation logs a database operation
func LogDatabaseOperation(ctx context.Context, operation string, collection string, fields ...zap.Field) {
	allFields := append(fields,
		zap.String("operation", operation),
		zap.String("collection", collection),
	)
	InfoCtx(ctx, "Database operation", allFields...)
}

// LogAIOperation logs an AI-related operation
func LogAIOperation(ctx context.Context, operation string, model string, fields ...zap.Field) {
	allFields := append(fields,
		zap.String("operation", operation),
		zap.String("model", model),
	)
	InfoCtx(ctx, "AI operation", allFields...)
}

// LogAuthOperation logs an authentication operation
func LogAuthOperation(ctx context.Context, operation string, userID string, fields ...zap.Field) {
	allFields := append(fields,
		zap.String("operation", operation),
		zap.String("user_id", userID),
	)
	InfoCtx(ctx, "Auth operation", allFields...)
}

// LogPerformance logs performance metrics
func LogPerformance(ctx context.Context, operation string, duration int64, fields ...zap.Field) {
	allFields := append(fields,
		zap.String("operation", operation),
		zap.Int64("duration_ms", duration),
	)
	InfoCtx(ctx, "Performance metric", allFields...)
}