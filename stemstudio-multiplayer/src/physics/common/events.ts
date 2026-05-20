export const SIMPLE_EVENTS = {
    ADD: {
        OBJECT: "simple:add:object",
        CHILD: "simple:add:child",
    },
    REMOVE: {
        OBJECT: "simple:rm:object",
        CHILD: "simple:remove:child",
        BEHAVIOR_DATA: "simple:remove:behavior:data",
    },
    UPDATE: {
        OBJECT: "simple:update:object",
    },
    SET: {
        BEHAVIOR_DATA: "simple:set:behavior:data",
        PLAYER: {
            OBJECT: "simple:set:player:object",
            DATA: "simple:set:player:data",
        },
        COLLISION_BEHAVIOR: "simple:set:collision:behavior",
    },
    CHAT: {
        MESSAGE: "simple:chat:message",
    },
    DISCONNECT_CLIENTS: "simple:disconnect:clients",
    HEARTBEAT: "simple:heartbeat"
};

export const PHYSICS_EVENTS = {
    TERMINATE: "physics:terminate",
    READY: "physics:ready",
    START: "physics:start",
    UPDATE: "physics:update",

    ADD: {
        BOX: "physics:add:box",
        VEHICLE: "physics:add:vehicle",
        MODEL: "physics:add:model",
        PLAYER: "physics:add:player",
        SPHERE: "physics:add:sphere",
        TERRAIN: "physics:add:terrain",
        CONVEXHULL: "physics:add:convexhull",
        CONCAVEHULL: "physics:add:concavehull",
        CAPSULE: "physics:add:capsule",
    },

    REMOVE: {
        RIGID_BODY: "physics:remove:rigid_body",
    },

    APPLY: {
        CENTRAL_IMPULSE: "physics:apply:central_impulse",
    },

    SET: {
        ORIGIN: "physics:set:origin",
        ROTATION: "physics:set:rotation",
        LINEAR_VELOCITY: "physics:set:linear_velocity",
    },

    BODY: {
        UPDATE: "physics:body:update",
    },

    PLAYER: {
        ADD: "physics:player:add",
        REMOVE: "physics:player:remove",
        MOVE: "physics:player:move",
        APPLY_IMPULSE: "physics:player:apply_impulse",
        SET_POSITION: "physics:player:set_position",
    },

    COLLISION: {
        DETECTED: "physics:collision:detected",
        DETECT: "physics:collision:detect",
        ADD: {
            OBJECT: "physics:collision:add:object",
        },
        REMOVE: {
            OBJECT: "physics:collision:remove:object",
        },
    },

    ANIMATION: {
        SET: "physics:animation:set",
    },
};

export const EVENTS = {
    SNAPSHOT: {
        REQUEST: "snapshot:request",
        RESPONSE: "snapshot:response",
        UPDATE: {
            OBJECT: "snapshot:update:object",
            OBJECT_USER_DATA: "snapshot:update:object:user_data",
            SCENE_CHILDREN: "snapshot:update:scene:children",
        },
        ADD: {
            OBJECT: "snapshot:add:object",
        },
        REMOVE: {
            OBJECT: "snapshot:remove:object",
        },
    },
    ASSETS: {
        ADD: "asset:add",
        REMOVE: "asset:remove",
        UPDATE: "asset:update",
    },
    BEHAVIORS: {
        REGISTER: {
            BEHAVIOR: "behavior:register:behavior",
            SCRIPT: "behavior:register:script",
        },
        UNREGISTER: {
            BEHAVIOR: "behavior:unregister:behavior",
            SCRIPT: "behavior:unregister:script",
        },
        UPDATE: {
            BEHAVIOR: "behavior:update:behavior",
            SCRIPT: "behavior:update:script",
        },
    },
    LAMBDAS: {
        REGISTER: "lambda:register",
        UNREGISTER: "lambda:unregister",
        UPDATE: "lambda:update",
    },
};
