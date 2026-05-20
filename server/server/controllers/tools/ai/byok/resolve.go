package byok

import (
	"net/http"
	"strings"
)

// HeaderKey and HeaderProvider are the wire names the editor's HttpAIBackend
// uses to forward a per-request BYOK key. The header pair is optional — when
// absent, ResolveFromRequest falls through to the env / session store path.
const (
	HeaderKey      = "X-BYOK-Key"
	HeaderProvider = "X-BYOK-Provider"
)

// ResolveFromRequest is the convenience entry point for AI handlers. It
// applies the standard precedence:
//
//  1. Server env vars (operator-managed) — always win.
//  2. Per-request BYOK header forwarded by the editor (`X-BYOK-Key` + matching
//     `X-BYOK-Provider`).
//  3. Session-store BYOK key set via POST /api/AI/ConfigureKeys.
//
// `provider` is the canonical name (matches keys in `providerEnvVars`).
// `envVars` is the ordered list of env var names to consult.
//
// Returns the resolved key and a label describing where it came from
// (`"env"`, `"byok-header"`, `"byok-session"`, or `""` when nothing matched).
func ResolveFromRequest(r *http.Request, provider string, envVars ...string) (key, source string) {
	provider = strings.ToLower(strings.TrimSpace(provider))

	byokKey := ""
	if r != nil {
		headerProvider := strings.ToLower(strings.TrimSpace(r.Header.Get(HeaderProvider)))
		if headerProvider == "" || headerProvider == provider {
			byokKey = strings.TrimSpace(r.Header.Get(HeaderKey))
		}
	}

	return LookupKey(provider, envVars, byokKey)
}

// ProviderEnvVars returns the env var names registered for a provider. The
// returned slice is safe to pass to LookupKey / ResolveFromRequest. Returns
// nil for unknown providers.
func ProviderEnvVars(provider string) []string {
	vars, ok := providerEnvVars[strings.ToLower(strings.TrimSpace(provider))]
	if !ok {
		return nil
	}
	out := make([]string, len(vars))
	copy(out, vars)
	return out
}
