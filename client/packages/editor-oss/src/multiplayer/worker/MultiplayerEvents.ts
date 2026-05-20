export const MULTIPLAYER_EVENTS = {
    START: 'multiplayer:start',
    STOP: 'multiplayer:stop',
    DISCONNECT: 'multiplayer:disconnect',
    DISCONNECTED: 'multiplayer:disconnected',
    OBJECT: {
        ADD: 'multiplayer:object:add',          //TO worker
        ADDED: 'multiplayer:object:added',      //FROM worker
        UPDATE: 'multiplayer:object:update',    //TO worker
        UPDATED: 'multiplayer:object:updated',  //FROM worker
        REMOVE: 'multiplayer:object:remove',    //TO worker
        REMOVED: 'multiplayer:object:removed',  //FROM worker
        ANIMATION: {
            SET: 'multiplayer:object:animation:set',
            CHANGED: 'multiplayer:object:animation:changed',
        } as const,
        CHILD: {
            ADD: 'multiplayer:object:child:add',
            ADDED: 'multiplayer:object:child:added',
            REMOVE: 'multiplayer:object:child:remove',
            REMOVED: 'multiplayer:object:child:removed',
            UPDATED: 'multiplayer:object:child:updated',
        } as const,
        COLLISION_BEHAVIOR: {
            SET: 'multiplayer:object:collisionbehavior:set',
            CHANGED: 'multiplayer:object:collisionbehavior:changed',
        } as const,
    } as const,
    PLAYER: {
        SET: 'multiplayer:player:set',
        ADDED: 'multiplayer:player:added',
        REMOVED: 'multiplayer:player:removed',
        DATA: {
            CHANGED: 'multiplayer:player:data:changed',
            SET: 'multiplayer:player:data:set',
        } as const,
    } as const,
    HOST: {
        CHANGED: 'multiplayer:host:changed',
    } as const,
    BEHAVIOR: {
        DATA: {
            SET: 'multiplayer:behavior:data:set',
            CHANGED: 'multiplayer:behavior:data:changed',
        } as const,
    } as const,
    WORKER: {
        READY: 'multiplayer:worker:ready',
        ERROR: 'multiplayer:worker:error',
    } as const,
    CHAT: {
        MESSAGE: "multiplayer:chat:message",
    },
    DISCONNECT_CLIENTS: 'multiplayer:disconnect:clients',
    HEARTBEAT: 'multiplayer:heartbeat',
} as const;
