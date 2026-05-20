/**
 * LAMBDA EXAMPLE — Inventory System
 *
 * Shows lambda data being used as a structured inventory store. The lambda
 * holds slots, items, and weight. This behavior provides pickup, drop,
 * and use logic by reading/writing the lambda.
 *
 * Prerequisites:
 *   Attach an "inventory" lambda to the Player via the editor Lambda panel:
 *     id: "inventory"
 *     attributes: { maxSlots: 10, items: [], currentWeight: 0, maxWeight: 50 }
 *
 *   Attach an "objectTag" lambda to collectible objects:
 *     id: "objectTag"
 *     attributes: { category: "item", itemId: "health_potion", weight: 2, stackable: true }
 *
 * Lambda access patterns demonstrated:
 *   - getObjectLambdas() — find lambdas on the player
 *   - getInstancesByType() — find all "objectTag" lambdas in the scene
 *   - getComponentData() — read structured data
 *   - setObjectComponentData() — write arrays and numbers
 *
 * behavior.json attributes:
 *   pickupRadius: 3, dropForce: 5
 */

this.init = function (game) {
    this.game = game;
    this.pickupCooldown = 0;
};

this.onStart = function () {
    if (!this.target) return;

    // Verify inventory lambda exists
    const inv = this.getInventoryData();
    if (!inv) {
        console.warn("[Inventory] No 'inventory' lambda on this object. Attach one in the editor.");
        return;
    }

    console.log(`[Inventory] Ready — ${inv.items.length}/${inv.maxSlots} slots, ${inv.currentWeight}/${inv.maxWeight} weight`);
};

this.update = function (deltaTime) {
    if (!this.target || !this.game) return;
    this.pickupCooldown = Math.max(0, this.pickupCooldown - deltaTime);
};

// -------------------------------------------------------------------
// onEvent — listen for pickup/drop/use requests
// -------------------------------------------------------------------

this.onEvent = function (msg, data) {
    if (!this.target) return;

    switch (msg) {
        case "inventory.pickup":
            // data.uuid = object to pick up
            if (data?.uuid) {
                const obj = this.game.scene.getObjectByProperty("uuid", data.uuid);
                if (obj) this.pickupItem(obj);
            }
            break;

        case "inventory.pickup_nearest":
            this.pickupNearest();
            break;

        case "inventory.drop":
            // data.index = slot index to drop
            if (data?.index !== undefined) this.dropItem(data.index);
            break;

        case "inventory.use":
            // data.index = slot index to use
            if (data?.index !== undefined) this.useItem(data.index);
            break;
    }
};

// -------------------------------------------------------------------
// Pickup — find tagged objects, check weight, add to lambda
// -------------------------------------------------------------------

this.pickupNearest = function () {
    if (this.pickupCooldown > 0) return;

    const radius = this.attributes.pickupRadius || 3;
    const myPos = this.target.position;

    // Find all objects with "objectTag" lambda of category "item"
    const tagInstances = this.erth.lambdas.getInstancesByType("objectTag");
    let nearest = null;
    let nearestDist = Infinity;

    for (const tagLambda of tagInstances) {
        // Each lambda instance may be registered to multiple objects
        for (const [obj] of tagLambda.registeredObjects) {
            const tagData = tagLambda.getComponentData(obj);
            if (!tagData || tagData.category !== "item") continue;

            const dist = myPos.distanceTo(obj.position);
            if (dist < radius && dist < nearestDist) {
                nearest = obj;
                nearestDist = dist;
            }
        }
    }

    if (nearest) {
        this.pickupItem(nearest);
    }
};

this.pickupItem = function (itemObject) {
    if (this.pickupCooldown > 0) return;

    // Read the item's tag lambda
    const itemLambdas = this.erth.lambdas.getObjectLambdas(itemObject);
    const tagLambda = itemLambdas.find(l => l.id === "objectTag");
    if (!tagLambda) return;

    const tagData = tagLambda.getComponentData(itemObject);
    if (!tagData || tagData.category !== "item") return;

    // Read player inventory lambda
    const invLambda = this.getInventoryLambda();
    if (!invLambda) return;
    const inv = invLambda.getComponentData(this.target);
    if (!inv) return;

    // Check capacity
    if (inv.items.length >= inv.maxSlots) {
        this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "inventory.full", { uuid: this.target.uuid });
        return;
    }

    // Check weight
    const itemWeight = tagData.weight || 0;
    if (inv.currentWeight + itemWeight > inv.maxWeight) {
        this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "inventory.too_heavy", { uuid: this.target.uuid });
        return;
    }

    // Stack if possible
    const existingIndex = tagData.stackable
        ? inv.items.findIndex(i => i.itemId === tagData.itemId)
        : -1;

    const newItems = [...inv.items];
    if (existingIndex >= 0) {
        newItems[existingIndex] = {
            ...newItems[existingIndex],
            count: (newItems[existingIndex].count || 1) + 1
        };
    } else {
        newItems.push({
            itemId: tagData.itemId,
            weight: itemWeight,
            count: 1,
            sourceUuid: itemObject.uuid
        });
    }

    // Write updated inventory to lambda
    this.game.lambdaManager.setObjectComponentData(
        invLambda.uuid, this.target, "items", newItems
    );
    this.game.lambdaManager.setObjectComponentData(
        invLambda.uuid, this.target, "currentWeight", inv.currentWeight + itemWeight
    );

    // Hide the picked-up object
    itemObject.visible = false;

    this.pickupCooldown = 0.3;

    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "inventory.item_added", {
        uuid: this.target.uuid,
        itemId: tagData.itemId,
        slot: existingIndex >= 0 ? existingIndex : newItems.length - 1
    });
};

// -------------------------------------------------------------------
// Drop — remove from lambda, re-show in scene
// -------------------------------------------------------------------

this.dropItem = function (slotIndex) {
    const invLambda = this.getInventoryLambda();
    if (!invLambda) return;
    const inv = invLambda.getComponentData(this.target);
    if (!inv || slotIndex >= inv.items.length) return;

    const item = inv.items[slotIndex];
    const newItems = [...inv.items];

    if (item.count > 1) {
        newItems[slotIndex] = { ...item, count: item.count - 1 };
    } else {
        newItems.splice(slotIndex, 1);
    }

    // Write back
    this.game.lambdaManager.setObjectComponentData(
        invLambda.uuid, this.target, "items", newItems
    );
    this.game.lambdaManager.setObjectComponentData(
        invLambda.uuid, this.target, "currentWeight",
        Math.max(0, inv.currentWeight - (item.weight || 0))
    );

    // Re-show the object in the scene (in front of player)
    if (item.sourceUuid) {
        const obj = this.game.scene.getObjectByProperty("uuid", item.sourceUuid);
        if (obj) {
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(this.target.quaternion);
            forward.multiplyScalar(this.attributes.dropForce || 2);
            obj.position.copy(this.target.position).add(forward);
            obj.position.y += 1;
            obj.visible = true;
        }
    }

    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "inventory.item_removed", {
        uuid: this.target.uuid,
        itemId: item.itemId,
        slot: slotIndex
    });
};

// -------------------------------------------------------------------
// Use — consume an item (e.g., health potion)
// -------------------------------------------------------------------

this.useItem = function (slotIndex) {
    const invLambda = this.getInventoryLambda();
    if (!invLambda) return;
    const inv = invLambda.getComponentData(this.target);
    if (!inv || slotIndex >= inv.items.length) return;

    const item = inv.items[slotIndex];

    // Send a use event — other behaviors (health system, etc.) react to this via onEvent
    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "inventory.item_used", {
        uuid: this.target.uuid,
        itemId: item.itemId,
        slot: slotIndex
    });

    // Remove one from stack
    this.dropItem(slotIndex); // reuses drop logic for removal
};

// -------------------------------------------------------------------
// Lambda helpers
// -------------------------------------------------------------------

this.getInventoryLambda = function () {
    const lambdas = this.erth.lambdas.getObjectLambdas(this.target);
    return lambdas.find(l => l.id === "inventory") || null;
};

this.getInventoryData = function () {
    const lambda = this.getInventoryLambda();
    if (!lambda) return null;
    return lambda.getComponentData(this.target);
};

// -------------------------------------------------------------------
// Lifecycle
// -------------------------------------------------------------------

this.onReset = function () {
    // Clear inventory on game reset
    const invLambda = this.getInventoryLambda();
    if (invLambda) {
        this.game.lambdaManager.setObjectComponentData(invLambda.uuid, this.target, "items", []);
        this.game.lambdaManager.setObjectComponentData(invLambda.uuid, this.target, "currentWeight", 0);
    }
    this.pickupCooldown = 0;
};

this.dispose = function () {};
