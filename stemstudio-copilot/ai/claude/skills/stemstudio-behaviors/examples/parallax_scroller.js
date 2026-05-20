// Parallax Scroller — CRITICAL throttle, clone-based

this.init = function(game) {
    this.game = game;
    this.layers = [];
    this.active = false;
    this.container = null;
    this.hiddenOriginals = [];
};

this.onStart = function() {
    this.active = false;
    this.layers = [];
    this.hiddenOriginals = [];

    // Create behavior-owned container
    if (this.container && this.container.parent) {
        this.container.parent.remove(this.container);
    }
    this.container = new THREE.Group();
    this.container.name = "_ParallaxContainer";
    this.game.scene.add(this.container);

    var bushes = [];
    var hills = [];
    var allClouds = [];
    var towersA = [];
    var towersB = [];
    var antennas = [];
    var windowsA = [];
    var windowsB = [];

    this.game.scene.traverse(function(child) {
        var n = child.name;
        if (!n || n.indexOf("_clone") !== -1 || n === "_ParallaxContainer") return;
        if (n.indexOf("Bush") === 0) bushes.push(child);
        else if (n.indexOf("Hill") === 0) hills.push(child);
        else if (n.indexOf("Cloud") === 0) allClouds.push(child);
        else if (n.indexOf("TowerA") === 0) towersA.push(child);
        else if (n.indexOf("TowerB") === 0) towersB.push(child);
        else if (n.indexOf("Antenna") === 0) antennas.push(child);
        else if (n.indexOf("WindowsA") === 0) windowsA.push(child);
        else if (n.indexOf("WindowsB") === 0) windowsB.push(child);
    });

    var cityBack = towersA.concat(antennas).concat(windowsA);
    var cityFront = towersB.concat(windowsB);
    var self = this;

    // Clone: hide original, create behavior-owned mesh
    var cloneObjects = function(originals) {
        var clones = [];
        var offsets = [];
        for (var i = 0; i < originals.length; i++) {
            var orig = originals[i];
            orig.updateWorldMatrix(true, false);
            var wp = new THREE.Vector3();
            var wq = new THREE.Quaternion();
            var ws = new THREE.Vector3();
            orig.matrixWorld.decompose(wp, wq, ws);

            var clone;
            if (orig.isMesh) {
                clone = new THREE.Mesh(orig.geometry, orig.material);
            } else {
                clone = orig.clone(false);
            }
            clone.name = orig.name + "_clone";
            clone.position.copy(wp);
            clone.quaternion.copy(wq);
            clone.scale.copy(ws);
            clone.castShadow = orig.castShadow;
            clone.receiveShadow = orig.receiveShadow;
            self.container.add(clone);
            clones.push(clone);
            offsets.push({ x: wp.x, y: wp.y, z: wp.z });

            orig.visible = false;
            self.hiddenOriginals.push(orig);
        }
        return { clones: clones, offsets: offsets };
    };

    var makeLayer = function(originals, speed, segmentWidth) {
        if (originals.length === 0) return;
        var result = cloneObjects(originals);
        self.layers.push({
            clones: result.clones,
            offsets: result.offsets,
            speed: speed,
            segmentWidth: segmentWidth,
            scrollOffset: 0
        });
    };

    // Fixed segment widths matching scene layout
    makeLayer(bushes, 3.0, 40);
    makeLayer(hills, 1.5, 40);
    makeLayer(allClouds, 0.8, 44);
    makeLayer(cityFront, 0.5, 40);
    makeLayer(cityBack, 0.3, 42);
};

this.update = function(deltaTime) {
    if (!this.active) return;

    var dt = deltaTime;

    for (var l = 0; l < this.layers.length; l++) {
        var layer = this.layers[l];
        layer.scrollOffset += layer.speed * dt;

        if (layer.scrollOffset > layer.segmentWidth) {
            layer.scrollOffset -= layer.segmentWidth;
        }

        var halfSeg = layer.segmentWidth / 2;
        for (var i = 0; i < layer.clones.length; i++) {
            var newX = layer.offsets[i].x - layer.scrollOffset;
            if (newX < -halfSeg) newX += layer.segmentWidth;
            layer.clones[i].position.x = newX;
        }
    }
};

this.onEvent = function(msg, data) {
    if (msg === "flappy.gameStarted") {
        this.active = true;
    }
    if (msg === "flappy.gameOver") {
        this.active = false;
    }
    if (msg === "flappy.restart") {
        this._resetPositions();
    }
};

this._resetPositions = function() {
    this.active = false;
    for (var l = 0; l < this.layers.length; l++) {
        var layer = this.layers[l];
        layer.scrollOffset = 0;
        for (var i = 0; i < layer.clones.length; i++) {
            layer.clones[i].position.set(
                layer.offsets[i].x,
                layer.offsets[i].y,
                layer.offsets[i].z
            );
        }
    }
};

this.onReset = function() {
    this._resetPositions();
};

this.dispose = function() {
    for (var i = 0; i < this.hiddenOriginals.length; i++) {
        this.hiddenOriginals[i].visible = true;
    }
    this.hiddenOriginals = [];
    if (this.container) {
        while (this.container.children.length > 0) {
            this.container.remove(this.container.children[0]);
        }
        if (this.container.parent) {
            this.container.parent.remove(this.container);
        }
        this.container = null;
    }
    this.layers = [];
    this.active = false;
};
