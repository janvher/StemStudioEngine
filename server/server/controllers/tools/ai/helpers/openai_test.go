package helpers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func withOpenAITestServer(t *testing.T, handler http.HandlerFunc) string {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)

	previousImageEndpoint := openAIImageGenerationEndpoint
	previousWhisperEndpoint := openAIWhisperEndpoint
	previousClient := openAIHTTPClient
	openAIImageGenerationEndpoint = server.URL
	openAIWhisperEndpoint = server.URL
	openAIHTTPClient = server.Client()
	t.Cleanup(func() {
		openAIImageGenerationEndpoint = previousImageEndpoint
		openAIWhisperEndpoint = previousWhisperEndpoint
		openAIHTTPClient = previousClient
	})

	return server.URL
}

func TestOpenAIImageGenerationUsesBYOKKey(t *testing.T) {
	t.Setenv("OPENAI_API_KEY", "")

	withOpenAITestServer(t, func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "Bearer sk-byok-image" {
			t.Fatalf("Authorization=%q, want BYOK key", got)
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if body["size"] != "1792x1024" {
			t.Fatalf("size=%v, want 1792x1024", body["size"])
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":[{"b64_json":"image-b64"}]}`))
	})

	client, err := NewOpenAIClientWithKey("sk-byok-image")
	if err != nil {
		t.Fatalf("NewOpenAIClientWithKey: %v", err)
	}

	got, err := client.GenerateImageWithSize(context.Background(), "banner", "1792x1024")
	if err != nil {
		t.Fatalf("GenerateImageWithSize: %v", err)
	}
	if got != "image-b64" {
		t.Fatalf("got %q, want image-b64", got)
	}
}

func TestTranscribeAudioUsesBYOKKey(t *testing.T) {
	t.Setenv("OPENAI_API_KEY", "")

	withOpenAITestServer(t, func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "Bearer sk-byok-audio" {
			t.Fatalf("Authorization=%q, want BYOK key", got)
		}
		if contentType := r.Header.Get("Content-Type"); !strings.HasPrefix(contentType, "multipart/form-data") {
			t.Fatalf("Content-Type=%q, want multipart/form-data", contentType)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"text":"transcribed"}`))
	})

	got, err := TranscribeAudioWithKey(strings.NewReader("audio bytes"), "sk-byok-audio")
	if err != nil {
		t.Fatalf("TranscribeAudioWithKey: %v", err)
	}
	if got != "transcribed" {
		t.Fatalf("got %q, want transcribed", got)
	}
}
