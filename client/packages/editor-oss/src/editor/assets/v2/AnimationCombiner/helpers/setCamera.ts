import {PerspectiveCamera} from "three";

/**
 *
 * @param container
 */
export default function setCamera(container: HTMLElement): PerspectiveCamera {
    const camera = new PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 512);
    // camera.position.set(100, 200, 400);
    camera.position.z = 300;
    camera.position.y = 50;

    return camera;
}
