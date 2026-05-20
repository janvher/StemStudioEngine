package ai

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/constants"
	serverContext "github.com/dotErth/ai-3d-sandbox/stemstudio/server/context"
	"github.com/dotErth/ai-3d-sandbox/stemstudio/server/controllers/tools/ai/helpers"
	"github.com/gorilla/websocket"
)

// Updated rooms map to include modelID within roomID.
var rooms = make(map[string]map[string]map[*websocket.Conn]bool)
var roomsMutex sync.RWMutex
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
	Error: func(w http.ResponseWriter, r *http.Request, status int, reason error) {
		errorMessage := fmt.Sprintf("Failed to upgrade to WebSocket: %v", reason)
		http.Error(w, errorMessage, status)
		fmt.Println(errorMessage)
	},
}

type ClientMessage struct {
	RoomID       string `json:"roomId"`
	PreviousText string `json:"previousText"`
	Text         string `json:"text"`
	NextText     string `json:"nextText"`
	VoiceId      string `json:"voiceId"`
	ModelID      string `json:"modelId"`
}

// addConnectionToRoom safely adds a connection to a room
func addConnectionToRoom(roomID, modelID string, conn *websocket.Conn) {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()

	if rooms[roomID] == nil {
		rooms[roomID] = make(map[string]map[*websocket.Conn]bool)
	}
	if rooms[roomID][modelID] == nil {
		rooms[roomID][modelID] = make(map[*websocket.Conn]bool)
	}
	rooms[roomID][modelID][conn] = true
}

// removeConnectionFromRoom safely removes a connection from a room
func removeConnectionFromRoom(roomID, modelID string, conn *websocket.Conn) {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()

	if rooms[roomID] != nil && rooms[roomID][modelID] != nil {
		delete(rooms[roomID][modelID], conn)
		if len(rooms[roomID][modelID]) == 0 {
			delete(rooms[roomID], modelID)
			if len(rooms[roomID]) == 0 {
				delete(rooms, roomID)
			}
		}
	}
}

// getRoomConnections safely retrieves all connections for a room/model
func getRoomConnections(roomID, modelID string) map[*websocket.Conn]bool {
	roomsMutex.RLock()
	defer roomsMutex.RUnlock()

	if rooms[roomID] != nil && rooms[roomID][modelID] != nil {
		// Return a copy to avoid holding the lock during iteration
		connections := make(map[*websocket.Conn]bool)
		for conn, active := range rooms[roomID][modelID] {
			connections[conn] = active
		}
		return connections
	}
	return nil
}

func init() {
	serverContext.Handle(http.MethodGet, "/api/ws/AI/TextToVoice", WebSocketHandler, constants.None)
}

func WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Failed to upgrade to WebSocket", http.StatusInternalServerError)
		return
	}
	conn.SetCloseHandler(func(code int, text string) error {
		helpers.SendError(conn, fmt.Sprintf("WebSocket closed with code: %v", text))
		http.Error(w, "WebSocket closed with code: "+text, http.StatusInternalServerError)
		return nil
	})
	helpers.SendError(conn, fmt.Sprintf("Connection closed DEFER: %v", err))
	defer helpers.CloseConnectionWithReason(conn, websocket.CloseNormalClosure, "Connection closed DEFER")

	var roomID, modelID string

	// Read the first message to get the roomID and modelID.
	_, message, err := conn.ReadMessage()
	if err == nil {
		var msgData ClientMessage
		if err := json.Unmarshal(message, &msgData); err == nil {
			roomID = msgData.RoomID
			modelID = msgData.ModelID

			if roomID != "" && modelID != "" {
				// Add connection to room using thread-safe function
				addConnectionToRoom(roomID, modelID, conn)
			}
		} else {
			fmt.Printf("Failed to unmarshal message: %v", err)
		}
	}

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			// Remove connection from room using thread-safe function
			removeConnectionFromRoom(roomID, modelID, conn)
			break
		}

		var clientMsg ClientMessage
		if err := json.Unmarshal(message, &clientMsg); err == nil && clientMsg.Text != "" {
			go processTextToSpeech(conn, clientMsg, roomID, modelID)
		}
	}
}

func processTextToSpeech(conn *websocket.Conn, msg ClientMessage, roomID, modelID string) {
	audioData, err := helpers.GenerateSpeechWS(msg.PreviousText, msg.Text, msg.NextText, msg.VoiceId, conn)
	if err != nil {
		helpers.SendError(conn, fmt.Sprintf("Error with speech generation: %v", err))
		return
	}

	// Retrieve all clients for the specified roomID and modelID using thread-safe function
	modelClients := getRoomConnections(roomID, modelID)
	if modelClients != nil {
		for conn := range modelClients {
			err := conn.WriteMessage(websocket.BinaryMessage, audioData)
			if err != nil {
				helpers.SendError(conn, fmt.Sprintf("Error when sending audio data: %v", err))
				conn.Close()
				// Remove the failed connection from the room
				removeConnectionFromRoom(roomID, modelID, conn)
			}
		}
	}
}
