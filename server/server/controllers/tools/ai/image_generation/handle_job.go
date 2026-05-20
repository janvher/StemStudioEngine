package image_generation

import (
	"encoding/json"
	"net/http"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
)


func init() {
	serverContext.Handle(http.MethodPost, "/api/AI/ImageGeneration/Job", JobStatusHanler, constants.None)
}

func JobStatusHanler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	jobId := r.URL.Query().Get("jobId")
	if jobId == "" {
		http.Error(w, "Missing jobId parameter", http.StatusBadRequest)
		return
	}

	responseBody, err := fetchJob(jobId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(responseBody)
}
