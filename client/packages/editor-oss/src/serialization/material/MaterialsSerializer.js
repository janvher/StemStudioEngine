
/**
 * Module: MaterialsSerializer.js
 * Purpose: Contains logic for materials serializer.
 */


import BaseSerializer from "../BaseSerializer";
import LineBasicMaterialSerializer from "./LineBasicMaterialSerializer";
import LineBasicNodeMaterialSerializer from "./LineBasicNodeMaterialSerializer";
import LineDashedMaterialSerializer from "./LineDashedMaterialSerializer";
import MeshBasicMaterialSerializer from "./MeshBasicMaterialSerializer";
import MeshBasicNodeMaterialSerializer from "./MeshBasicNodeMaterialSerializer";
import MeshDepthMaterialSerializer from "./MeshDepthMaterialSerializer";
import MeshDistanceMaterialSerializer from "./MeshDistanceMaterialSerializer";
import MeshLambertMaterialSerializer from "./MeshLambertMaterialSerializer";
import MeshNormalMaterialSerializer from "./MeshNormalMaterialSerializer";
import MeshPhongMaterialSerializer from "./MeshPhongMaterialSerializer";
import MeshPhysicalMaterialSerializer from "./MeshPhysicalMaterialSerializer";
import MeshPhysicalNodeMaterialSerializer from "./MeshPhysicalNodeMaterialSerializer";
import MeshStandardMaterialSerializer from "./MeshStandardMaterialSerializer";
import MeshStandardNodeMaterialSerializer from "./MeshStandardNodeMaterialSerializer";
import MeshToonMaterialSerializer from "./MeshToonMaterialSerializer";
import PointsMaterialSerializer from "./PointsMaterialSerializer";
import PointsNodeMaterialSerializer from "./PointsNodeMaterialSerializer";
import ShadowMaterialSerializer from "./ShadowMaterialSerializer";
import SpriteMaterialSerializer from "./SpriteMaterialSerializer";
import SpriteNodeMaterialSerializer from "./SpriteNodeMaterialSerializer";

const Serializers = {
    LineBasicMaterial: LineBasicMaterialSerializer,
    LineDashedMaterial: LineDashedMaterialSerializer,
    MeshBasicMaterial: MeshBasicMaterialSerializer,
    MeshDepthMaterial: MeshDepthMaterialSerializer,
    MeshDistanceMaterial: MeshDistanceMaterialSerializer,
    MeshLambertMaterial: MeshLambertMaterialSerializer,
    MeshNormalMaterial: MeshNormalMaterialSerializer,
    MeshPhongMaterial: MeshPhongMaterialSerializer,
    MeshPhysicalMaterial: MeshPhysicalMaterialSerializer,
    MeshStandardMaterial: MeshStandardMaterialSerializer,
    MeshToonMaterial: MeshToonMaterialSerializer,
    PointsMaterial: PointsMaterialSerializer,
    ShadowMaterial: ShadowMaterialSerializer,
    SpriteMaterial: SpriteMaterialSerializer,

    // NodeMaterial variants (WebGPU)
    LineBasicNodeMaterial: LineBasicNodeMaterialSerializer,
    MeshBasicNodeMaterial: MeshBasicNodeMaterialSerializer,
    MeshPhysicalNodeMaterial: MeshPhysicalNodeMaterialSerializer,
    MeshStandardNodeMaterial: MeshStandardNodeMaterialSerializer,
    PointsNodeMaterial: PointsNodeMaterialSerializer,
    SpriteNodeMaterial: SpriteNodeMaterialSerializer,
};

/**
 * MaterialsSerializer
 *
 */
class MaterialsSerializer extends BaseSerializer {
    toJSON(obj) {
        if (Array.isArray(obj)) {

            var list = [];

            obj.forEach(n => {
                var serializer = Serializers[n.type];

                if (serializer === undefined) {
                    console.warn(`MaterialsSerializer: No serializer with ${n.type}.`);
                    return;
                }

                list.push(new serializer().toJSON(n));
            });

            return list;
        } else {

            var serializer = Serializers[obj.type];

            if (serializer === undefined) {
                console.warn(`MaterialsSerializer: No serializer with ${obj.type}.`);
                return null;
            }

            return new serializer().toJSON(obj);
        }
    }

    fromJSON(json, parent, options) {
        if (Array.isArray(json)) {

            var list = [];

            json.forEach(n => {
                var generator = n.metadata.generator;

                var serializer = Serializers[generator.replace("Serializer", "")];

                if (serializer === undefined) {
                    console.warn(`MaterialsSerializer: No deserializer with ${generator}.`);
                    return null;
                }

                list.push(new serializer().fromJSON(n, parent, options));
            });

            return list;
        } else {

            var generator = json.metadata.generator;

            var serializer = Serializers[generator.replace("Serializer", "")];

            if (serializer === undefined) {
                console.warn(`MaterialsSerializer: No deserializer with ${generator}.`);
                return null;
            }

            return new serializer().fromJSON(json, parent, options);
        }
    }
}

export default MaterialsSerializer;
