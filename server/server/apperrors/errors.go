package apperrors

import (
	"errors"
	"fmt"
	"io"
	"net/http"
)

// Application errors.
var (
	ErrBadRequest = errors.New("bad request")
	ErrConflict   = errors.New("conflict")
	ErrForbidden  = errors.New("forbidden")
	ErrNetwork    = errors.New("network error")
	ErrNoChanges  = errors.New("no changes")
	ErrNotFound   = errors.New("not found")
	ErrTimeout    = errors.New("timeout")
)

// HTTP error that wraps a standard error with an HTTP status code.
type HTTPError struct {
	StatusCode int
	Body       string
	Err        error
}

func (e *HTTPError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("HTTP %d: %v; body=%s", e.StatusCode, e.Err, e.Body)
	}
	return fmt.Sprintf("HTTP %d; body=%s", e.StatusCode, e.Body)
}

func (e *HTTPError) Unwrap() error {
	return e.Err
}

// MapHTTPError standardizes errors from http.Client.Get() calls.
// Pass both resp and err exactly as returned by httpClient.Get().
func MapHTTPError(resp *http.Response, err error) error {
	// HTTP response available
	if resp != nil && (resp.StatusCode < 200 || resp.StatusCode >= 300) {
		defer resp.Body.Close()

		bodyBytes, _ := io.ReadAll(resp.Body)
		bodyStr := string(bodyBytes)

		return &HTTPError{
			StatusCode: resp.StatusCode,
			Body:       bodyStr,
			Err:        err,
		}
	}

	// SDK/network error
	if err != nil {
		return fmt.Errorf("request error: %w", err)
	}

	return nil
}
