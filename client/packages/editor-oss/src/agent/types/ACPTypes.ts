/**
 * Agent Client Protocol (ACP) Types
 * Defines the message types and interfaces for ACP communication
 * Based on @agentclientprotocol/sdk types
 */

import {Object3D} from "three";

import {CommandExecutionResult} from "../CommandsExecutor";
import {SupportedCommands} from "../CommandsRegistry";

// Re-export SDK types that we use
export type {
    SessionNotification,
    RequestPermissionRequest,
    RequestPermissionResponse,
    ReadTextFileRequest,
    ReadTextFileResponse,
    WriteTextFileRequest,
    WriteTextFileResponse,
    PromptRequest,
    PromptResponse,
} from "@agentclientprotocol/sdk";

// Base message types
export interface ACPMessage {
    id: string;
    type: string;
    timestamp: number;
}

// Request/Response types
export interface ACPRequest extends ACPMessage {
    type: "request";
    method: string;
    params?: Record<string, any>;
}

export interface ACPResponse extends ACPMessage {
    type: "response";
    requestId: string;
    result?: any;
    error?: ACPError;
}

export interface ACPError {
    code: number;
    message: string;
    data?: any;
}

// Notification types (no response expected)
export interface ACPNotification extends ACPMessage {
    type: "notification";
    method: string;
    params?: Record<string, any>;
}

export interface CommandResult {
    status: string;
    message?: string;
    data?: any;
    interactive?: InteractiveResult;
    userInteractionData?: CommandExecutionResult[];
}

// Command capability definition
export interface CommandCapability {
    name: string;
    description: string;
    parameters: CommandParameter[];
    returns: CommandResult;
}

export interface CommandParameter {
    name: string;
    type: "string" | "number" | "boolean" | "object" | "array";
    description: string;
    required: boolean;
    default?: any;
    enum?: any[];
}

// Capabilities message - sent by client on connection
export interface CapabilitiesMessage extends ACPMessage {
    type: "capabilities";
    capabilities: {
        commands: CommandCapability[];
        version: string;
        clientInfo: {
            name: string;
            version: string;
            platform: string;
        };
    };
}

// Task execution
export interface TaskRequest extends ACPRequest {
    method: "executeTask";
    params: {
        description: string;
        context?: {
            sceneData?: string;
            selectedObject?: string;
            playerData?: string;
            [key: string]: any;
        };
    };
}

export interface TaskResponse extends ACPResponse {
    result: {
        plan: ExecutionStep[];
        status: "success" | "partial" | "failed";
        message?: string;
    };
}

export interface ExecutionStep {
    id: string;
    command: string;
    parameters: Record<string, any>;
    status: "pending" | "executing" | "completed" | "failed";
    result?: any;
    error?: string;
}

// Command execution
export interface CommandRequest extends ACPRequest {
    method: "executeCommand";
    params: {
        command: string;
        parameters: Record<string, any>;
    };
}

export interface CommandResponse extends ACPResponse {
    result: {
        success: boolean;
        data?: any;
        message?: string;
    };
}

// Progress notifications
export interface ProgressNotification extends ACPNotification {
    method: "progress";
    params: {
        stepId: string;
        progress: number;
        message?: string;
    };
}

// Log notifications
export interface LogNotification extends ACPNotification {
    method: "log";
    params: {
        level: "debug" | "info" | "warn" | "error";
        message: string;
        timestamp: number;
    };
}

// WebSocket connection states
export enum ConnectionState {
    DISCONNECTED = "disconnected",
    CONNECTING = "connecting",
    CONNECTED = "connected",
    RECONNECTING = "reconnecting",
    ERROR = "error",
}

// Event types
export type ACPEventType =
    | "connected"
    | "disconnected"
    | "connectionAttempt"
    | "connectionFailed"
    | "message"
    | "error"
    | "taskStarted"
    | "taskProgress"
    | "taskCompleted"
    | "taskCancelled"
    | "commandWillExecute"
    | "commandExecuted"
    | "commandExecutionFailed"
    | "agentMessage"
    | "userMessage"
    | "toolCall"
    | "toolCallUpdate"
    | "toolCallError"
    | "toolOutput"
    | "plan"
    | "permissionRequested"
    | "writeFileRequest"
    | "sessionCreated"
    | "promptStarted"
    | "promptCompleted"
    | "studioConnected"
    | "studioDisconnected"
    | "studioError"
    | "studioNotification"
    | "interactiveResult"
    | "sessionRestoreFailed"
    | "sessionLoadStarted"
    | "sessionLoadCompleted"
    | "agentThinking";

export interface ACPEvent {
    type: ACPEventType;
    data?: any;
}

// Interactive result types - for results that require user selection
export interface InteractiveResult {
    id: string; // Unique ID for this interactive result
    type: "asset_search" | "model_search" | "confirmation" | "selection";
    title: string;
    description?: string;
    items: InteractiveResultItem[];
    command: SupportedCommands;
    commandParams: Record<string, any>;
    messageId: string;
}

export interface InteractiveResultItem {
    id: string;
    name: string;
    description?: string;
    thumbnailUrl?: string;
    previewUrl?: string;
    metadata?: Record<string, any>;
    data?: any;
}

// Event for user selection
export interface InteractiveSelectionEvent {
    interactiveId: string;
    selectedItems: InteractiveResultItem[];
    action: "confirm" | "cancel";
    selectedObjects?: Object3D[];
}

export interface InteractiveSelectionResolution {
    interactiveResult: InteractiveResult;
    selection: InteractiveSelectionEvent;
    results: CommandExecutionResult[];
}
