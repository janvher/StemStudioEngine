package helper

import (
	"fmt"
	"os"
	"path/filepath"

	"go.uber.org/zap"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/logger"
)

// InitializeLogger initializes the structured zap logger and returns a
// *zap.SugaredLogger for consumers that prefer the printf-style API. The
// previously-returned *logrus.Logger was removed on 2026-04-22 as part of
// the dependency-reduction pass — zap's SugaredLogger exposes the same
// Infof/Errorf/Warnf/Debugf/Info/Error/Warn methods that call sites already
// use, so this swap is a type-level change without behavior differences.
func InitializeLogger(config *ConfigModel) *zap.SugaredLogger {
	logConfig := &logger.LogConfig{
		Level:       config.Log.Level,
		Format:      config.Log.Format,
		File:        config.Log.File,
		MaxSize:     config.Log.MaxSize,
		MaxBackups:  config.Log.MaxBackups,
		MaxAge:      config.Log.MaxAge,
		Compress:    config.Log.Compress,
		Development: config.Log.Development,
	}

	// Set defaults if not specified - prioritize environment variable over config file
	if envLevel := os.Getenv("LOG_LEVEL"); envLevel != "" {
		logConfig.Level = envLevel
	} else if logConfig.Level == "" {
		logConfig.Level = "info"
	}
	if logConfig.Format == "" {
		logConfig.Format = "console"
	}
	if logConfig.File == "" {
		logConfig.File = "./logs/stemstudio.log"
	}

	fmt.Printf("Initializing logger with config: level=%s, format=%s, file=%s, development=%v\n",
		logConfig.Level, logConfig.Format, logConfig.File, logConfig.Development)

	if err := logger.Initialize(logConfig); err != nil {
		fmt.Printf("Failed to initialize structured logger: %v\n", err)
	} else {
		fmt.Printf("Structured logger initialized successfully\n")
		logger.GetLogger().Info("Structured logger initialized successfully",
			logger.String("level", logConfig.Level),
			logger.String("format", logConfig.Format),
			logger.String("file", logConfig.File),
			logger.Bool("development", logConfig.Development),
		)
	}

	dir := filepath.Dir(config.Log.File)
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		os.MkdirAll(dir, 0755)
	}

	return logger.Sugar
}
