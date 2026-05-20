import * as THREE from "three";

class SpawnPointMarker extends THREE.Group {
    constructor(position: THREE.Vector3, rotation: THREE.Euler) {
        super();

        const material = new THREE.MeshBasicMaterial({color: 0xffffff});

        const headGeometry = new THREE.SphereGeometry(0.1, 32, 32);
        const head = new THREE.Mesh(headGeometry, material);
        head.position.set(0, 1.5, 0);
        this.add(head);

        const bodyGeometry = new THREE.ConeGeometry(0.2, 1, 32);
        const body = new THREE.Mesh(bodyGeometry, material);
        body.position.set(0, 0.75, 0);
        body.rotation.x = Math.PI;
        this.add(body);

        const dir = new THREE.Vector3(0, 0, 1);
        const origin = new THREE.Vector3(0, 0, 0);
        const length = 3;
        const hex = 0x0000ff;

        const arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex);
        this.add(arrowHelper);
        this.position.copy(position);
        this.rotation.copy(rotation);
        this.userData.isSpawnPointMarker = true;
    }
}

export default SpawnPointMarker;
