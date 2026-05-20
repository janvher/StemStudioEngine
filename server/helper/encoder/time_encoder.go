
package encoder

import (
	"time"
	"unsafe"

	jsoniter "github.com/json-iterator/go"
)

// TimeEncoder is a custom time.Time encoder.
type TimeEncoder struct {
}

// Encode encodes time.Time to RFC 3339 format in UTC.
//
// // See: github.com/dotErth/ai-3d-sandbox/stemstudio/helper/json.go
func (TimeEncoder) Encode(ptr unsafe.Pointer, stream *jsoniter.Stream) {
	val := (*time.Time)(ptr)

	str := val.UTC().Format(time.RFC3339)

	stream.WriteString(str)
}

// IsEmpty detect whether time.Time is empty.
func (TimeEncoder) IsEmpty(ptr unsafe.Pointer) bool {
	return false
}
