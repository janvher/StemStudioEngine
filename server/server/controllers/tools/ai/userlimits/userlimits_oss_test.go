//go:build oss

package userlimits

import (
	"net/http/httptest"
	"testing"
)

func TestOSSLimitsAreNoop(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/AI/Assistant", nil)

	checks := []struct {
		name string
		fn   func() error
	}{
		{name: "require copilot", fn: func() error { return RequireCopilot(req) }},
		{name: "consume copilot", fn: func() error { return ConsumeCopilot(req, 1) }},
		{name: "require 3d", fn: func() error { return Require3D(req) }},
		{name: "consume 3d", fn: func() error { return Consume3D(req, 1) }},
		{name: "require ai credits", fn: func() error { return RequireAICredits(req, 10) }},
		{name: "consume ai credits", fn: func() error { return ConsumeAICredits(req, 10) }},
	}

	for _, tt := range checks {
		t.Run(tt.name, func(t *testing.T) {
			if err := tt.fn(); err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
		})
	}
}
