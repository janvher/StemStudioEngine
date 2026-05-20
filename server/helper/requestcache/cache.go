// Package requestcache provides a request-scoped, in-memory cache attached
// to context.Context. Repositories consult it on read methods to dedupe
// identical lookups within a single HTTP request, and clear entries on
// write methods. The cache lives only for the lifetime of one request —
// it is not a process-wide cache and has no TTL or eviction.
//
// Design: entries are keyed purely by object identity (typically
// "namespace:" + id). Row-exclusion filters (e.g., "only active assets",
// "exclude archived scenes") are applied by the caller *after* the cache
// lookup, not baked into the key. Repositories fetch unfiltered models
// from Mongo on cache misses, cache the full model keyed by id, and then
// post-filter the merged result. This keeps the cache shared across all
// filter variants within a request and makes "not found" unambiguous:
// a cached negative means "not in the collection," full stop.
package requestcache

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
)

// RequestCache is a per-request key/value store. The zero value is not
// usable; construct with New.
type RequestCache struct {
	mu    sync.RWMutex
	items map[string]any

	// Per-request counters, bucketed by namespace (the segment of the key
	// before the first ':'). Kept on a separate mutex so stats collection
	// does not block cache reads on the main RWMutex. Read once at end of
	// request for the per-request summary log. If/when we graduate to
	// OpenTelemetry counters, these become the source points.
	statsMu       sync.Mutex
	hits          map[string]int
	misses        map[string]int
	invalidations map[string]int
}

// New returns an empty cache ready to be attached to a request context.
func New() *RequestCache {
	return &RequestCache{
		items:         map[string]any{},
		hits:          map[string]int{},
		misses:        map[string]int{},
		invalidations: map[string]int{},
	}
}

type ctxKey struct{}

// With returns a child context with the cache attached.
func With(ctx context.Context, c *RequestCache) context.Context {
	return context.WithValue(ctx, ctxKey{}, c)
}

// From returns the cache attached to ctx, or nil if none is attached.
// Callers MUST treat a nil cache as "no caching" — every operation on a
// nil cache is a no-op or miss. This makes the cache safe to use from
// code paths that are sometimes invoked outside of an HTTP request.
func From(ctx context.Context) *RequestCache {
	if ctx == nil {
		return nil
	}
	c, _ := ctx.Value(ctxKey{}).(*RequestCache)
	return c
}

type entry[T any] struct {
	val T
	err error
}

// Get retrieves a cached entry by key. The returned bool reports whether
// the cache had an entry; when true, the caller MUST honor the returned
// (val, err) pair as if it had just performed the underlying lookup.
//
// If a cached entry exists but its stored value is not assignable to T
// (a programming error — different namespaces should use different keys),
// Get reports a miss.
func Get[T any](c *RequestCache, key string) (val T, err error, ok bool) {
	if c == nil {
		return val, nil, false
	}
	c.mu.RLock()
	raw, present := c.items[key]
	c.mu.RUnlock()
	if !present {
		c.recordMiss(key)
		return val, nil, false
	}
	e, typeOk := raw.(entry[T])
	if !typeOk {
		c.recordMiss(key)
		return val, nil, false
	}
	c.recordHit(key)
	return e.val, e.err, true
}

// Put stores (val, err) under key. Callers should only cache definitive
// results — successful lookups and "not found" responses. Transient
// errors (DB failures, timeouts) must NOT be cached, since the next
// caller in the same request might succeed.
func Put[T any](c *RequestCache, key string, val T, err error) {
	if c == nil {
		return
	}
	c.mu.Lock()
	c.items[key] = entry[T]{val: val, err: err}
	c.mu.Unlock()
}

// Invalidate removes the cache entry for key. Used by writers after a
// successful mutation so the next read in the same request re-fetches
// from the source of truth.
func Invalidate(c *RequestCache, key string) {
	if c == nil {
		return
	}
	c.mu.Lock()
	_, existed := c.items[key]
	if existed {
		delete(c.items, key)
	}
	c.mu.Unlock()
	c.recordInvalidation(key)
}

func namespaceOf(key string) string {
	for i := 0; i < len(key); i++ {
		if key[i] == ':' {
			return key[:i]
		}
	}
	return key
}

func (c *RequestCache) recordHit(key string) {
	c.statsMu.Lock()
	c.hits[namespaceOf(key)]++
	c.statsMu.Unlock()
}

func (c *RequestCache) recordMiss(key string) {
	c.statsMu.Lock()
	c.misses[namespaceOf(key)]++
	c.statsMu.Unlock()
}

func (c *RequestCache) recordInvalidation(key string) {
	c.statsMu.Lock()
	c.invalidations[namespaceOf(key)]++
	c.statsMu.Unlock()
}

// StatsSummary returns a human-readable one-line summary of cache
// activity for this request, e.g. `asset 6/9 hit (0 inv), scene 4/5 hit
// (0 inv)`. Emitted once per request by the middleware for visibility
// into cache effectiveness. Format is not stable — treat it as
// human-readable, not machine-parseable.
func (c *RequestCache) StatsSummary() string {
	if c == nil {
		return "no cache"
	}
	c.statsMu.Lock()
	defer c.statsMu.Unlock()

	namespaces := map[string]struct{}{}
	for ns := range c.hits {
		namespaces[ns] = struct{}{}
	}
	for ns := range c.misses {
		namespaces[ns] = struct{}{}
	}
	for ns := range c.invalidations {
		namespaces[ns] = struct{}{}
	}
	if len(namespaces) == 0 {
		return "no cache activity"
	}
	ordered := make([]string, 0, len(namespaces))
	for ns := range namespaces {
		ordered = append(ordered, ns)
	}
	sort.Strings(ordered)

	parts := make([]string, 0, len(ordered))
	for _, ns := range ordered {
		h := c.hits[ns]
		m := c.misses[ns]
		inv := c.invalidations[ns]
		total := h + m
		parts = append(parts, fmt.Sprintf("%s %d/%d hit (%d inv)", ns, h, total, inv))
	}
	return strings.Join(parts, ", ")
}
