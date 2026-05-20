/**
 * UIKit replacement for Logo.tsx
 * Renders a game logo image.
 */
import {Container, Image} from "@ni2khanna/uikit";

export class UIKitLogo {
    readonly container: Container;

    constructor(bgImage: string | null | undefined) {
        this.container = new Container({
            width: 285,
            height: 285,
            borderRadius: 12,
            overflow: "hidden",
            visibility: bgImage ? "visible" : "hidden",
        });

        if (bgImage) {
            const image = new Image({
                src: bgImage,
                width: "100%",
                height: "100%",
                objectFit: "cover",
            });
            this.container.add(image);
        }
    }

    dispose() {
        this.container.dispose();
    }
}
