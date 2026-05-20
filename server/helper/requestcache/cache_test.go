package requestcache_test

import (
	"context"
	"errors"
	"testing"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/helper/requestcache"
)

func TestWithFromRoundTrip(t *testing.T) {
	ctx := context.Background()
	if got := requestcache.From(ctx); got != nil {
		t.Fatalf("expected nil cache from bare context, got %v", got)
	}

	c := requestcache.New()
	ctx = requestcache.With(ctx, c)
	if got := requestcache.From(ctx); got != c {
		t.Fatalf("expected cache to round-trip through context")
	}
}

func TestGetOnNilCacheIsMiss(t *testing.T) {
	val, err, ok := requestcache.Get[string](nil, "anything")
	if ok || err != nil || val != "" {
		t.Fatalf("expected (zero, nil, false) from nil cache, got (%q, %v, %v)", val, err, ok)
	}
}

func TestPutInvalidateOnNilCacheIsNoOp(t *testing.T) {
	requestcache.Put[string](nil, "k", "v", nil)
	requestcache.Invalidate(nil, "k")
}

func TestPutGet(t *testing.T) {
	c := requestcache.New()
	requestcache.Put(c, "scene:abc", 42, nil)

	val, err, ok := requestcache.Get[int](c, "scene:abc")
	if !ok {
		t.Fatalf("expected hit")
	}
	if val != 42 || err != nil {
		t.Fatalf("got (%v, %v), want (42, nil)", val, err)
	}
}

func TestPutGetNotFound(t *testing.T) {
	c := requestcache.New()
	notFound := errors.New("not found")
	requestcache.Put[*string](c, "scene:abc", nil, notFound)

	val, err, ok := requestcache.Get[*string](c, "scene:abc")
	if !ok {
		t.Fatalf("expected hit")
	}
	if val != nil || !errors.Is(err, notFound) {
		t.Fatalf("got (%v, %v), want (nil, notFound)", val, err)
	}
}

func TestGetWrongTypeIsMiss(t *testing.T) {
	c := requestcache.New()
	requestcache.Put(c, "k", 42, nil)

	val, _, ok := requestcache.Get[string](c, "k")
	if ok || val != "" {
		t.Fatalf("expected miss when retrieving with wrong type, got (%q, %v)", val, ok)
	}
}

func TestInvalidate(t *testing.T) {
	c := requestcache.New()
	requestcache.Put(c, "scene:a", 1, nil)
	requestcache.Put(c, "scene:b", 2, nil)

	requestcache.Invalidate(c, "scene:a")

	if _, _, ok := requestcache.Get[int](c, "scene:a"); ok {
		t.Errorf("scene:a should be invalidated")
	}
	val, _, ok := requestcache.Get[int](c, "scene:b")
	if !ok || val != 2 {
		t.Errorf("scene:b should survive invalidation, got (%v, %v)", val, ok)
	}
}

func TestStatsSummaryNoActivity(t *testing.T) {
	c := requestcache.New()
	if got := c.StatsSummary(); got != "no cache activity" {
		t.Errorf("expected \"no cache activity\", got %q", got)
	}
}

func TestStatsSummaryTracksHitsAndMisses(t *testing.T) {
	c := requestcache.New()
	requestcache.Put(c, "scene:a", 1, nil)

	_, _, _ = requestcache.Get[int](c, "scene:a")      // hit
	_, _, _ = requestcache.Get[int](c, "scene:b")      // miss
	_, _, _ = requestcache.Get[int](c, "asset:x")      // miss
	requestcache.Invalidate(c, "scene:a")              // invalidation

	summary := c.StatsSummary()
	// Order is alphabetical by namespace, but just assert the key facts.
	if !contains(summary, "asset 0/1 hit") {
		t.Errorf("expected asset 0/1 hit in summary, got %q", summary)
	}
	if !contains(summary, "scene 1/2 hit (1 inv)") {
		t.Errorf("expected scene 1/2 hit (1 inv) in summary, got %q", summary)
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
