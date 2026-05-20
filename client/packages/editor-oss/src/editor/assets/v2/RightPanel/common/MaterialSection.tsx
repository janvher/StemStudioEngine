import * as THREE from "three";

import {ImageSectionWrapper} from "./ImageSection";
import {UploadField} from "../../common/UploadField/UploadField";

export enum MapType {
    MAP = "map",
    NORMAL = "normalMap",
    DISPLACEMENT = "displacementMap",
    BUMP = "bumpMap",
}

interface Props {
    label: string;
    image: string;
    handleImageChange: (url: string, type: MapType) => void;
    selected: THREE.Object3D;
    type: MapType;
}

export const MaterialSection = ({label, image: materialImage, handleImageChange, selected, type}: Props) => {
    return (
        <ImageSectionWrapper>
            <span className="text">{label}</span>
            <UploadField
                width="80px"
                height="80px"
                uploadedFile={materialImage}
                setUploadedFile={url => {
                    handleImageChange((url as string) || "", type);
                }}
                deleteHandler={() => {
                    if (selected && (selected as any).material) {
                        handleImageChange("", type);
                        selected.traverse(child => {
                            if (child instanceof THREE.Mesh && child.material) {
                                if (child.material.isMaterial && !child.material[type]) {
                                    child.material = child.material.clone();
                                }

                                if (child.material[type]) {
                                    child.material[type].dispose();
                                    child.material[type] = null;
                                    child.material.needsUpdate = true;
                                }
                            }
                        });
                    }
                }}
            />
        </ImageSectionWrapper>
    );
};
