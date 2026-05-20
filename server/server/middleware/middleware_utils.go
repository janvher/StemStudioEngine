package middleware

import (
	"io/ioutil"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/golang-jwt/jwt/v4"
)

func GetToken(userID string, t *testing.T) string {
	token := jwt.New(jwt.SigningMethodHS256)
	claims := make(jwt.MapClaims)
	claims["exp"] = time.Now().Add(time.Hour * time.Duration(1)).Unix()
	claims["iat"] = time.Now().Unix()
	claims["userID"] = userID
	token.Claims = claims

	tokenString, err := token.SignedString([]byte(serverContext.Config.Authority.FirebaseConfigPath))
	if err != nil {
		t.Error(err)
	}
	return tokenString
}

func CheckAuthority(t *testing.T, handler http.HandlerFunc, expect, token string) {
	// test server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ValidateTokenMiddleware(w, r, handler)
	}))
	defer ts.Close()
	// get response
	client := http.Client{}
	if token != "" {
		cookies := []*http.Cookie{
			{Name: "token", Value: token},
		}
		jar, err := cookiejar.New(nil)
		if err != nil {
			t.Error(err)
		}
		ur, err := url.Parse(ts.URL)
		if err != nil {
			t.Error(err)
		}
		jar.SetCookies(ur, cookies)
		client.Jar = jar
	}
	resp, err := client.Get(ts.URL)
	if err != nil {
		t.Error(err)
	}
	defer resp.Body.Close()
	byts, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		t.Error(err)
	}
	str := string(byts)
	if str != expect {
		t.Errorf("expect %v, got %v", expect, str)
	}
}
