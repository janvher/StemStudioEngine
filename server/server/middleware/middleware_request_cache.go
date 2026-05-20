package middleware

import (
	"net/http"

	"go.uber.org/zap"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/helper/requestcache"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/logger"
)

// RequestCacheMiddleware attaches a fresh request-scoped cache to every
// request's context. Repositories use it to dedupe identical reads and
// invalidate on writes within a single request. The cache is per-request
// and discarded when the request completes; it has no TTL or process-wide
// state.
//
// After the handler runs, a structured log line summarizes cache
// activity (hits/misses/invalidations per namespace). Requests that
// didn't touch the cache (static file serves, health checks, etc.) are
// skipped so the log stays signal-dense. When we eventually add OTel
// counters this log line can go away.
func RequestCacheMiddleware(w http.ResponseWriter, r *http.Request, next http.HandlerFunc) {
	cache := requestcache.New()
	ctx := requestcache.With(r.Context(), cache)
	next.ServeHTTP(w, r.WithContext(ctx))

	summary := cache.StatsSummary()
	if summary == "no cache activity" {
		return
	}
	logger.GetLogger().Info("requestcache",
		zap.String("method", r.Method),
		zap.String("path", r.URL.Path),
		zap.String("summary", summary),
	)
}
