//go:build oss

package context

// EnsureLakeFSBucketExists is a no-op in the OSS AI server. The OSS build tag
// intentionally excludes the generated LakeFS client and hosted asset pipeline.
func EnsureLakeFSBucketExists() error {
	return nil
}
