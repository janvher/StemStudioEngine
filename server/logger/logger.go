package logger

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/buffer"
	"go.uber.org/zap/zapcore"
)

var (
	// Logger is the global structured logger instance
	Logger *zap.Logger
	// Sugar is the sugared logger for convenience
	Sugar *zap.SugaredLogger
)

// LogConfig represents the configuration for structured logging
type LogConfig struct {
	Level       string `toml:"level"`        // debug, info, warn, error
	Format      string `toml:"format"`       // json, console
	File        string `toml:"file"`         // log file path
	MaxSize     int    `toml:"max_size"`     // megabytes
	MaxBackups  int    `toml:"max_backups"`  // number of backup files
	MaxAge      int    `toml:"max_age"`      // days
	Compress    bool   `toml:"compress"`     // compress old files
	Development bool   `toml:"development"`  // development mode
}

// DefaultConfig returns the default logging configuration
func DefaultConfig() *LogConfig {
	return &LogConfig{
		Level:       "info",
		Format:      "json",
		File:        "./logs/stemstudio.log",
		MaxSize:     100, // 100MB
		MaxBackups:  3,
		MaxAge:      28, // 28 days
		Compress:    true,
		Development: false,
	}
}

// Initialize sets up the global logger with the provided configuration
func Initialize(config *LogConfig) error {
	if config == nil {
		config = DefaultConfig()
	}

	// Parse log level
	level, err := zapcore.ParseLevel(config.Level)
	if err != nil {
		level = zapcore.InfoLevel
	}

	// Configure core
	var core zapcore.Core

	if config.Development {
		// Development configuration: console output with color
		core = zapcore.NewCore(
			zapcore.NewConsoleEncoder(zapcore.EncoderConfig{
				TimeKey:        "timestamp",
				LevelKey:       "level",
				NameKey:        "logger",
				CallerKey:      "caller",
				MessageKey:     "message",
				StacktraceKey:  "stacktrace",
				LineEnding:     zapcore.DefaultLineEnding,
				EncodeLevel:    zapcore.CapitalColorLevelEncoder,
				EncodeTime:     zapcore.ISO8601TimeEncoder,
				EncodeDuration: zapcore.StringDurationEncoder,
				EncodeCaller:   zapcore.ShortCallerEncoder,
			}),
			zapcore.AddSync(os.Stdout),
			level,
		)
	} else {
		// Production configuration: file output
		encoder := getEncoder(config.Format)

		// Create file writer - ensure directory exists
		if config.File != "" {
			os.MkdirAll(filepath.Dir(config.File), 0755)

			file, err := os.OpenFile(config.File, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
			if err != nil {
				// Log the file error and fallback to stdout only
				fmt.Printf("Failed to open log file %s: %v, falling back to stdout only\n", config.File, err)
				core = zapcore.NewCore(encoder, zapcore.AddSync(os.Stdout), level)
			} else {
				// Create multi-writer (file and stdout)
				writer := zapcore.NewMultiWriteSyncer(
					zapcore.AddSync(file),
					zapcore.AddSync(os.Stdout),
				)
				core = zapcore.NewCore(encoder, writer, level)
				fmt.Printf("Structured logger writing to both file (%s) and stdout\n", config.File)
			}
		} else {
			// No file specified, use stdout only
			fmt.Printf("No log file specified, writing to stdout only\n")
			core = zapcore.NewCore(encoder, zapcore.AddSync(os.Stdout), level)
		}
	}

	// Build logger with options
	options := []zap.Option{
		zap.AddCaller(),
		zap.AddCallerSkip(1),
	}

	if config.Development {
		options = append(options, zap.Development())
		options = append(options, zap.AddStacktrace(zapcore.ErrorLevel))
	} else {
		options = append(options, zap.AddStacktrace(zapcore.FatalLevel))
	}

	Logger = zap.New(core, options...)
	Sugar = Logger.Sugar()

	return nil
}

// customEncoder implements zapcore.Encoder for our custom format
type customEncoder struct {
	zapcore.Encoder
}

// newCustomEncoder creates a new custom encoder
func newCustomEncoder() zapcore.Encoder {
	return &customEncoder{
		Encoder: zapcore.NewJSONEncoder(zapcore.EncoderConfig{
			TimeKey:        "timestamp",
			LevelKey:       "level",
			CallerKey:      "caller",
			MessageKey:     "message",
			LineEnding:     zapcore.DefaultLineEnding,
			EncodeLevel:    zapcore.CapitalLevelEncoder,
			EncodeTime:     zapcore.ISO8601TimeEncoder,
			EncodeCaller:   zapcore.ShortCallerEncoder,
		}),
	}
}

// EncodeEntry encodes an entry in our custom format
func (c *customEncoder) EncodeEntry(entry zapcore.Entry, fields []zapcore.Field) (*buffer.Buffer, error) {
	// Custom format: LEVEL | timestamp | caller | message with fields |

	// Build the message with fields
	message := entry.Message
	requestID := ""
	remoteAddr := ""
	method := ""
	path := ""
	status := ""

	// Extract common fields
	additionalFields := make(map[string]string)
	for _, field := range fields {
		switch field.Key {
		case "request_id":
			requestID = field.String
		case "remote_addr":
			remoteAddr = field.String
		case "method":
			method = field.String
		case "path":
			path = field.String
		case "status":
			status = fmt.Sprintf("%d", field.Integer)
		default:
			// Capture all other fields
			switch field.Type {
			case zapcore.StringType:
				additionalFields[field.Key] = field.String
			case zapcore.Int64Type, zapcore.Int32Type, zapcore.Int16Type, zapcore.Int8Type:
				additionalFields[field.Key] = fmt.Sprintf("%d", field.Integer)
			case zapcore.BoolType:
				additionalFields[field.Key] = fmt.Sprintf("%t", field.Integer == 1)
			case zapcore.ErrorType:
				if field.Interface != nil {
					additionalFields[field.Key] = fmt.Sprintf("%v", field.Interface)
				}
			}
		}
	}

	// Format timestamp
	timestamp := entry.Time.Format("2006-01-02T15:04:05.000Z")

	// Format caller
	caller := entry.Caller.TrimmedPath()

	var customLog string
	if requestID != "" && remoteAddr != "" && method != "" && path != "" {
		// This looks like an HTTP request log
		if status != "" {
			// Request completion log
			customLog = fmt.Sprintf("%s | %s | %s | request: %s| %s | %s | %s | %s | %s |",
				entry.Level.CapitalString(),
				timestamp,
				caller,
				requestID,
				remoteAddr,
				method,
				path,
				status,
				message,
			)
		} else {
			// Request start log
			customLog = fmt.Sprintf("%s | %s | %s | request: %s| %s | %s | %s | %s |",
				entry.Level.CapitalString(),
				timestamp,
				caller,
				requestID,
				remoteAddr,
				method,
				path,
				message,
			)
		}
	} else {
		// Regular log message
		customLog = fmt.Sprintf("%s | %s | %s | %s |",
			entry.Level.CapitalString(),
			timestamp,
			caller,
			message,
		)
	}

	// Append additional fields if any
	if len(additionalFields) > 0 {
		for key, value := range additionalFields {
			customLog += fmt.Sprintf(" %s=%s |", key, value)
		}
	}

	buf := buffer.NewPool().Get()
	buf.AppendString(customLog)
	buf.AppendString("\n")
	return buf, nil
}

// getEncoder returns the appropriate encoder based on format
func getEncoder(format string) zapcore.Encoder {
	// Always use our custom encoder for consistent formatting
	return newCustomEncoder()
}

// Sync flushes any buffered log entries
func Sync() {
	if Logger != nil {
		Logger.Sync()
	}
}

// Fields creates structured log fields
func Fields(fields ...zap.Field) []zap.Field {
	return fields
}

// String creates a string field
func String(key, value string) zap.Field {
	return zap.String(key, value)
}

// Int creates an int field
func Int(key string, value int) zap.Field {
	return zap.Int(key, value)
}

// Int64 creates an int64 field
func Int64(key string, value int64) zap.Field {
	return zap.Int64(key, value)
}

// Duration creates a duration field
func Duration(key string, value interface{}) zap.Field {
	switch v := value.(type) {
	case int64:
		return zap.Duration(key, time.Duration(v))
	case time.Duration:
		return zap.Duration(key, v)
	default:
		return zap.String(key, "invalid_duration")
	}
}

// Error creates an error field
func Error(err error) zap.Field {
	return zap.Error(err)
}

// Bool creates a boolean field
func Bool(key string, value bool) zap.Field {
	return zap.Bool(key, value)
}

// Any creates a field that can hold any value
func Any(key string, value interface{}) zap.Field {
	return zap.Any(key, value)
}

// GetLogger returns the global logger instance
func GetLogger() *zap.Logger {
	if Logger == nil {
		// Fallback to a default logger if not initialized
		Logger, _ = zap.NewProduction()
		Sugar = Logger.Sugar()
	}
	return Logger
}

// GetSugar returns the global sugared logger instance
func GetSugar() *zap.SugaredLogger {
	if Sugar == nil {
		GetLogger() // This will initialize both Logger and Sugar
	}
	return Sugar
}