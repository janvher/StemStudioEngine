var sphere, camera, controller;
var createScene = function () {
    const inputMap = {
        87: false,
        65: false,
        83: false,
        68: false,
        32: false,
        81: false,
        69: false,
    };
    var scene = new BABYLON.Scene(engine);
    scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), new BABYLON.AmmoJSPlugin());

    var shape = new Ammo.btCapsuleShape(0.1,0.8);
    var ghostObject = new Ammo.btPairCachingGhostObject();

    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(0, 1, 0));
    transform.setRotation(new Ammo.btQuaternion(0, 0, 0, 1));

    ghostObject.setWorldTransform(transform);
    ghostObject.setCollisionShape(shape);
    ghostObject.setCollisionFlags(16);
    ghostObject.setActivationState(4);
    ghostObject.activate(true);

    controller = new Ammo.btKinematicCharacterController(
        ghostObject,
        shape,
        0.,
        1
    );
    controller.setGravity(10);
    controller.canJump();
    controller.setMaxJumpHeight(1.0);
    controller.setJumpSpeed(4);


    const world = scene.getPhysicsEngine().getPhysicsPlugin().world;
    world.addCollisionObject(ghostObject,32,3);
    world.addAction(controller);
    controller.setUseGhostSweepTest(false);

    camera = new BABYLON.ArcRotateCamera(
        "playerCamera",
        0,
        Math.PI / 2.5,
        5,
        new BABYLON.Vector3(0, 3, 0),
        scene
    );
    camera.wheelPrecision = 15;
    camera.checkCollisions = false;
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 20;

    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 1, segments: 32}, scene);
    var sphereMaterial = new BABYLON.StandardMaterial("spheremat", scene);
    sphereMaterial.diffuseColor = new BABYLON.Color3(0.39, 0.45, 1);
    sphere.material = sphereMaterial;
    sphere.position.y = 1;

    camera.setTarget(new BABYLON.Vector3(sphere.position.x, sphere.position.y, sphere.position.z));
    camera.attachControl(canvas, true);


    var ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 20, height: 20}, scene);
    ground.physicsImpostor = new BABYLON.PhysicsImpostor(
        ground,
        BABYLON.PhysicsImpostor.BoxImpostor,
        { mass: 0, restitution: 0.0 },
        scene
    );
    ground.checkCollisions = true;

    var groundMaterial = new BABYLON.StandardMaterial("ground", scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.91, 0.91, 0.91);
    groundMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    groundMaterial.diffuseTexture = new BABYLON.Texture("PATH TO IMAGE", scene);
    ground.material = groundMaterial;

    scene.onKeyboardObservable.add((kbInfo) => {
        inputMap[kbInfo.event.keyCode] = kbInfo.type === 1;
    });

    const avatarSpeed = 0.04;
    const xform = ghostObject.getWorldTransform();
    const forward = xform.getBasis().getRow(2);
    const forwardDir = new Ammo.btVector3(
        forward.x(),
        forward.y(),
        forward.z()
    ).op_mul(avatarSpeed);

    const backwardDir = new Ammo.btVector3(
        forward.x(),
        forward.y(),
        forward.z()
    ).op_mul(-avatarSpeed);

    let walkDirection = new Ammo.btVector3(0.0, 0.0, 0.0);
    scene.onBeforeRenderObservable.add(() => {
        let keyDown = false;

        if (inputMap[87]) {
            walkDirection = forwardDir;
            keyDown = true;
        }
        if (inputMap[83]) {
            walkDirection = backwardDir;
            keyDown = true;
        }
        if (inputMap[65]) {
            // C++ EXAMPLE:
            // float yaw=0.05f;
            // btMatrix3x3 orn = m_ghostObject->getWorldTransform().getBasis();
            // orn *= btMatrix3x3(btQuaternion(btVector3(0,1,0),yaw));
            // m_ghostObject->getWorldTransform ().setBasis(orn);
            const yaw = 0.05;
            const orn = ghostObject.getWorldTransform().getBasis();
            orn.setEulerZYX(0,1,0);
            keyDown = true;
        }
        if (inputMap[68]) {
            keyDown = true;
        }
        if (inputMap[32]) {
            controller.jump();
            keyDown = true;
        }
        if (!keyDown) {
            walkDirection = new Ammo.btVector3(0, 0, 0);
        }

        controller.setWalkDirection(walkDirection);

        update();
    });

    return scene;

};

var update = function () {

    var t = controller.getGhostObject().getWorldTransform();
    var p = t.getOrigin();
    var r = t.getRotation();
    var pos = new BABYLON.Vector3(t.getOrigin().x(), t.getOrigin().y(), t.getOrigin().z())
    sphere.position = pos
    if (!sphere.rotationQuaternoin) {
        sphere.rotationQuaternoin = BABYLON.Quaternion.FromEulerAngles(sphere.rotation.x, sphere.rotation.y, sphere.rotation.z);
    }
    sphere.rotationQuaternoin.set(r.x(), r.y(), r.z(), r.w())
    console.log(sphere.rotationQuaternoin)

    // camera.setTarget(pos);
    // console.log(pos)
}
