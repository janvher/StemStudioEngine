
package encoder

import (
	"unsafe"

	jsoniter "github.com/json-iterator/go"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PrimitiveObjectIDEncoder is a custom primitive.ObjectID encoder.
//
// See: github.com/dotErth/ai-3d-sandbox/stemstudio/helper/json.go
type PrimitiveObjectIDEncoder struct {
}

// Encode encode primitive.ObjectID to string.
func (PrimitiveObjectIDEncoder) Encode(ptr unsafe.Pointer, stream *jsoniter.Stream) {
	val := (*primitive.ObjectID)(ptr)
	stream.WriteString(val.Hex())
}

// IsEmpty detect whether primitive.ObjectID is empty.
func (PrimitiveObjectIDEncoder) IsEmpty(ptr unsafe.Pointer) bool {
	val := (*primitive.ObjectID)(ptr)
	return val.IsZero()
}
