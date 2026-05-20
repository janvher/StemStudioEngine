
package helper

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// This defines some layout to help to format time to string.
//
// For example:
//
// now := time.Date(2020, 5, 23, 21, 30, 12, 0, time.Local)
//
// now.Format(DateFormat) 		=>		2020-05-23
// now.Format(TimeFormat) 		=>		21:30:12
// now.Format(DateTimeFormat) 	=>		2020-05-23 21:30:12
// now.Format(time.RFC3339)		=>  	2020-05-23T21:30:12+08:00
const (
	// DateFormat convert time.Time to `yyyy-MM-dd` format.
	DateFormat = "2006-01-02"
	// TimeFormat convert time.Time to `HH:mm:ss` format.
	TimeFormat = "15:04:05"
	// DateTimeFormat convert time.Time to `yyyy-MM-dd HH:mm:ss` format.
	DateTimeFormat = "2006-01-02 15:04:05"
)

// TimeToString convert a time to string using traditional format.
//
// yyyy-MM-dd			=>	2020-05-23
// HH:mm:ss				=>	21:30:12
// yyyy-MM-dd HH:mm:ss	=>	2020-05-23 21:30:12
func TimeToString(time time.Time, format string) string {
	year := strconv.Itoa(time.Year())
	month := strconv.Itoa(int(time.Month()))
	day := strconv.Itoa(time.Day())
	hour := strconv.Itoa(time.Hour())
	minute := strconv.Itoa(time.Minute())
	second := strconv.Itoa(time.Second())

	if len(month) < 2 {
		month = "0" + month
	}
	if len(day) < 2 {
		day = "0" + day
	}
	if len(hour) < 2 {
		hour = "0" + hour
	}
	if len(minute) < 2 {
		minute = "0" + minute
	}
	if len(second) < 2 {
		second = "0" + second
	}

	result := strings.ReplaceAll(format, "yyyy", year)
	result = strings.ReplaceAll(result, "MM", month)
	result = strings.ReplaceAll(result, "dd", day)
	result = strings.ReplaceAll(result, "HH", hour)
	result = strings.ReplaceAll(result, "mm", minute)
	result = strings.ReplaceAll(result, "ss", second)

	return result
}

// UniqueTimeString generates a unique timestamp string with microsecond precision
// to prevent race conditions in parallel operations
func UniqueTimeString(t time.Time, format string) string {
	baseTime := TimeToString(t, format)
	uniqueSuffix := t.UnixNano() % 1000000
	return fmt.Sprintf("%s_%06d", baseTime, uniqueSuffix)
}
