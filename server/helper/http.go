package helper

import (
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/apperrors"
)

// globalConfig holds a reference to the current config for use in helper functions
var globalConfig *ConfigModel

// SetGlobalConfig sets the global config reference
func SetGlobalConfig(config *ConfigModel) {
	globalConfig = config
}

// GetGlobalConfig returns the global config reference
func GetGlobalConfig() *ConfigModel {
	return globalConfig
}

// EnableCrossDomain sets the `Access-Control-Allow-Methods` header and the
// `Access-Control-Allow-Origin` header to the response to enable cross domain.
//
// TODO: We should restrict the origin, and may set in `config.toml`.
func EnableCrossDomain(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if origin == "" { // not cross origin
		return
	}

	header := w.Header()
	header.Set("Access-Control-Allow-Methods", "OPTIONS,POST,GET")
	header.Set("Access-Control-Allow-Origin", origin)

	// Set keep-alive header if server keep-alive is enabled
	if config := GetGlobalConfig(); config != nil && config.Server.KeepAliveEnabled {
		header.Set("Connection", "keep-alive")
	}
}

// Get create a get ajax to the server.
func Get(url string) ([]byte, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("http status: %v %v", resp.StatusCode, resp.Status)
	}
	defer resp.Body.Close()
	return ioutil.ReadAll(resp.Body)
}

// Post create a post ajax to the server.
func Post(url string, data url.Values) ([]byte, error) {
	resp, err := http.PostForm(url, data)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("http status: %v %v", resp.StatusCode, resp.Status)
	}
	defer resp.Body.Close()
	return ioutil.ReadAll(resp.Body)
}

// Write write a string response to the web client.
func Write(w http.ResponseWriter, args ...interface{}) (int, error) {
	header := w.Header()

	header.Set("Content-Type", "text/plain")
	header.Set("Cache-Control", "no-cache, no-store, must-revalidate")
	header.Set("Pragma", "no-cache")
	header.Set("Expires", "0")

	// Set keep-alive header if server keep-alive is enabled
	if config := GetGlobalConfig(); config != nil && config.Server.KeepAliveEnabled {
		header.Set("Connection", "keep-alive")
	}

	return w.Write([]byte(fmt.Sprint(args...)))
}

// Writef write a string response to the web client with format string.
func Writef(w http.ResponseWriter, format string, args ...interface{}) (int, error) {
	header := w.Header()

	header.Set("Content-Type", "text/plain")
	header.Set("Cache-Control", "no-cache, no-store, must-revalidate")
	header.Set("Pragma", "no-cache")
	header.Set("Expires", "0")

	// Set keep-alive header if server keep-alive is enabled
	if config := GetGlobalConfig(); config != nil && config.Server.KeepAliveEnabled {
		header.Set("Connection", "keep-alive")
	}

	return w.Write([]byte(fmt.Sprint(args...)))
}

// WriteJSON write a json response to the web client.
func WriteJSON(w http.ResponseWriter, obj interface{}, statusCode ...int) {
	header := w.Header()

	header.Set("Content-Type", "application/json")
	header.Set("Cache-Control", "no-cache, no-store, must-revalidate")
	header.Set("Pragma", "no-cache")
	header.Set("Expires", "0")

	// Set keep-alive header if server keep-alive is enabled
	if config := GetGlobalConfig(); config != nil && config.Server.KeepAliveEnabled {
		header.Set("Connection", "keep-alive")
	}

	// Set the status code if specified
	if len(statusCode) > 0 {
		code := statusCode[0]
		w.WriteHeader(code)
	}

	bytes, err := ToJSON(obj)
	if err != nil {
		return
	}

	_, _ = w.Write(bytes)
}

// WriteJSONWithCache write a cacheable JSON response with ETag support.
func WriteJSONWithCache(w http.ResponseWriter, obj interface{}, etag string, maxAge int) {
	header := w.Header()

	header.Set("Content-Type", "application/json")

	if etag != "" {
		header.Set("ETag", etag)
	}

	if maxAge > 0 {
		header.Set("Cache-Control", fmt.Sprintf("public, max-age=%d, must-revalidate", maxAge))
	} else {
		header.Set("Cache-Control", "public, must-revalidate")
	}

	bytes, err := ToJSON(obj)
	if err != nil {
		return
	}

	_, _ = w.Write(bytes)
}

// WriteFileContent write file content with appropriate cache headers.
func WriteFileContent(w http.ResponseWriter, contentType string, content []byte, etag string, maxAge int) {
	header := w.Header()

	header.Set("Content-Type", contentType)

	if etag != "" {
		header.Set("ETag", etag)
	}

	if maxAge > 0 {
		header.Set("Cache-Control", fmt.Sprintf("public, max-age=%d, must-revalidate", maxAge))
	} else {
		header.Set("Cache-Control", "public, must-revalidate")
	}

	_, _ = w.Write(content)
}

type ErrorResponse struct {
	Msg string `json:"msg"`
}

func NewErrorResponse(msg string) ErrorResponse {
	return ErrorResponse{
		Msg: msg,
	}
}

func WriteError(w http.ResponseWriter, err error) {
	if err == nil {
		return
	}

	// Log the full error with context
	log.Printf("Error: %v", err)

	// Map known sentinel errors to HTTP responses
	switch {
	case errors.Is(err, apperrors.ErrBadRequest):
		WriteJSON(w, NewErrorResponse("Bad request."), http.StatusBadRequest)
	case errors.Is(err, apperrors.ErrConflict):
		WriteJSON(w, NewErrorResponse("Conflict."), http.StatusConflict)
	case errors.Is(err, apperrors.ErrForbidden):
		WriteJSON(w, NewErrorResponse("Forbidden."), http.StatusForbidden)
	case errors.Is(err, apperrors.ErrNoChanges):
		WriteJSON(w, NewErrorResponse("No changes."), http.StatusBadRequest)
	case errors.Is(err, apperrors.ErrNotFound):
		WriteJSON(w, NewErrorResponse("Not found."), http.StatusNotFound)
	default:
		// Fallback for any other errors
		WriteJSON(w, NewErrorResponse("An internal error occurred."), http.StatusInternalServerError)
	}
}
