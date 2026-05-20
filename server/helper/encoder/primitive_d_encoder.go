
package encoder

import (
	"unsafe"

	jsoniter "github.com/json-iterator/go"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PrimitiveDEncoder is a custom primitive.D encoder.
//
// See: github.com/dotErth/ai-3d-sandbox/stemstudio/helper/json.go
type PrimitiveDEncoder struct {
}

// Encode encode primitive.D to string.
func (PrimitiveDEncoder) Encode(ptr unsafe.Pointer, stream *jsoniter.Stream) {
	val := (*primitive.D)(ptr)
	stream.WriteVal(val.Map())
}

// IsEmpty detect whether primitive.ObjectID is empty.
func (PrimitiveDEncoder) IsEmpty(ptr unsafe.Pointer) bool {
	return false
}
