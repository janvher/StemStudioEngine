package image_generation

import (
	"fmt"
	"time"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
)

type JobResponse struct {
	Status   string   `json:"status"`
	AssetIds []string `json:"assetIds"`
}

func fetchJob(jobId string) (*JobResponse, error) {
	client, err := helpers.NewScenarioClient()
	if err != nil {
		return nil, err
	}

	response, err := client.FetchJob(jobId)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch job status: %w", err)
	}

	return &JobResponse{
		Status:   response.Status,
		AssetIds: response.AssetIds,
	}, nil
}

// WaitForJobCompletion polls for job completion with a timeout
func WaitForJobCompletion(jobId string) (*JobResponse, error) {
	client, err := helpers.NewScenarioClient()
	if err != nil {
		return nil, err
	}

	response, err := client.WaitForJob(jobId, 5*time.Second, 10*time.Minute)
	if err != nil {
		return nil, err
	}

	return &JobResponse{
		Status:   response.Status,
		AssetIds: response.AssetIds,
	}, nil
}
