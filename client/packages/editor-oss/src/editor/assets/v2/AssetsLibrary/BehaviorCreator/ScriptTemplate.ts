export const ScriptTemplate = `
/**
 * Global Store - Shared data across all behaviors
 * ------------------------------------------------
 * Access via: this.erth.store
 *
 * Available methods:
 *   this.erth.store.get(key)      - Get a value (returns undefined if not found)
 *   this.erth.store.set(key, val) - Set a value (max 128 keys)
 *   this.erth.store.has(key)      - Check if key exists
 *   this.erth.store.delete(key)   - Delete a key
 *   this.erth.store.keys()        - Get all keys
 *   this.erth.store.size          - Get number of keys
 *
 * Note: Store is cleared when game starts (not on resume)
 *
 * Example:
 *   this.erth.store.set("playerScore", 100);
 *   const score = this.erth.store.get("playerScore"); // 100
 */

/**
 * @this {Behavior}
 * Called only once when the behavior is instantiated, target is not set yet.
 * If this function returns a promise, other behaviors will wait for it to resolve.
 * @param {GameManager} game - GameManager instance providing access to physics, player, scene, camera, etc.
 * @returns {void | Promise<void>}
 */
this.init = function(game) {

}

/**
 * @this {Behavior}
 * Called when the behavior is disposed.
 * Clean up any resources, listeners, or timers here.
 * @returns {void}
 */
this.dispose = function() {

}

/**
 * @this {Behavior}
 * Called when the behavior is started.
 * If this function returns a promise, the behavior will not be fully started until the promise resolves.
 * @returns {void | Promise<void>}
 */
this.onStart = function() {

}

/**
 * @this {Behavior}
 * Called when the behavior is stopped.
 * @returns {void}
 */
this.onStop = function() {

}

/**
 * @this {Behavior}
 * Called every frame to update the behavior.
 * @param {number} deltaTime - Time elapsed since last frame in seconds
 * @returns {void}
 */
this.update = function(deltaTime) {

}

/**
 * @this {Behavior}
 * Called when the behavior is paused.
 * @returns {void}
 */
this.onPaused = function() {

}

/**
 * @this {Behavior}
 * Called when the behavior is resumed after being paused.
 * @returns {void}
 */
this.onResumed = function() {

}

/**
 * @this {Behavior}
 * Called when the behavior attributes are updated.
 * Use this to respond to changes in configuration.
 * @returns {void}
 */
this.onAttributesUpdated = function() {

}

/**
 * @this {Behavior}
 * Called when the game is started or resumed.
 * @returns {void}
 */
this.onReset = function() {

}

/**
 * @this {Behavior}
 * Called when multiplayer state is updated in GameManager.storage.
 * @param {string} key - State key that was updated
 * @param {string | undefined} value - New state value (undefined if deleted)
 * @returns {void}
 */
this.onStateUpdated = function(key, value) {

}

/**
 * @this {Behavior}
 * Called when an event is received.
 * @param {string} msg - Event message/type
 * @param {any} data - Event data payload
 * @returns {void}
 */
this.onEvent = function(msg, data) {

}

/**
 * @this {Behavior}
 * Called when the behavior is added to an object, target is set and you can access the object.
 * @deprecated This method is deprecated in favor of onStart
 * @returns {void | Promise<void>}
 */
this.onAdded = function() {

}

/**
 * @this {Behavior}
 * Called when the behavior is removed from an object.
 * @deprecated This method is deprecated, use onStop instead
 * @returns {void}
 */
this.onRemoved = function() {

}

// ── Editor Methods (uncomment to enable) ────────────────
// These methods only run in editor mode, not in play mode.
/*

// Called when the behavior is added to the editor.
// @param {any} editor - Editor instance
this.onEditorAdded = function(editor) {

}

// Called when the behavior is removed from the editor.
// Note: Not called when editor is disposed (e.g. switching to game mode).
this.onEditorRemoved = function() {

}

// Called when the editor is disposed (switching to game mode or closing).
// Clean up any resources or listeners you added in onEditorAdded.
this.onEditorDispose = function() {

}

// Called every frame in editor mode.
this.onEditorUpdate = function() {

}

// Called when the editor panel for this behavior is shown.
this.onEditorPanelShown = function() {

}

// Called when the editor panel for this behavior is hidden.
this.onEditorPanelHidden = function() {

}

// Called when editor attributes are updated.
this.onEditorAttributesUpdated = function() {

}

// Called when an event is received in editor mode.
// @param {string} msg - Event message/type
// @param {any} data - Event data payload
this.onEditorEvent = function(msg, data) {

}

*/

// ── Worker Thread Methods (uncomment to enable) ─────────
// These run inside a Web Worker (no DOM or Three.js access).
// Enable via "worker": true in behavior.json.
// 'this' inside worker methods is a WorkerContext:
//   { state: {}, running: true, postToMain(type, data), yield(), hasMessages(), nextMessage() }
/*

// Called once when the worker is initialized.
// @param {any} initData - Data from getWorkerInitData(runtime), includes { runtime: "editor" | "play" }
this.workerInit = function(initData) {

}

// Cooperative task that runs after onStart inside the worker thread.
// Use a while(this.running) loop with await this.yield() to do work in chunks.
// Call this.hasMessages() / this.nextMessage() to drain incoming messages.
//
// Example:
//   while (this.running) {
//       doWork();
//       await this.yield();
//       while (this.hasMessages()) {
//           var msg = this.nextMessage();
//           // handle msg.type, msg.data
//       }
//   }
this.workerTask = async function() {

}

// Called when the main thread sends a message via postToWorker().
// @param {string} type - Message type
// @param {any} data - Message data
this.workerOnMessage = function(type, data) {

}

// Called when the worker is about to be disposed.
this.workerDispose = function() {

}

// Called on the MAIN thread when the worker sends a message via postToMain().
// @param {string} type - Message type
// @param {any} data - Message data
this.onWorkerMessage = function(type, data) {

}

// Returns data to send to the worker on initialization.
// Runs on the MAIN thread.
// @param {"editor" | "play"} runtime - Current runtime that is starting the worker
// @returns {any}
this.getWorkerInitData = function(runtime) {
    return { runtime };
}

*/
`;
