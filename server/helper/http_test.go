//go:build integration
// +build integration


package helper

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func TestEnableCrossDomain(t *testing.T) {
	origin := "http://192.168.0.2"

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Header.Set("Origin", origin) // Header is case insensitive, `Origin` or `origin` is ok.
		EnableCrossDomain(w, r)
	}))
	defer ts.Close()

	res, err := http.Get(ts.URL)
	if err != nil {
		t.Error(err)
		return
	}
	defer res.Body.Close()

	methodsHeader := res.Header.Get("Access-Control-Allow-Methods")
	originHeader := res.Header.Get("Access-Control-Allow-Origin")

	if methodsHeader == "" ||
		!strings.Contains(methodsHeader, "OPTIONS") ||
		!strings.Contains(methodsHeader, "POST") ||
		!strings.Contains(methodsHeader, "GET") {
		t.Errorf("Access-Control-Allow-Methods is not set properly, got %v", methodsHeader)
	}

	if originHeader != origin {
		t.Errorf("Access-Control-Allow-Origin is not set properly, got %v", originHeader)
	}
}

func TestGet(t *testing.T) {
	t.Skip("Skipping external HTTP test - requires external network connectivity")
	bytes, err := Get("http://www.baidu.com")
	if err != nil {
		t.Error(err)
	}
	if len(bytes) == 0 {
		t.Error("get http://www.baidu.com failed")
	}
}

func TestPost(t *testing.T) {
	t.Skip("Skipping external HTTP test - requires external service availability")
	bytes, err := Post("https://passport.baidu.com/v2/api/?login", url.Values{"username": {"foo"}, "password": {"bar"}})
	if err != nil {
		t.Error(err)
		return
	}
	if len(bytes) == 0 {
		t.Error("post https://passport.baidu.com/v2/api/?login failed")
	}
}

func TestWrite(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, err := Write(w, "hello"); err != nil {
			t.Error(err)
		}
	}))
	defer ts.Close()

	resp, err := http.Get(ts.URL)
	if err != nil {
		t.Error(err)
		return
	}
	defer resp.Body.Close()

	bytes, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Error(err)
		return
	}

	if string(bytes) != "hello" {
		t.Errorf("expect hello, got %v", string(bytes))
	}
}

func TestWritef(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, err := Writef(w, "%v", "hello"); err != nil {
			t.Error(err)
		}
	}))
	defer ts.Close()

	resp, err := http.Get(ts.URL)
	if err != nil {
		t.Error(err)
		return
	}
	defer resp.Body.Close()

	bytes, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Error(err)
		return
	}

	if string(bytes) != "hello" {
		t.Errorf("expect hello, got %v", string(bytes))
	}
}

func TestWriteJSON(t *testing.T) {
	person := Person{"xiaoming", 20}

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		WriteJSON(w, person)
	}))
	defer ts.Close()

	res, err := http.Get(ts.URL)
	if err != nil {
		t.Error(err)
	}
	defer res.Body.Close()

	result := Person{}

	decoder := json.NewDecoder(res.Body)
	if err = decoder.Decode(&result); err != nil {
		t.Error("json decode failed")
	}
	if result.Name != "xiaoming" {
		t.Errorf("write: expect xiaoming, got %v", result.Name)
	}
	if result.Age != 20 {
		t.Errorf("write: expect 20, got %v", result.Age)
	}
}

func TestWriteJSONWithCache(t *testing.T) {
	person := Person{"xiaoming", 20}
	etag := "test-etag-123"
	maxAge := 3600

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		WriteJSONWithCache(w, person, etag, maxAge)
	}))
	defer ts.Close()

	res, err := http.Get(ts.URL)
	if err != nil {
		t.Error(err)
	}
	defer res.Body.Close()

	// Check response headers
	etagHeader := res.Header.Get("ETag")
	if etagHeader != etag {
		t.Errorf("Expected ETag %v, got %v", etag, etagHeader)
	}

	cacheControlHeader := res.Header.Get("Cache-Control")
	expectedCacheControl := "public, max-age=3600, must-revalidate"
	if cacheControlHeader != expectedCacheControl {
		t.Errorf("Expected Cache-Control %v, got %v", expectedCacheControl, cacheControlHeader)
	}

	contentTypeHeader := res.Header.Get("Content-Type")
	if contentTypeHeader != "application/json" {
		t.Errorf("Expected Content-Type application/json, got %v", contentTypeHeader)
	}

	// Check response body
	result := Person{}
	decoder := json.NewDecoder(res.Body)
	if err = decoder.Decode(&result); err != nil {
		t.Error("json decode failed")
	}
	if result.Name != "xiaoming" {
		t.Errorf("Expected name xiaoming, got %v", result.Name)
	}
	if result.Age != 20 {
		t.Errorf("Expected age 20, got %v", result.Age)
	}
}

func TestWriteJSONWithCacheConditionalRequest(t *testing.T) {
	person := Person{"xiaoming", 20}
	etag := "test-etag-123"
	maxAge := 3600

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check if client sent If-None-Match header
		ifNoneMatch := r.Header.Get("If-None-Match")
		if ifNoneMatch == etag {
			w.WriteHeader(http.StatusNotModified)
			return
		}
		WriteJSONWithCache(w, person, etag, maxAge)
	}))
	defer ts.Close()

	// Create request with If-None-Match header
	req, err := http.NewRequest("GET", ts.URL, nil)
	if err != nil {
		t.Error(err)
	}
	req.Header.Set("If-None-Match", etag)

	client := &http.Client{}
	res, err := client.Do(req)
	if err != nil {
		t.Error(err)
	}
	defer res.Body.Close()

	// Should return 304 Not Modified
	if res.StatusCode != http.StatusNotModified {
		t.Errorf("Expected status 304, got %v", res.StatusCode)
	}
}

func TestWriteJSONWithCacheZeroMaxAge(t *testing.T) {
	person := Person{"xiaoming", 20}
	etag := "test-etag-123"
	maxAge := 0

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		WriteJSONWithCache(w, person, etag, maxAge)
	}))
	defer ts.Close()

	res, err := http.Get(ts.URL)
	if err != nil {
		t.Error(err)
	}
	defer res.Body.Close()

	// Check Cache-Control header with max-age=0
	cacheControlHeader := res.Header.Get("Cache-Control")
	expectedCacheControl := "public, must-revalidate"
	if cacheControlHeader != expectedCacheControl {
		t.Errorf("Expected Cache-Control %v, got %v", expectedCacheControl, cacheControlHeader)
	}
}

func TestWriteJSONWithCacheEmptyETag(t *testing.T) {
	person := Person{"xiaoming", 20}
	etag := ""
	maxAge := 3600

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		WriteJSONWithCache(w, person, etag, maxAge)
	}))
	defer ts.Close()

	res, err := http.Get(ts.URL)
	if err != nil {
		t.Error(err)
	}
	defer res.Body.Close()

	// ETag header should not be set when empty
	etagHeader := res.Header.Get("ETag")
	if etagHeader != "" {
		t.Errorf("Expected empty ETag, got %v", etagHeader)
	}

	// Cache-Control should still be set
	cacheControlHeader := res.Header.Get("Cache-Control")
	expectedCacheControl := "public, max-age=3600, must-revalidate"
	if cacheControlHeader != expectedCacheControl {
		t.Errorf("Expected Cache-Control %v, got %v", expectedCacheControl, cacheControlHeader)
	}
}
