package middleware

import (
	"os"
	"sync"
	"testing"
)

func resetAdminUIDCacheForTest() {
	adminUIDsOnce = sync.Once{}
	adminUIDSet = nil
}

func TestIsConfiguredAdminUID_ParsesTrimmedUIDs(t *testing.T) {
	t.Setenv("ADMIN_UIDS", "uid1, uid2 , ,uid3")
	resetAdminUIDCacheForTest()

	tests := []struct {
		name string
		uid  string
		want bool
	}{
		{name: "first uid", uid: "uid1", want: true},
		{name: "trimmed uid", uid: "uid2", want: true},
		{name: "last uid", uid: "uid3", want: true},
		{name: "unknown uid", uid: "uid4", want: false},
		{name: "empty uid", uid: "", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isConfiguredAdminUID(tt.uid); got != tt.want {
				t.Fatalf("isConfiguredAdminUID(%q) = %v, want %v", tt.uid, got, tt.want)
			}
		})
	}
}

func TestGetAdminUIDSet_CachesFirstRead(t *testing.T) {
	t.Setenv("ADMIN_UIDS", "uid-initial")
	resetAdminUIDCacheForTest()

	if !isConfiguredAdminUID("uid-initial") {
		t.Fatal("expected uid-initial to be in cached set")
	}

	if err := os.Setenv("ADMIN_UIDS", "uid-updated"); err != nil {
		t.Fatalf("failed to set env: %v", err)
	}

	if !isConfiguredAdminUID("uid-initial") {
		t.Fatal("expected cached set to preserve uid-initial")
	}
	if isConfiguredAdminUID("uid-updated") {
		t.Fatal("expected cached set to ignore post-cache env updates")
	}
}
