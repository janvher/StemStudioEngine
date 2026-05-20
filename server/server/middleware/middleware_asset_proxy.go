package middleware

import (
	"context"
	"net/http"
	"strings"
)

type contextKey string

const (
	// AssetProxyConfigKey is the context key for asset proxy configuration.
	AssetProxyConfigKey contextKey = "asset_proxy_config"

	// Header names sent by the frontend when running in a proxied environment
	// (e.g., Discord). The values are base URLs that presigned S3/CloudFront
	// URLs should be remapped to.
	headerAssetGetProxyBase = "X-Asset-Get-Proxy-Base"
	headerAssetPutProxyBase = "X-Asset-Put-Proxy-Base"
)

// AssetProxyConfig holds proxy base URLs for remapping presigned URLs.
type AssetProxyConfig struct {
	GetBaseURL string // Proxy base for download (GET) URLs
	PutBaseURL string // Proxy base for upload (PUT) URLs
}

// AssetProxyMiddleware reads proxy-base headers from the request and, if
// present, stores an AssetProxyConfig in the request context. Downstream
// code (e.g., BlobStoreRepository) can use GetAssetProxyConfig to retrieve
// it and remap presigned URLs accordingly.
func AssetProxyMiddleware(w http.ResponseWriter, r *http.Request, next http.HandlerFunc) {
	getBase := strings.TrimSpace(r.Header.Get(headerAssetGetProxyBase))
	putBase := strings.TrimSpace(r.Header.Get(headerAssetPutProxyBase))

	if getBase == "" && putBase == "" {
		next(w, r)
		return
	}

	cfg := &AssetProxyConfig{
		GetBaseURL: strings.TrimRight(getBase, "/"),
		PutBaseURL: strings.TrimRight(putBase, "/"),
	}

	ctx := context.WithValue(r.Context(), AssetProxyConfigKey, cfg)
	next(w, r.WithContext(ctx))
}

// GetAssetProxyConfig retrieves the AssetProxyConfig from the context, or nil
// if no proxy is configured for this request.
func GetAssetProxyConfig(ctx context.Context) *AssetProxyConfig {
	cfg, _ := ctx.Value(AssetProxyConfigKey).(*AssetProxyConfig)
	return cfg
}
