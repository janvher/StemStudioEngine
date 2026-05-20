
package helper

import (
	"crypto/md5"
	"encoding/hex"
)

// MD5 convert a string to md5 encrypt string.
//
// TODO: Using md5 to encrypt passwords is not very secure.
func MD5(str string) string {
	h := md5.New()
	h.Write([]byte(str))
	return hex.EncodeToString(h.Sum(nil))
}
