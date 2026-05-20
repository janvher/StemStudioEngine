package middleware

import (
	"context"
	"net/http"
	"os"
	"strings"
	"sync"

	"go.mongodb.org/mongo-driver/bson"
	"go.uber.org/zap"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/helper"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/logger"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
)

var (
	adminUIDsOnce sync.Once
	adminUIDSet   map[string]struct{}
)

func getAdminUIDSet() map[string]struct{} {
	adminUIDsOnce.Do(func() {
		adminUIDSet = make(map[string]struct{})
		adminUidsEnv := os.Getenv("ADMIN_UIDS")
		if adminUidsEnv == "" {
			return
		}
		for _, uid := range strings.Split(adminUidsEnv, ",") {
			trimmedUID := strings.TrimSpace(uid)
			if trimmedUID != "" {
				adminUIDSet[trimmedUID] = struct{}{}
			}
		}
	})
	return adminUIDSet
}

func isConfiguredAdminUID(uid string) bool {
	_, ok := getAdminUIDSet()[uid]
	return ok
}

// ValidateTokenMiddleware is used to validate Auth's credentials.
func ValidateTokenMiddleware(w http.ResponseWriter, r *http.Request, next http.HandlerFunc) {
	//FIXME: remove when MP server switched to a proper auth via admin token
	if strings.HasPrefix(r.URL.Path, "/api/Server") { // authority is not enabled
		next(w, r)
		return
	}

	if strings.HasPrefix(r.URL.Path, "/api/livekit") {
		next(w, r)
		return
	}

	if strings.HasPrefix(r.URL.Path, "/api/discord") {
		next(w, r)
		return
	}

	if strings.HasPrefix(r.URL.Path, "/api/.proxy") || strings.HasPrefix(r.URL.Path, "/api/Proxy/Test") {
		next(w, r)
		return
	}

	if strings.HasPrefix(r.URL.Path, "/api/Asset/Download") {
		next(w, r)
		return
	}

	auth, ok := serverContext.GetAPIAuthority(r.Method, r.URL.Path)
	if !ok {
		// path is not registered.
		logger.GetLogger().Error("API path not registered",
			zap.String("path", r.URL.Path),
			zap.String("method", r.Method),
			zap.String("remote_addr", r.RemoteAddr),
			zap.String("operation", "token_validation_unregistered_path"),
		)
		writeNotAllowed(w)
		return
	}

	// Extract Firebase ID token from Authorization header
	idToken := helper.ExtractIDToken(r)

	if auth == constants.User {
		if idToken == "" || idToken == "null" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
	}

	if idToken != "" && idToken != "null" {
		// Verify the ID token
		token, err := serverContext.AuthClient.VerifyIDToken(context.Background(), idToken)
		if err != nil || token == nil {
			logger.GetLogger().Error("Token verification failed",
				zap.String("path", r.URL.Path),
				zap.String("method", r.Method),
				zap.String("authority", string(auth)),
				zap.Error(err),
				zap.String("remote_addr", r.RemoteAddr),
				zap.String("operation", "token_validation_failed"),
			)
			logAPI(r.URL.Path, auth, "", false)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		isAdmin, _ := helper.CheckAdminClaim(token)
			if isConfiguredAdminUID(token.UID) {
				isAdmin = true
			}

		// Check database for admin AccountType if not already admin
		if !isAdmin {
			if db, err := serverContext.Mongo(); err == nil {
				var user bson.M
				if found, _ := db.FindOne(constants.UserCollectionName, bson.M{"ID": token.UID}, &user); found {
					if accountType, ok := user["AccountType"].(string); ok && accountType == string(constants.AccountTypeAdmin) {
						isAdmin = true
					}
				}
			}
		}

		var params = make(map[string]interface{})
		params["token"] = token
		params["authority"] = auth
		params["isAdmin"] = isAdmin
		// Token is verified, proceed with the next handler
		// You can optionally pass the verified token information to the next handler if needed
		ctx := context.WithValue(r.Context(), "auth_params", params)

		// Also add user ID to context for HTTP logging middleware
		ctx = logger.AddUserIDToContext(ctx, token.UID)

		next(w, r.WithContext(ctx))
		return
	}

	// api needs no authority
	logAPI(r.URL.Path, auth, "", true)
	next(w, r)
}

// writeNotAllowed write a not allowed response to the client.
func writeNotAllowed(w http.ResponseWriter) {
	result := serverContext.Result{
		Code: constants.ErrorCodeNotFound,
		Msg:  "Not allowed.",
	}
	json, _ := helper.ToJSON(result)
	w.Write(json)
}

// logAPI logs the ajax path and the execute result.
func logAPI(path string, auth constants.Authority, username string, success bool) {
	if username == "" {
		// Guest means the auth who is not logged in.
		username = "Guest"
	}

	if path != "/" {

		logger.GetLogger().Info("API authentication result",
			zap.String("path", path),
			zap.String("authority", string(auth)),
			zap.String("username", username),
			zap.Bool("success", success),
			zap.String("operation", "api_auth_result"),
		)
	}
}
