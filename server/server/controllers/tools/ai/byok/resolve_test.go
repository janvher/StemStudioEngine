package byok

import (
	"net/http"
	"testing"
)

// TestLookupKeyEnvWinsOverHeader verifies env-supplied keys always win over a
// per-request BYOK header. This is the safety property that prevents one
// user in a multi-tenant integrated deployment from overriding another
// user's keys.
func TestLookupKeyEnvWinsOverHeader(t *testing.T) {
	t.Setenv("TEST_ENV_KEY", "env-value")

	got, source := LookupKey("anthropic", []string{"TEST_ENV_KEY"}, "header-value")

	if got != "env-value" {
		t.Errorf("expected env-value, got %q", got)
	}
	if source != "env" {
		t.Errorf("expected source=env, got %q", source)
	}
}

// TestLookupKeyHeaderUsedWhenEnvEmpty verifies the per-request BYOK header
// takes effect when no env var is set.
func TestLookupKeyHeaderUsedWhenEnvEmpty(t *testing.T) {
	t.Setenv("UNUSED_TEST_KEY", "")

	got, source := LookupKey("openai", []string{"UNUSED_TEST_KEY"}, "header-value")

	if got != "header-value" {
		t.Errorf("expected header-value, got %q", got)
	}
	if source != "byok-header" {
		t.Errorf("expected source=byok-header, got %q", source)
	}
}

// TestLookupKeySessionFallback verifies the session store is consulted when
// both env and header are empty.
func TestLookupKeySessionFallback(t *testing.T) {
	t.Setenv("UNUSED_TEST_KEY", "")

	sessionStore.set("meshy", "session-value")
	t.Cleanup(func() { sessionStore.set("meshy", "") })

	got, source := LookupKey("meshy", []string{"UNUSED_TEST_KEY"}, "")

	if got != "session-value" {
		t.Errorf("expected session-value, got %q", got)
	}
	if source != "byok-session" {
		t.Errorf("expected source=byok-session, got %q", source)
	}
}

// TestLookupKeyEmptyWhenNoneSet verifies the function returns ("", "") when
// no key is found anywhere — used by callers to detect missing keys.
func TestLookupKeyEmptyWhenNoneSet(t *testing.T) {
	t.Setenv("UNUSED_TEST_KEY_A", "")
	t.Setenv("UNUSED_TEST_KEY_B", "")

	got, source := LookupKey("gemini", []string{"UNUSED_TEST_KEY_A", "UNUSED_TEST_KEY_B"}, "")

	if got != "" {
		t.Errorf("expected empty, got %q", got)
	}
	if source != "" {
		t.Errorf("expected empty source, got %q", source)
	}
}

// TestLookupKeyFirstEnvVarWins verifies that when multiple env vars are
// passed, the first one set wins.
func TestLookupKeyFirstEnvVarWins(t *testing.T) {
	t.Setenv("FIRST_KEY", "first")
	t.Setenv("SECOND_KEY", "second")

	got, _ := LookupKey("anthropic", []string{"FIRST_KEY", "SECOND_KEY"}, "")

	if got != "first" {
		t.Errorf("expected first, got %q", got)
	}
}

// TestResolveFromRequestPicksUpHeaders verifies that the request-aware helper
// pulls X-BYOK-Key when X-BYOK-Provider matches the target provider.
func TestResolveFromRequestPicksUpHeaders(t *testing.T) {
	t.Setenv("UNUSED_TEST_KEY", "")

	req, _ := http.NewRequest(http.MethodPost, "/api/AI/Agent", nil)
	req.Header.Set("X-BYOK-Key", "header-key")
	req.Header.Set("X-BYOK-Provider", "anthropic")

	got, source := ResolveFromRequest(req, "anthropic", "UNUSED_TEST_KEY")

	if got != "header-key" {
		t.Errorf("expected header-key, got %q", got)
	}
	if source != "byok-header" {
		t.Errorf("expected source=byok-header, got %q", source)
	}
}

// TestResolveFromRequestIgnoresWrongProvider verifies the BYOK header is
// only consumed when the X-BYOK-Provider matches the target provider —
// prevents one provider's key from being misused for another.
func TestResolveFromRequestIgnoresWrongProvider(t *testing.T) {
	t.Setenv("UNUSED_TEST_KEY", "")

	req, _ := http.NewRequest(http.MethodPost, "/api/AI/Agent", nil)
	req.Header.Set("X-BYOK-Key", "openai-key")
	req.Header.Set("X-BYOK-Provider", "openai")

	got, source := ResolveFromRequest(req, "anthropic", "UNUSED_TEST_KEY")

	if got != "" {
		t.Errorf("expected empty when provider mismatch, got %q", got)
	}
	if source != "" {
		t.Errorf("expected empty source, got %q", source)
	}
}

// TestResolveFromRequestUsesHeaderWhenNoProviderHint accepts X-BYOK-Key when
// X-BYOK-Provider is absent (caller-side simplification — the editor can
// send a single key without specifying a provider, and the server treats
// it as applying to whichever provider the request targets).
func TestResolveFromRequestUsesHeaderWhenNoProviderHint(t *testing.T) {
	t.Setenv("UNUSED_TEST_KEY", "")

	req, _ := http.NewRequest(http.MethodPost, "/api/AI/Agent", nil)
	req.Header.Set("X-BYOK-Key", "any-key")

	got, source := ResolveFromRequest(req, "elevenlabs", "UNUSED_TEST_KEY")

	if got != "any-key" {
		t.Errorf("expected any-key, got %q", got)
	}
	if source != "byok-header" {
		t.Errorf("expected source=byok-header, got %q", source)
	}
}

// TestProviderEnvVarsReturnsRegisteredVars confirms the helper exposes the
// env-var list for a registered provider in deterministic order.
func TestProviderEnvVarsReturnsRegisteredVars(t *testing.T) {
	vars := ProviderEnvVars("anthropic")
	if len(vars) != 2 || vars[0] != "CLAUDE_API_KEY" || vars[1] != "ANTHROPIC_API_KEY" {
		t.Errorf("unexpected env vars for anthropic: %v", vars)
	}

	// Unknown providers return nil so callers can detect typos.
	if got := ProviderEnvVars("does-not-exist"); got != nil {
		t.Errorf("expected nil for unknown provider, got %v", got)
	}
}
