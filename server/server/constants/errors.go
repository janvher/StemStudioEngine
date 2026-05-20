package constants

// ErrorCode defines custom application-specific error codes that correspond to HTTP status codes.
type ErrorCode int

const (
	Success ErrorCode = 200
	// ErrorCodeBadRequest corresponds to HTTP 400 Bad Request
	ErrorCodeBadRequest ErrorCode = 400

	// ErrorCodeUnauthorized corresponds to HTTP 401 Unauthorized
	ErrorCodeUnauthorized ErrorCode = 401

	// ErrorCodeForbidden corresponds to HTTP 403 Forbidden
	ErrorCodeForbidden ErrorCode = 403

	// ErrorCodeNotFound corresponds to HTTP 404 Not Found
	ErrorCodeNotFound ErrorCode = 404

	// ErrorCodeMethodNotAllowed corresponds to HTTP 405 Method Not Allowed
	ErrorCodeMethodNotAllowed ErrorCode = 405

	// ErrorCodeConflict corresponds to HTTP 409 Conflict
	ErrorCodeConflict ErrorCode = 409

	// ErrorCodeStatusUnsupportedMediaType corresponds to HTTP 415 unsupported media type
	ErrorCodeStatusUnsupportedMediaType ErrorCode = 415

	// ErrorCodeInternalError corresponds to HTTP 500 Internal Server Error
	ErrorCodeInternalError ErrorCode = 500

	// ErrorCodeNotImplemented corresponds to HTTP 501 Not Implemented
	ErrorCodeNotImplemented ErrorCode = 501

	// ErrorCodeBadGateway corresponds to HTTP 502 Bad Gateway
	ErrorCodeBadGateway ErrorCode = 502

	// ErrorCodeServiceUnavailable corresponds to HTTP 503 Service Unavailable
	ErrorCodeServiceUnavailable ErrorCode = 503

	// ErrorCodeGatewayTimeout corresponds to HTTP 504 Gateway Timeout
	ErrorCodeGatewayTimeout ErrorCode = 504
)
