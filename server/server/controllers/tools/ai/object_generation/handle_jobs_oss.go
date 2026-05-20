//go:build oss

package object_generation

import (
	"encoding/json"
	"net/http"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
)

func init() {
	serverContext.Handle(http.MethodGet, "/api/AI/ObjectGeneration/Jobs", handleGetJobs, constants.User)
	serverContext.Handle(http.MethodGet, "/api/AI/ObjectGeneration/Job", handleGetJob, constants.User)
}

func handleGetJobs(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode([]any{})
}

func handleGetJob(w http.ResponseWriter, _ *http.Request) {
	http.Error(w, "Server-side generation jobs are not available in OSS mode", http.StatusNotFound)
}
