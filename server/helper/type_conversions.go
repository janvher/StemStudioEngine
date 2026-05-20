package helper

import "strconv"

// ParseFloat parses a string to float64
func ParseFloat(s string) (float64, error) {
	return strconv.ParseFloat(s, 64)
}

// ConvertToInt safely converts various numeric types to int with a default fallback
func ConvertToInt(value interface{}, defaultValue int) int {
	switch v := value.(type) {
	case int:
		return v
	case int32:
		return int(v)
	case int64:
		return int(v)
	case float32:
		return int(v)
	case float64:
		return int(v)
	default:
		return defaultValue
	}
}

// ConvertToBool safely converts various types to bool with a default fallback
func ConvertToBool(value interface{}, defaultValue bool) bool {
	switch v := value.(type) {
	case bool:
		return v
	case string:
		if parsed, err := strconv.ParseBool(v); err == nil {
			return parsed
		}
		return defaultValue
	case int:
		return v != 0
	case int32:
		return v != 0
	case int64:
		return v != 0
	case float32:
		return v != 0
	case float64:
		return v != 0
	default:
		return defaultValue
	}
}

// GetBoolFromField safely extracts a bool value from a map field with a default fallback
func GetBoolFromField(doc map[string]interface{}, field string, defaultValue bool) bool {
	if val, ok := doc[field]; ok {
		return ConvertToBool(val, defaultValue)
	}
	return defaultValue
}

// ParseBoolFormValue safely parses a bool from form values with a default fallback
func ParseBoolFormValue(value string, defaultValue bool) bool {
	if value == "" {
		return defaultValue
	}
	if parsed, err := strconv.ParseBool(value); err == nil {
		return parsed
	}
	return defaultValue
}

// GetStringFromField safely extracts a string value from a map field with a default fallback
func GetStringFromField(doc map[string]interface{}, field string, defaultValue string) string {
	if val, ok := doc[field].(string); ok {
		return val
	}
	return defaultValue
}

// GetInt64FromField safely extracts an int64 value from a map field with a default fallback
func GetInt64FromField(doc map[string]interface{}, field string, defaultValue int64) int64 {
	if val, ok := doc[field].(int64); ok {
		return val
	}
	return defaultValue
}

// GetIntFromField safely extracts an int value from a map field with a default fallback and handles multiple types
func GetIntFromField(doc map[string]interface{}, field string, defaultValue int) int {
	if val, ok := doc[field]; ok {
		return ConvertToInt(val, defaultValue)
	}
	return defaultValue
}

// GetUIntFromField safely extracts a uint value from a map field with a default fallback
func GetUIntFromField(doc map[string]interface{}, field string, defaultValue uint) uint {
	if val, ok := doc[field]; ok {
		intVal := ConvertToInt(val, int(defaultValue))
		if intVal < 0 {
			return defaultValue
		}
		return uint(intVal)
	}
	return defaultValue
}

// GetFloat64FromField safely extracts a float64 value from a map field with a default fallback
func GetFloat64FromField(doc map[string]interface{}, field string, defaultValue float64) float64 {
	if val, ok := doc[field].(float64); ok {
		return val
	}
	if val, ok := doc[field].(float32); ok {
		return float64(val)
	}
	if val, ok := doc[field].(int); ok {
		return float64(val)
	}
	if val, ok := doc[field].(int32); ok {
		return float64(val)
	}
	if val, ok := doc[field].(int64); ok {
		return float64(val)
	}
	return defaultValue
}