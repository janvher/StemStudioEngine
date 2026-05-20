package middleware

import (
	"net/http"
)

// CrossOriginMiddleware add cross-origin header to the response.
//
// TODO: It may be dangerous not checking the origin.
func CrossOriginMiddleware(w http.ResponseWriter, r *http.Request, next http.HandlerFunc) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Content-Encoding, X-Scene-Id, X-Asset-Get-Proxy-Base, X-Asset-Put-Proxy-Base")

	// Set keep-alive header for all responses including OPTIONS
	w.Header().Set("Connection", "keep-alive")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	next.ServeHTTP(w, r)
}
