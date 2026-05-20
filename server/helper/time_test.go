
package helper

import (
	"testing"
	"time"
)

func TestTimeFormat(t *testing.T) {
	now := time.Date(2020, 5, 23, 21, 30, 12, 0, time.UTC)

	date := now.Format(DateFormat)
	tim := now.Format(TimeFormat)
	datetime := now.Format(DateTimeFormat)
	full := now.Format(time.RFC3339)

	if date != "2020-05-23" {
		t.Errorf("expecte 2020-05-23, got %v", date)
	}

	if tim != "21:30:12" {
		t.Errorf("expecte 21:30:12, got %v", tim)
	}

	if datetime != "2020-05-23 21:30:12" {
		t.Errorf("expecte 2020-05-23 21:30:12, got %v", datetime)
	}

	if full != "2020-05-23T21:30:12Z" {
		t.Errorf("expecte 2020-05-23T21:30:12Z, got %v", full)
	}
}

func TestTimeToString(t *testing.T) {
	now := time.Date(2020, 5, 23, 21, 30, 12, 0, time.UTC)

	date := TimeToString(now, "yyyy-MM-dd")
	tim := TimeToString(now, "HH:mm:ss")
	datetime := TimeToString(now, "yyyy-MM-dd HH:mm:ss")

	if date != "2020-05-23" {
		t.Errorf("expecte 2020-05-23, got %v", date)
	}

	if tim != "21:30:12" {
		t.Errorf("expecte 21:30:12, got %v", tim)
	}

	if datetime != "2020-05-23 21:30:12" {
		t.Errorf("expecte 2020-05-23 21:30:12, got %v", datetime)
	}
}
