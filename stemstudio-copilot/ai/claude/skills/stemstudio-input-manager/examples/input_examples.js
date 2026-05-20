/**
 * MouseKeyboardController
 * Controls object movement via mouse position (follows mouse on ground plane)
 * OR default keyboard input (WASD/Arrow keys) with smooth movement.
 * Space jumps, E/use changes color.
 * Uses InputManager's behavior-safe read API only.
 */

let game;
let inputManager;

this.init = function(_game) {
  game = _game;
  inputManager = game.inputManager;

  // Movement state
  this.targetPosition = new THREE.Vector3();
  this.isMouseControl = false;
  this.raycaster = new THREE.Raycaster();
  this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // Jump state
  this.velocity = new THREE.Vector3();
  this.isJumping = false;
  this.groundY = 2;
  this.gravity = -20;

  // Color change state
  this.colors = [
    0x4a9eff,
    0xff4a4a,
    0x4aff4a,
    0xffff4a,
    0xff4aff,
    0x4affff,
    0xff9f4a,
  ];
  this.currentColorIndex = 0;
  this.useWasDown = false;
};

this.onStart = function() {
  if (this.target) {
    this.targetPosition.copy(this.target.position);
    this.groundY = this.target.position.y;
  }
};

this.update = function(deltaTime) {
  if (!this.target || !inputManager) return;

  const speed = this.attributes.speed || 5;
  const smoothness = this.attributes.smoothness || 0.1;
  const jumpForce = this.attributes.jumpForce || 10;

  if (inputManager.getAction("jump") && !this.isJumping) {
    this.velocity.y = jumpForce;
    this.isJumping = true;
  }

  const useDown = inputManager.getAction("use");
  if (useDown && !this.useWasDown) {
    this.currentColorIndex = (this.currentColorIndex + 1) % this.colors.length;

    if (this.target.material) {
      this.target.material.color.setHex(this.colors[this.currentColorIndex]);
    }
  }
  this.useWasDown = useDown;

  if (this.isJumping) {
    this.velocity.y += this.gravity * deltaTime;
    this.target.position.y += this.velocity.y * deltaTime;

    if (this.target.position.y <= this.groundY) {
      this.target.position.y = this.groundY;
      this.velocity.y = 0;
      this.isJumping = false;
    }
  }

  const forward = inputManager.getMotion("forward");
  const lateral = inputManager.getMotion("lateral");
  const hasKeyboardInput = forward !== 0 || lateral !== 0;

  if (hasKeyboardInput) {
    this.isMouseControl = false;

    const keyboardInput = new THREE.Vector3(lateral, 0, -forward);
    keyboardInput.normalize();
    keyboardInput.multiplyScalar(speed * deltaTime);
    this.targetPosition.copy(this.target.position).add(keyboardInput);
    this.targetPosition.y = this.target.position.y;
  } else {
    const mousePos = inputManager.getMouseTouchPosition();

    if (mousePos && game.camera) {
      this.isMouseControl = true;

      const ndcX = (mousePos.x / window.innerWidth) * 2 - 1;
      const ndcY = -(mousePos.y / window.innerHeight) * 2 + 1;
      const mousePosNDC = new THREE.Vector2(ndcX, ndcY);

      this.raycaster.setFromCamera(mousePosNDC, game.camera);

      const intersectPoint = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint)) {
        this.targetPosition.copy(intersectPoint);
        this.targetPosition.y = this.target.position.y;
      }
    }
  }

  const currentPos = this.target.position.clone();
  currentPos.lerp(this.targetPosition, smoothness);
  this.target.position.x = currentPos.x;
  this.target.position.z = currentPos.z;
};

this.dispose = function() {
  game = undefined;
  inputManager = undefined;
};
