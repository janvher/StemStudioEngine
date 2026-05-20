import {HemisphereLight, DirectionalLight, Scene, TextureLoader, EquirectangularReflectionMapping} from "three";

import equirectUrl from '../assets/equirect.jpg';

/**
 *
 * @param scene
 */
export default function setLights(scene: Scene): void {
    let hemiLight = new HemisphereLight(0xffffff, 0x444444);
    hemiLight.position.set(100, 200, 400);
    scene.add(hemiLight);

    // Add a shadow-casting directional light
    const directionalLight = new DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(-10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -3;
    directionalLight.shadow.camera.right = 3;
    directionalLight.shadow.camera.top = 3;
    directionalLight.shadow.camera.bottom = -3;
    directionalLight.shadow.bias = 0;
    directionalLight.shadow.normalBias = 0.1;
    scene.add(directionalLight);

    // Environment map setup (equirectangular)
    new TextureLoader().load(equirectUrl, (texture) => {
        texture.mapping = EquirectangularReflectionMapping;
        scene.environment = texture;
    });
}
