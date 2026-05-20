package health

import (
	"net/http"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
)

func init() {
	// Register root route for health checks
	serverContext.Handle(http.MethodGet, "/", Root, constants.None)
}

// Root returns 200 OK for health checks
func Root(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}