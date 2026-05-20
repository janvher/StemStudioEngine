package helper

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

func InitializeFirebase(Config *ConfigModel) (*auth.Client, *firestore.Client, error) {
	fmt.Printf("🔐 [Firebase] Initializing Firebase authentication...\n")
	fmt.Printf("🔐 [Firebase] Config file: %v\n", Config.Authority.FirebaseConfigPath)

	opt := option.WithCredentialsFile(Config.Authority.FirebaseConfigPath)

	fmt.Printf("🔐 [Firebase] Creating Firebase app with credentials...\n")
	app, err := firebase.NewApp(context.Background(), nil, opt)
	if err != nil {
		fmt.Printf("❌ [Firebase] Error initializing app: %v\n", err)
		return nil, nil, fmt.Errorf("failed to initialize Firebase app: %w", err)
	}

	// Initialize the Auth client
	fmt.Printf("🔐 [Firebase] Initializing authentication client...\n")
	authClient, err := app.Auth(context.Background())
	if err != nil {
		fmt.Printf("❌ [Firebase] Error getting Auth client: %v\n", err)
		return nil, nil, fmt.Errorf("failed to initialize Firebase auth client: %w", err)
	}

	// Initialize the Firestore client
	fmt.Printf("🔐 [Firebase] Initializing Firestore client...\n")
	fsClient, err := app.Firestore(context.Background())
	if err != nil {
		fmt.Printf("❌ [Firebase] Error getting Firestore client: %v\n", err)
		return nil, nil, fmt.Errorf("failed to initialize Firestore client: %w", err)
	}

	fmt.Printf("✅ [Firebase] Successfully initialized Firebase auth and Firestore clients\n")

	return authClient, fsClient, nil
}

// Function to extract Firebase ID token from Authorization header
func ExtractIDToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return ""
	}

	// Expecting "Bearer <ID_TOKEN>"
	const bearerPrefix = "Bearer "
	if !strings.HasPrefix(authHeader, bearerPrefix) {
		return ""
	}

	token := authHeader[len(bearerPrefix):]
	// Validate that we have a non-empty token
	if strings.TrimSpace(token) == "" {
		return ""
	}

	return strings.TrimSpace(token)
}

// Function to check if user is admin based on custom claim
func CheckAdminClaim(token *auth.Token) (bool, error) {
	// Check if isAdmin claim exists and is set to true
	if claim, ok := token.Claims["isAdmin"]; ok {
		isAdmin, ok := claim.(bool)
		if !ok {
			return false, fmt.Errorf("isAdmin claim is not a boolean")
		}
		return isAdmin, nil
	}
	return false, nil // Default to false if isAdmin claim is not present
}
