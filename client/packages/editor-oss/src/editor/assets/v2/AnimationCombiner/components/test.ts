export const testStateGraph = `{
  "currentState": "Idle",
  "parameters": [
    {
      "name": "isRunning",
      "type": "bool",
      "defaultValue": false
    },
    {
      "name": "isCrouching",
      "type": "bool",
      "defaultValue": false
    },
    {
      "name": "isSprinting",
      "type": "bool",
      "defaultValue": false
    },
    {
      "name": "isJumping",
      "type": "bool",
      "defaultValue": false
    },
    {
      "name": "isDead",
      "type": "trigger",
      "defaultValue": false
    },
    {
      "name": "deathType",
      "type": "int",
      "defaultValue": 0
    },
    {
      "name": "moveX",
      "type": "float",
      "defaultValue": 0
    },
    {
      "name": "moveY",
      "type": "float",
      "defaultValue": 0
    }
  ],
  "states": [
    {
      "id": "ANY",
      "name": "ANY",
      "payload": {},
      "transitions": [
        {
          "toState": "DeathBack",
          "conditions": [
            { "parameter": "isDead", "operator": "equals", "value": true },
            { "parameter": "deathType", "operator": "equals", "value": 0 }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": true,
          "exitTime": 2.9666666984558105,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        },
        {
          "toState": "DeathFront",
          "conditions": [
            { "parameter": "isDead", "operator": "equals", "value": true },
            { "parameter": "deathType", "operator": "equals", "value": 1 }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": true,
          "exitTime": 3.433333396911621,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        },
        {
          "toState": "DeathBackHeadshot",
          "conditions": [
            { "parameter": "isDead", "operator": "equals", "value": true },
            { "parameter": "deathType", "operator": "equals", "value": 2 }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": true,
          "exitTime": 3.700000047683716,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        },
        {
          "toState": "DeathFrontHeadshot",
          "conditions": [
            { "parameter": "isDead", "operator": "equals", "value": true },
            { "parameter": "deathType", "operator": "equals", "value": 3 }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": true,
          "exitTime": 2.8333332538604736,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        },
        {
          "toState": "DeathCrouchHeadshotFront",
          "conditions": [
            { "parameter": "isDead", "operator": "equals", "value": true },
            { "parameter": "deathType", "operator": "equals", "value": 4 }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": true,
          "exitTime": 1.899999976158142,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        }
      ],
      "position": { "x": 0, "y": 0 }
    },
    {
      "id": "Idle",
      "name": "Idle",
      "payload": {},
      "transitions": [
        {
          "toState": "Walk",
          "conditions": [
            {
              "parameter": "moveX",
              "operator": "notEquals",
              "value": 0
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": false,
          "exitTime": 0,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        },
        {
          "toState": "Walk",
          "conditions": [
            {
              "parameter": "moveY",
              "operator": "notEquals",
              "value": 0
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": false,
          "exitTime": 0,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        },
        {
          "toState": "IdleCrouching",
          "conditions": [
            {
              "parameter": "isCrouching",
              "operator": "equals",
              "value": true
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": false,
          "exitTime": 0,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        },
        {
          "toState": "JumpUp",
          "conditions": [
            {
              "parameter": "isJumping",
              "operator": "equals",
              "value": true
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": false,
          "exitTime": 0,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        }
      ],
      "clipName": "Idleaiming",
      "position": { "x": 400, "y": 0 }
    },
    {
      "id": "Walk",
      "name": "Walk",
      "payload": {},
      "transitions": [
        {
          "toState": "Idle",
          "conditions": [
            {
              "parameter": "moveX",
              "operator": "equals",
              "value": 0
            },
            {
              "parameter": "moveY",
              "operator": "equals",
              "value": 0
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": false,
          "exitTime": 0,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        },
        {
          "toState": "Run",
          "conditions": [
            {
              "parameter": "isRunning",
              "operator": "equals",
              "value": true
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": false,
          "exitTime": 0,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        },
        {
          "toState": "Sprint",
          "conditions": [
            {
              "parameter": "isSprinting",
              "operator": "equals",
              "value": true
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": false,
          "exitTime": 0,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        },
        {
          "toState": "JumpUp",
          "conditions": [
            {
              "parameter": "isJumping",
              "operator": "equals",
              "value": true
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": false,
          "exitTime": 0,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        }
      ],
      "blendTree": {
        "clips": [
          "Walkforward",
          "Walkbackward",
          "Walkleft",
          "Walkright",
          "Walkforwardright",
          "Walkbackwardleft",
          "Walkbackwardright"
        ],
        "positions": [
          [
            0,
            1
          ],
          [
            0,
            -1
          ],
          [
            -1,
            0
          ],
          [
            1,
            0
          ],
          [
            1,
            1
          ],
          [
            -1,
            -1
          ],
          [
            1,
            -1
          ]
        ],
        "parameters": [
          "moveX",
          "moveY"
        ]
      },
      "position": { "x": 400, "y": 200 }
    },
    {
      "id": "Run",
      "name": "Run",
      "payload": {},
      "transitions": [
        {
          "toState": "Walk",
          "conditions": [
            {
              "parameter": "isRunning",
              "operator": "equals",
              "value": false
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": false,
          "exitTime": 0,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        },
        {
          "toState": "JumpUp",
          "conditions": [
            {
              "parameter": "isJumping",
              "operator": "equals",
              "value": true
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": false,
          "exitTime": 0,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        }
      ],
      "blendTree": {
        "clips": [
          "Runforward",
          "Runbackward",
          "Runleft",
          "Runright",
          "Runforwardleft",
          "Runbackwardleft",
          "Runbackwardright",
          "Runbackwardright"
        ],
        "positions": [
          [
            0,
            1
          ],
          [
            0,
            -1
          ],
          [
            -1,
            0
          ],
          [
            1,
            0
          ],
          [
            1,
            1
          ],
          [
            -1,
            -1
          ],
          [
            1,
            -1
          ],
          [
            -1,
            1
          ]
        ],
        "parameters": [
          "moveX",
          "moveY"
        ]
      },
      "position": { "x": 400, "y": 400 }
    },
    {
      "id": "IdleCrouching",
      "name": "IdleCrouching",
      "payload": {},
      "transitions": [
        {
          "toState": "Idle",
          "conditions": [
            {
              "parameter": "isCrouching",
              "operator": "equals",
              "value": false
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": false,
          "exitTime": 0,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        },
        {
          "toState": "CrouchWalk",
          "conditions": [
            {
              "parameter": "moveX",
              "operator": "notEquals",
              "value": 0
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": false,
          "exitTime": 0,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        },
        {
          "toState": "JumpUp",
          "conditions": [
            {
              "parameter": "isJumping",
              "operator": "equals",
              "value": true
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": false,
          "exitTime": 0,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        }
      ],
      "clipName": "Idlecrouching",
      "position": { "x": 400, "y": 800 }
    },
    {
      "id": "CrouchWalk",
      "name": "CrouchWalk",
      "payload": {},
      "transitions": [
        {
          "toState": "IdleCrouching",
          "conditions": [
            {
              "parameter": "moveX",
              "operator": "equals",
              "value": 0
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": false,
          "exitTime": 0,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        },
        {
          "toState": "JumpUp",
          "conditions": [
            {
              "parameter": "isJumping",
              "operator": "equals",
              "value": true
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": false,
          "exitTime": 0,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        }
      ],
      "blendTree": {
        "clips": [
          "Walkcrouchingforward",
          "Walkcrouchingbackward",
          "Walkcrouchingleft",
          "Walkcrouchingright",
          "Walkcrouchingforwardright",
          "Walkcrouchingbackwardleft"
        ],
        "positions": [
          [
            0,
            1
          ],
          [
            0,
            -1
          ],
          [
            -1,
            0
          ],
          [
            1,
            0
          ],
          [
            1,
            1
          ],
          [
            -1,
            -1
          ]
        ],
        "parameters": [
          "moveX",
          "moveY"
        ]
      },
      "position": { "x": 400, "y": 1000 }
    },
    {
      "id": "Sprint",
      "name": "Sprint",
      "payload": {},
      "transitions": [
        {
          "toState": "Walk",
          "conditions": [
            {
              "parameter": "isSprinting",
              "operator": "equals",
              "value": false
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": false,
          "exitTime": 0,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        },
        {
          "toState": "JumpUp",
          "conditions": [
            {
              "parameter": "isJumping",
              "operator": "equals",
              "value": true
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": false,
          "exitTime": 0,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        }
      ],
      "blendTree": {
        "clips": [
          "Sprintforwardleft",
          "Sprintbackward",
          "Sprintleft",
          "Sprintbackwardleft",
          "Sprintright"
        ],
        "positions": [
          [
            1,
            1
          ],
          [
            0,
            -1
          ],
          [
            -1,
            0
          ],
          [
            -1,
            -1
          ],
          [
            1,
            0
          ]
        ],
        "parameters": [
          "moveX",
          "moveY"
        ]
      },
      "position": { "x": 400, "y": 600 }
    },
    {
      "id": "JumpUp",
      "name": "JumpUp",
      "payload": {
        "loop": false,
        "clampWhenFinished": true
      },
      "transitions": [
        {
          "toState": "JumpLoop",
          "conditions": [
            {
              "parameter": "isJumping",
              "operator": "equals",
              "value": true
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": true,
          "exitTime": 0.5333333611488342,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        }
      ],
      "clipName": "Jumpup",
      "position": { "x": 800, "y": 0 }
    },
    {
      "id": "JumpLoop",
      "name": "JumpLoop",
      "payload": {},
      "transitions": [
        {
          "toState": "JumpDown",
          "conditions": [
            {
              "parameter": "isJumping",
              "operator": "equals",
              "value": false
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": true,
          "exitTime": 0.9333333373069763,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        }
      ],
      "clipName": "Jumploop",
      "position": { "x": 800, "y": 200 }
    },
    {
      "id": "JumpDown",
      "name": "JumpDown",
      "payload": {
        "loop": false,
        "clampWhenFinished": true
      },
      "transitions": [
        {
          "toState": "Idle",
          "conditions": [
            {
              "parameter": "moveX",
              "operator": "equals",
              "value": 0
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": true,
          "exitTime": 0.6666666865348816,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        },
        {
          "toState": "Walk",
          "conditions": [
            {
              "parameter": "moveX",
              "operator": "notEquals",
              "value": 0
            }
          ],
          "fadeInDuration": 0.2,
          "fadeOutDuration": 0.2,
          "hasExitTime": true,
          "exitTime": 0.6666666865348816,
          "fixedDuration": false,
          "offset": 0,
          "interruptionSource": "none",
          "orderedInterruption": false
        }
      ],
      "clipName": "Jumpdown",
      "position": { "x": 800, "y": 400 }
    },
    {
      "id": "DeathBack",
      "name": "DeathBack",
      "payload": {
        "loop": false,
        "clampWhenFinished": true
      },
      "transitions": [],
      "clipName": "Deathfromtheback",
      "position": { "x": 1200, "y": 0 }
    },
    {
      "id": "DeathFront",
      "name": "DeathFront",
      "payload": {
        "loop": false,
        "clampWhenFinished": true
      },
      "transitions": [],
      "clipName": "Deathfromthefront",
      "position": { "x": 1200, "y": 200 }
    },
    {
      "id": "DeathBackHeadshot",
      "name": "DeathBackHeadshot",
      "payload": {
        "loop": false,
        "clampWhenFinished": true
      },
      "transitions": [],
      "clipName": "Deathfrombackheadshot",
      "position": { "x": 1200, "y": 400 }
    },
    {
      "id": "DeathFrontHeadshot",
      "name": "DeathFrontHeadshot",
      "payload": {
        "loop": false,
        "clampWhenFinished": true
      },
      "transitions": [],
      "clipName": "Deathfromfrontheadshot",
      "position": { "x": 1200, "y": 600 }
    },
    {
      "id": "DeathCrouchHeadshotFront",
      "name": "DeathCrouchHeadshotFront",
      "payload": {
        "loop": false,
        "clampWhenFinished": true
      },
      "transitions": [],
      "clipName": "Deathcrouchingheadshotfront",
      "position": { "x": 1200, "y": 800 }
    }
  ]
}`;
