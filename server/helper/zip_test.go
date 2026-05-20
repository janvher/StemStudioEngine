
package helper

import (
	"io/ioutil"
	"os"
	"testing"
)

// Use functions borrowed from copy_test.go to test Zip and Unzip.

func TestZip(t *testing.T) {
	// source dir
	sourceDirName, err := ioutil.TempDir("", "")
	if err != nil {
		t.Error(err)
	}
	if err := prepareTestTree(sourceDirName); err != nil {
		t.Error(err)
	}
	t.Logf("sourceDirName: %v", sourceDirName)

	// create zip file
	dest, err := ioutil.TempFile(os.TempDir(), "*.zip")
	if err != nil {
		t.Error(err)
	}
	dest.Close()
	destPath := dest.Name()

	if err := Zip(sourceDirName, destPath); err != nil {
		t.Error(err)
	}

	// unzip
	unzipDir, err := ioutil.TempDir("", "")
	if err != nil {
		t.Error(err)
	}

	if err := UnZip(destPath, unzipDir); err != nil {
		t.Error(err)
	}

	// check unzip files
	checkTestTree(unzipDir, t)
}
