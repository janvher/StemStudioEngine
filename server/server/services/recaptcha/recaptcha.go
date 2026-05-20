package recaptcha

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
)

type Response struct {
	Success bool     `json:"success"`
	Score   float64  `json:"score"`
	Action  string   `json:"action"`
	Errors  []string `json:"error-codes"`
}

// Verify validates a reCAPTCHA v3 token with Google.
// Missing RECAPTCHA_SECRET_KEY keeps local/dev environments fail-open.
func Verify(token string, expectedAction string) error {
	secretKey := os.Getenv("RECAPTCHA_SECRET_KEY")
	if secretKey == "" {
		return nil
	}

	if token == "" {
		return fmt.Errorf("reCAPTCHA token is required")
	}

	resp, err := http.PostForm("https://www.google.com/recaptcha/api/siteverify", url.Values{
		"secret":   {secretKey},
		"response": {token},
	})
	if err != nil {
		return fmt.Errorf("failed to verify reCAPTCHA: %w", err)
	}
	defer resp.Body.Close()

	var result Response
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("failed to decode reCAPTCHA response: %w", err)
	}

	if !result.Success {
		return fmt.Errorf("reCAPTCHA verification failed")
	}

	if expectedAction != "" && result.Action != expectedAction {
		return fmt.Errorf("reCAPTCHA action mismatch")
	}

	if result.Score < 0.5 {
		return fmt.Errorf("reCAPTCHA score too low: %.2f", result.Score)
	}

	return nil
}
