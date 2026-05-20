//go:build oss

package userlimits

import "net/http"

// RequireCopilot is a no-op in OSS. Provider access is controlled by BYOK keys.
func RequireCopilot(_ *http.Request) error {
	return nil
}

// ConsumeCopilot is a no-op in OSS. There is no hosted credit ledger.
func ConsumeCopilot(_ *http.Request, _ int) error {
	return nil
}

// Require3D is a no-op in OSS. Provider access is controlled by BYOK keys.
func Require3D(_ *http.Request) error {
	return nil
}

// Consume3D is a no-op in OSS. There is no hosted credit ledger.
func Consume3D(_ *http.Request, _ int) error {
	return nil
}

// RequireAICredits is a no-op in OSS. Provider access is controlled by BYOK keys.
func RequireAICredits(_ *http.Request, _ int) error {
	return nil
}

// ConsumeAICredits is a no-op in OSS. There is no hosted credit ledger.
func ConsumeAICredits(_ *http.Request, _ int) error {
	return nil
}
