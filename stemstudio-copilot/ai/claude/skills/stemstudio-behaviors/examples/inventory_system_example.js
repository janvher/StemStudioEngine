/**
 * INVENTORY SYSTEM EXAMPLE
 *
 * Custom inventory behavior demonstrating:
 * - Item pickup via behavior events (onEvent)
 * - Slot management
 * - UI integration
 * - Item usage system
 */

this.init = function(game) {
    this.game = game;
    this.items = [];
    this.maxSlots = this.attributes.maxSlots || 10;
};

// Receive "item:pickup" events sent via game.behaviorManager.sendEventToObjectBehaviors
this.onEvent = function(msg, data) {
    if (msg === "item:pickup") {
        this.onItemPickup(data);
    }
};

this.onItemPickup = function(data) {
    if (data.player !== this.target.uuid) return;

    if (this.items.length < this.maxSlots) {
        this.items.push({
            id: data.itemId,
            name: data.itemName,
            quantity: 1
        });

        // Update UI
        this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "inventory:updated", { items: this.items });

        // Play pickup sound
        this.game.audioController.playAudioClip("pickup_sound");
    }
};

this.useItem = function(index) {
    if (index < 0 || index >= this.items.length) return;

    const item = this.items[index];

    // Trigger item effect
    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "item:used", {
        player: this.target.uuid,
        item: item
    });

    // Remove from inventory
    this.items.splice(index, 1);
    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "inventory:updated", { items: this.items });
};

this.dispose = function() {};
