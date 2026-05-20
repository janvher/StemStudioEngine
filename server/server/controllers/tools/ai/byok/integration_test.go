package byok

import (
	"net/http"
	"testing"
)

// TestBYOKHeaderEndToEnd simulates the full server-side BYOK flow: a request
// arrives with X-BYOK-Key / X-BYOK-Provider headers, the handler resolves
// the key via ResolveFromRequest, and the result matches what helpers like
// NewClaudeClientWithKey expect.
//
// This is a unit test against the byok package directly — it doesn't spin up
// the HTTP server. The contract it verifies is "a handler that extracts the
// BYOK key from the request gets the same key that a NewXClientWithKey
// constructor would resolve when given that key as a fallback."
func TestBYOKHeaderEndToEnd(t *testing.T) {
	t.Setenv("CLAUDE_API_KEY", "")
	t.Setenv("ANTHROPIC_API_KEY", "")

	req, _ := http.NewRequest(http.MethodPost, "/api/AI/Agent", nil)
	req.Header.Set("X-BYOK-Key", "user-key-from-editor")
	req.Header.Set("X-BYOK-Provider", "anthropic")

	resolved, source := ResolveFromRequest(req, "anthropic", ProviderEnvVars("anthropic")...)

	if resolved != "user-key-from-editor" {
		t.Errorf("expected user-key-from-editor end-to-end, got %q", resolved)
	}
	if source != "byok-header" {
		t.Errorf("expected source=byok-header, got %q", source)
	}
}

// TestBYOKSessionFallbackAfterConfigure simulates the OSS flow:
//  1. User submits a key via POST /api/AI/ConfigureKeys → sessionStore.set.
//  2. Subsequent request has no X-BYOK-Key header.
//  3. Provider helper still resolves the stored session key.
func TestBYOKSessionFallbackAfterConfigure(t *testing.T) {
	t.Setenv("CLAUDE_API_KEY", "")
	t.Setenv("ANTHROPIC_API_KEY", "")

	// Step 1: configure-keys handler stored the key.
	sessionStore.set("anthropic", "configured-session-key")
	t.Cleanup(func() { sessionStore.set("anthropic", "") })

	// Step 2: bare request, no BYOK headers. ResolveFromRequest does the
	// full env → header → session resolution in one call (this is the actual
	// production path — handlers don't double-resolve).
	req, _ := http.NewRequest(http.MethodPost, "/api/AI/Agent", nil)
	resolved, source := ResolveFromRequest(req, "anthropic", ProviderEnvVars("anthropic")...)

	if resolved != "configured-session-key" {
		t.Errorf("expected configured-session-key, got %q", resolved)
	}
	if source != "byok-session" {
		t.Errorf("expected source=byok-session, got %q", source)
	}
}

// TestBYOKHeaderTrumpsSessionWhenBothPresent verifies that a per-request
// header beats the stored session key — useful for users who want to switch
// providers mid-session without re-running ConfigureKeys.
func TestBYOKHeaderTrumpsSessionWhenBothPresent(t *testing.T) {
	t.Setenv("CLAUDE_API_KEY", "")
	t.Setenv("ANTHROPIC_API_KEY", "")

	sessionStore.set("anthropic", "old-session-key")
	t.Cleanup(func() { sessionStore.set("anthropic", "") })

	req, _ := http.NewRequest(http.MethodPost, "/api/AI/Agent", nil)
	req.Header.Set("X-BYOK-Key", "fresh-header-key")
	req.Header.Set("X-BYOK-Provider", "anthropic")

	resolved, source := ResolveFromRequest(req, "anthropic", ProviderEnvVars("anthropic")...)

	if resolved != "fresh-header-key" {
		t.Errorf("expected fresh-header-key, got %q", resolved)
	}
	if source != "byok-header" {
		t.Errorf("expected source=byok-header, got %q", source)
	}
}
