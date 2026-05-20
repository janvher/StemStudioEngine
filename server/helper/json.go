
package helper

import (
	"reflect"
	"time"

	jsoniter "github.com/json-iterator/go"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/helper/encoder"
)

// Register custom type encoder here.
func init() {
	jsoniter.RegisterTypeEncoder(reflect.TypeOf(time.Now()).String(), encoder.TimeEncoder{})
	jsoniter.RegisterTypeEncoder(
		reflect.TypeOf(primitive.NewObjectID()).String(),
		encoder.PrimitiveObjectIDEncoder{},
	)
	jsoniter.RegisterTypeEncoder(
		reflect.TypeOf(primitive.D{}).String(),
		encoder.PrimitiveDEncoder{},
	)
}

// ToJSON convert interface{} to json bytes.
func ToJSON(obj interface{}) ([]byte, error) {
	return jsoniter.Marshal(obj)
}

// FromJSON convert json bytes to interface{}.
func FromJSON(bytes []byte, result interface{}) error {
	return jsoniter.Unmarshal(bytes, result)
}
