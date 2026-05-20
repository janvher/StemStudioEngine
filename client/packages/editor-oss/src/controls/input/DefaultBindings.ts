import { PlayerActions } from "./ActionTypes";
import { Bindings } from "./InputManager";

/**
 *
 */
export function defaultBindings() {
	const bindings = new Bindings<PlayerActions>();

	// Keyboard bindings - movement keys use debounce for smoother movement
	bindings.bindKey("KeyW", true).toMotion("forward", 1);
	bindings.bindKey("KeyS", true).toMotion("forward", -1);
	bindings.bindKey("KeyA", true).toMotion("lateral", -1);
	bindings.bindKey("KeyD", true).toMotion("lateral", 1);

	bindings.bindKey("ArrowUp", true).toMotion("forward", 1);
	bindings.bindKey("ArrowDown", true).toMotion("forward", -1);
	bindings.bindKey("ArrowLeft", true).toMotion("lateral", -1);
	bindings.bindKey("ArrowRight", true).toMotion("lateral", 1);

	// Action keys - no debounce for immediate response
	bindings.bindKey("KeyR").toAction("reload");
	bindings.bindKey("KeyF").toAction("drop");

	bindings.bindKey("KeyE").toAction("use");
	bindings.bindKey("KeyP").toAction("pull");

	bindings.bindKey("ShiftLeft").toAction("run");
	bindings.bindKey("Space").toAction("jump");
	bindings.bindKey("ControlLeft").toAction("crouch");

	bindings.bindMouseClick(0).toAction("primary");
	bindings.bindMouseClick(2).toAction("secondary");

	bindings.bindMouseMove("x").toMotion("view_x", 1);
	bindings.bindMouseMove("y").toMotion("view_y", 1);

	// Virtual controls bindings
	bindings.bindVirtualAxis("move", "x").toMotion("lateral", 1);
	bindings.bindVirtualAxis("move", "y").toMotion("forward", 1);
	bindings.bindVirtualAxis("steer", "x").toMotion("steer", 1);
	bindings.bindVirtualButton("run").toAction("run");
	bindings.bindVirtualButton("jump").toAction("jump");
	bindings.bindVirtualButton("interact").toAction("use");

	// Gamepad bindings (W3C Standard Gamepad layout)
	// Left stick → movement
	bindings.bindGamepadAxis(0).toMotion("lateral", 1);   // Left X
	bindings.bindGamepadAxis(1).toMotion("forward", -1);  // Left Y (inverted)
	// Right stick → camera
	bindings.bindGamepadAxis(2).toMotion("view_x", 8);    // Right X
	bindings.bindGamepadAxis(3).toMotion("view_y", 8);    // Right Y
	// Buttons
	bindings.bindGamepadButton(0).toAction("jump");        // A
	bindings.bindGamepadButton(1).toAction("crouch");      // B
	bindings.bindGamepadButton(2).toAction("use");         // X
	bindings.bindGamepadButton(3).toAction("reload");      // Y
	bindings.bindGamepadButton(4).toAction("secondary");   // LB
	bindings.bindGamepadButton(5).toAction("primary");     // RB
	bindings.bindGamepadButton(8).toAction("drop");        // Select
	bindings.bindGamepadButton(9).toAction("run");         // Start

	return bindings;
}
