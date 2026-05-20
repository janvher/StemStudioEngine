//go:build integration
// +build integration

package middleware

import (
	"bytes"
	"compress/gzip"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/andybalholm/brotli"
)

func TestCompressionMiddleware_BrotliResponse(t *testing.T) {
	// Create a response larger than 100 bytes
	largeResponse := strings.Repeat("Hello, Brotli world! ", 20) // ~400 bytes
	handler := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte(largeResponse))
	}

	// Test server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		CompressionMiddleware(w, r, handler)
	}))
	defer ts.Close()

	// Create request with brotli accept encoding
	req, err := http.NewRequest("GET", ts.URL, nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Accept-Encoding", "br")

	// Get response with compression disabled for testing
	tr := &http.Transport{
		DisableCompression: true,
	}
	client := &http.Client{Transport: tr}
	resp, err := client.Do(req)
	if err != nil {
		t.Error(err)
		return
	}
	defer resp.Body.Close()

	// Check header - should be compressed with brotli
	contentEncodingHeader := resp.Header.Get("Content-Encoding")
	if contentEncodingHeader != "br" {
		t.Errorf("Content-Encoding should be 'br' for brotli response, got %v", contentEncodingHeader)
	}

	// Check body - decompress and verify
	reader := brotli.NewReader(resp.Body)
	bodyBytes, err := io.ReadAll(reader)
	if err != nil {
		t.Error(err)
	}
	bodyStr := string(bodyBytes)
	if bodyStr != largeResponse {
		t.Errorf("expect %v, got %v", largeResponse, bodyStr)
	}
}

func TestCompressionMiddleware_GzipFallback(t *testing.T) {
	// Create a response larger than 100 bytes
	largeResponse := strings.Repeat("Hello, Gzip world! ", 20) // ~380 bytes
	handler := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte(largeResponse))
	}

	// Test server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		CompressionMiddleware(w, r, handler)
	}))
	defer ts.Close()

	// Create request with only gzip accept encoding (no brotli)
	req, err := http.NewRequest("GET", ts.URL, nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Accept-Encoding", "gzip")

	// Get response with compression disabled for testing
	tr := &http.Transport{
		DisableCompression: true,
	}
	client := &http.Client{Transport: tr}
	resp, err := client.Do(req)
	if err != nil {
		t.Error(err)
		return
	}
	defer resp.Body.Close()

	// Check header - should be compressed with gzip
	contentEncodingHeader := resp.Header.Get("Content-Encoding")
	if contentEncodingHeader != "gzip" {
		t.Errorf("Content-Encoding should be 'gzip' when brotli not supported, got %v", contentEncodingHeader)
	}

	// Check body - decompress and verify
	reader, err := gzip.NewReader(resp.Body)
	if err != nil {
		t.Error(err)
	}
	defer reader.Close()
	bodyBytes, err := io.ReadAll(reader)
	if err != nil {
		t.Error(err)
	}
	bodyStr := string(bodyBytes)
	if bodyStr != largeResponse {
		t.Errorf("expect %v, got %v", largeResponse, bodyStr)
	}
}

func TestCompressionMiddleware_PreferBrotli(t *testing.T) {
	// Create a response larger than 100 bytes
	largeResponse := strings.Repeat("Hello, preferred compression! ", 15) // ~450 bytes
	handler := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(largeResponse))
	}

	// Test server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		CompressionMiddleware(w, r, handler)
	}))
	defer ts.Close()

	// Create request with both brotli and gzip (brotli should be preferred)
	req, err := http.NewRequest("GET", ts.URL, nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Accept-Encoding", "gzip, br")

	// Get response with compression disabled for testing
	tr := &http.Transport{
		DisableCompression: true,
	}
	client := &http.Client{Transport: tr}
	resp, err := client.Do(req)
	if err != nil {
		t.Error(err)
		return
	}
	defer resp.Body.Close()

	// Check header - should prefer brotli over gzip
	contentEncodingHeader := resp.Header.Get("Content-Encoding")
	if contentEncodingHeader != "br" {
		t.Errorf("Content-Encoding should prefer 'br' over gzip when both supported, got %v", contentEncodingHeader)
	}
}

func TestCompressionMiddleware_SmallResponse(t *testing.T) {
	// Create a response smaller than 100 bytes
	smallResponse := "Small!" // ~6 bytes
	handler := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte(smallResponse))
	}

	// Test server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		CompressionMiddleware(w, r, handler)
	}))
	defer ts.Close()

	// Create request with brotli accept encoding
	req, err := http.NewRequest("GET", ts.URL, nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Accept-Encoding", "br, gzip")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		t.Error(err)
		return
	}
	defer resp.Body.Close()

	// Check header - should NOT be compressed due to size threshold
	contentEncodingHeader := resp.Header.Get("Content-Encoding")
	if contentEncodingHeader != "" {
		t.Errorf("Content-Encoding should be empty for small response, got %v", contentEncodingHeader)
	}

	// Check body
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Error(err)
	}
	bodyStr := string(bodyBytes)
	if bodyStr != smallResponse {
		t.Errorf("expect %v, got %v", smallResponse, bodyStr)
	}
}

func TestCompressionMiddleware_RequestDecompression(t *testing.T) {
	// Test that compressed requests are properly decompressed
	originalData := "This is compressed request data"

	// Compress the data with gzip
	var buf bytes.Buffer
	writer := gzip.NewWriter(&buf)
	writer.Write([]byte(originalData))
	writer.Close()
	compressedData := buf.Bytes()

	handler := func(w http.ResponseWriter, r *http.Request) {
		// Read the decompressed body
		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			t.Error(err)
			return
		}

		// Echo back the decompressed data
		w.Write(bodyBytes)
	}

	// Test server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		CompressionMiddleware(w, r, handler)
	}))
	defer ts.Close()

	// Create request with compressed body
	req, err := http.NewRequest("POST", ts.URL, bytes.NewReader(compressedData))
	if err != nil {
		t.Error(err)
	}
	req.Header.Set("Content-Encoding", "gzip")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		t.Error(err)
		return
	}
	defer resp.Body.Close()

	// Check that the response contains the original uncompressed data
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Error(err)
	}

	bodyStr := string(bodyBytes)
	if bodyStr != originalData {
		t.Errorf("expect %v, got %v", originalData, bodyStr)
	}
}

func TestCompressionMiddleware_NoCompression(t *testing.T) {
	// Test response when client doesn't support compression
	largeResponse := strings.Repeat("Hello, no compression! ", 20) // ~480 bytes
	handler := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte(largeResponse))
	}

	// Test server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		CompressionMiddleware(w, r, handler)
	}))
	defer ts.Close()

	// Create request without Accept-Encoding header
	req, err := http.NewRequest("GET", ts.URL, nil)
	if err != nil {
		t.Fatal(err)
	}
	// No Accept-Encoding header set

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		t.Error(err)
		return
	}
	defer resp.Body.Close()

	// Check header - should NOT be compressed
	contentEncodingHeader := resp.Header.Get("Content-Encoding")
	if contentEncodingHeader != "" {
		t.Errorf("Content-Encoding should be empty when client doesn't support compression, got %v", contentEncodingHeader)
	}

	// Check body
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Error(err)
	}
	bodyStr := string(bodyBytes)
	if bodyStr != largeResponse {
		t.Errorf("expect %v, got %v", largeResponse, bodyStr)
	}
}

func TestCompressionMiddleware_UnsupportedContentType(t *testing.T) {
	// Test with a truly unsupported content type that should not be compressed
	binaryData := make([]byte, 200) // 200 bytes of binary data
	for i := range binaryData {
		binaryData[i] = byte(i % 256)
	}

	handler := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/x-unsupported-binary")
		w.Write(binaryData)
	}

	// Test server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		CompressionMiddleware(w, r, handler)
	}))
	defer ts.Close()

	// Create request with brotli accept encoding
	req, err := http.NewRequest("GET", ts.URL, nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Accept-Encoding", "br, gzip")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		t.Error(err)
		return
	}
	defer resp.Body.Close()

	// Check header - should NOT be compressed for unsupported content type
	contentEncodingHeader := resp.Header.Get("Content-Encoding")
	if contentEncodingHeader != "" {
		t.Errorf("Content-Encoding should be empty for unsupported content type, got %v", contentEncodingHeader)
	}

	// Check body
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Error(err)
	}
	if !bytes.Equal(bodyBytes, binaryData) {
		t.Error("Binary data should remain unchanged")
	}
}

func TestCompressionMiddleware_CompressedFormDataParsing(t *testing.T) {
	// Test that compressed form data can be properly parsed by handlers
	// This specifically tests the fix for the behavior endpoints issue
	formData := "ID=test-behavior&Config=%7B%22name%22%3A%22Test%22%7D&Code=console.log%28%27Large%20script%20content%27%29%3B"

	// Compress the form data with gzip
	var buf bytes.Buffer
	writer := gzip.NewWriter(&buf)
	writer.Write([]byte(formData))
	writer.Close()
	compressedData := buf.Bytes()

	handler := func(w http.ResponseWriter, r *http.Request) {
		// Try to parse the form - this should work after decompression
		err := r.ParseForm()
		if err != nil {
			t.Errorf("ParseForm failed after decompression: %v", err)
			http.Error(w, "ParseForm failed", http.StatusBadRequest)
			return
		}

		// Verify form values can be read
		id := r.FormValue("ID")
		config := r.FormValue("Config")
		code := r.FormValue("Code")

		if id != "test-behavior" {
			t.Errorf("Expected ID 'test-behavior', got '%s'", id)
		}

		if config != `{"name":"Test"}` {
			t.Errorf("Expected config '{\"name\":\"Test\"}', got '%s'", config)
		}

		if code != "console.log('Large script content');" {
			t.Errorf("Expected specific code, got '%s'", code)
		}

		// Echo back success to verify the body stream wasn't closed prematurely
		w.Write([]byte("Form parsed successfully"))
	}

	// Test server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		CompressionMiddleware(w, r, handler)
	}))
	defer ts.Close()

	// Create request with compressed form data
	req, err := http.NewRequest("POST", ts.URL, bytes.NewReader(compressedData))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Content-Encoding", "gzip")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		t.Error(err)
		return
	}
	defer resp.Body.Close()

	// Check that the form was parsed successfully
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Error(err)
	}

	bodyStr := string(bodyBytes)
	if bodyStr != "Form parsed successfully" {
		t.Errorf("Expected 'Form parsed successfully', got '%s'", bodyStr)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}
}