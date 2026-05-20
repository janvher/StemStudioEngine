package context

import "github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"

// Result present a server handler result.
type Result struct {
	// The Response Code: constants.Success - ok; 400 - bad ajax @see errors.go
	Code constants.ErrorCode `json:"Code" bson:"Code"`
	// The Response Message
	Msg string `json:"Msg" bson:"Msg"`
	// The Response Data
	Data interface{} `json:"Data,omitempty" bson:"Data,omitempty"`
	//  Metadata
	Metadata interface{} `json:"Metadata,omitempty" bson:"Metadata,omitempty"`
}
