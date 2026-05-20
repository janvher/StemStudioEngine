package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestOSSAuthAcceptsDummyToken verifies the ai-server single-user auth
// shortcut: requests carrying the constant `stemstudio-token` pass through
// without Firebase verification and the dummy local-user identity is
// injected into the request context for downstream handlers.
func TestOSSAuthAcceptsDummyToken(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/AI/Agent", nil)
	req.Header.Set("Authorization", "Bearer stemstudio-token")
	rec := httptest.NewRecorder()

	called := false
	next := func(w http.ResponseWriter, r *http.Request) {
		called = true
		params, ok := r.Context().Value("auth_params").(map[string]interface{})
		if !ok || params == nil {
			t.Fatal("expected auth_params in request context")
		}
		token, ok := params["token"].(*ossLocalIdentity)
		if !ok || token.UID != "stemstudio-local-user" {
			t.Errorf("expected dummy UID stemstudio-local-user, got %#v", params["token"])
		}
		if !params["isAdmin"].(bool) {
			t.Error("expected isAdmin=true for OSS local user")
		}
		w.WriteHeader(http.StatusOK)
	}

	ossAuthMiddleware(rec, req, next)

	if !called {
		t.Errorf("expected handler call, got status %d", rec.Code)
	}
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}

// TestOSSAuthRejectsWrongToken verifies that arbitrary tokens don't grant
// access — only the literal `stemstudio-token` passes.
func TestOSSAuthRejectsWrongToken(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/AI/Agent", nil)
	req.Header.Set("Authorization", "Bearer some-other-token-12345")
	rec := httptest.NewRecorder()

	called := false
	next := func(w http.ResponseWriter, r *http.Request) { called = true }

	ossAuthMiddleware(rec, req, next)

	if called {
		t.Error("wrong token must not reach the handler")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

// TestOSSAuthRejectsMissingToken verifies that a request with no
// Authorization header is rejected (the dummy-token check must be explicit
// — empty != dummy).
func TestOSSAuthRejectsMissingToken(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/AI/Agent", nil)
	rec := httptest.NewRecorder()

	called := false
	next := func(w http.ResponseWriter, r *http.Request) { called = true }

	ossAuthMiddleware(rec, req, next)

	if called {
		t.Error("missing token must not reach the handler")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

// TestOSSAuthBypassesPublicRoutes verifies constants.None routes keep the
// same unauthenticated semantics as the combined server. Docker health checks
// and the AI capability endpoint rely on this.
func TestOSSAuthBypassesPublicRoutes(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()

	called := false
	next := func(w http.ResponseWriter, r *http.Request) {
		called = true
		if r.Context().Value("auth_params") != nil {
			t.Fatal("public routes must not receive dummy auth_params")
		}
		w.WriteHeader(http.StatusOK)
	}

	ossAuthMiddleware(rec, req, next)

	if !called {
		t.Errorf("expected public route to reach handler, got status %d", rec.Code)
	}
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}
