import BaseSerializer from "../BaseSerializer";
import BoxBufferGeometrySerializer from "./BoxBufferGeometrySerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";
import CapsuleBufferGeometrySerializer from "./CapsuleBufferGeometrySerializer";
import CircleBufferGeometrySerializer from "./CircleBufferGeometrySerializer";
import ConeBufferGeometrySerializer from "./ConeBufferGeometrySerializer";
import CylinderBufferGeometrySerializer from "./CylinderBufferGeometrySerializer";
import DodecahedronBufferGeometrySerializer from "./DodecahedronBufferGeometrySerializer";
import ExtrudeBufferGeometrySerializer from "./ExtrudeBufferGeometrySerializer";
import IcosahedronBufferGeometrySerializer from "./IcosahedronBufferGeometrySerializer";
import InstancedBufferGeometrySerializer from "./InstancedBufferGeometrySerializer";
import LatheBufferGeometrySerializer from "./LatheBufferGeometrySerializer";
import OctahedronBufferGeometrySerializer from "./OctahedronBufferGeometrySerializer";
import PlaneBufferGeometrySerializer from "./PlaneBufferGeometrySerializer";
import PolyhedronBufferGeometrySerializer from "./PolyhedronBufferGeometrySerializer";
import RingBufferGeometrySerializer from "./RingBufferGeometrySerializer";
import ShapeBufferGeometrySerializer from "./ShapeBufferGeometrySerializer";
import SphereBufferGeometrySerializer from "./SphereBufferGeometrySerializer";
import TeapotBufferGeometrySerializer from "./TeapotBufferGeometrySerializer";
import TetrahedronBufferGeometrySerializer from "./TetrahedronBufferGeometrySerializer";
import TextBufferGeometrySerializer from "./TextBufferGeometrySerializer";
import TorusBufferGeometrySerializer from "./TorusBufferGeometrySerializer";
import TorusKnotBufferGeometrySerializer from "./TorusKnotBufferGeometrySerializer";
import TubeBufferGeometrySerializer from "./TubeBufferGeometrySerializer";

const Serializers = {
    BoxBufferGeometry: BoxBufferGeometrySerializer,
    BufferGeometry: BufferGeometrySerializer,
    CapsuleBufferGeometry: CapsuleBufferGeometrySerializer,
    CircleBufferGeometry: CircleBufferGeometrySerializer,
    ConeBufferGeometry: ConeBufferGeometrySerializer,
    CylinderBufferGeometry: CylinderBufferGeometrySerializer,
    DodecahedronBufferGeometry: DodecahedronBufferGeometrySerializer,
    ExtrudeBufferGeometry: ExtrudeBufferGeometrySerializer,
    IcosahedronBufferGeometry: IcosahedronBufferGeometrySerializer,
    InstancedBufferGeometry: InstancedBufferGeometrySerializer,
    LatheBufferGeometry: LatheBufferGeometrySerializer,
    OctahedronBufferGeometry: OctahedronBufferGeometrySerializer,
    PlaneBufferGeometry: PlaneBufferGeometrySerializer,
    PolyhedronBufferGeometry: PolyhedronBufferGeometrySerializer,
    RingBufferGeometry: RingBufferGeometrySerializer,
    ShapeBufferGeometry: ShapeBufferGeometrySerializer,
    SphereBufferGeometry: SphereBufferGeometrySerializer,
    TeapotBufferGeometry: TeapotBufferGeometrySerializer,
    TetrahedronBufferGeometry: TetrahedronBufferGeometrySerializer,
    TextBufferGeometry: TextBufferGeometrySerializer,
    TorusBufferGeometry: TorusBufferGeometrySerializer,
    TorusKnotBufferGeometry: TorusKnotBufferGeometrySerializer,
    TubeBufferGeometry: TubeBufferGeometrySerializer,

    // 2021.4.29: new version three.js change geometry.type
    BoxGeometry: BoxBufferGeometrySerializer,
    CapsuleGeometry: CapsuleBufferGeometrySerializer,
    CircleGeometry: CircleBufferGeometrySerializer,
    ConeGeometry: ConeBufferGeometrySerializer,
    CylinderGeometry: CylinderBufferGeometrySerializer,
    DodecahedronGeometry: DodecahedronBufferGeometrySerializer,
    ExtrudeGeometry: ExtrudeBufferGeometrySerializer,
    IcosahedronGeometry: IcosahedronBufferGeometrySerializer,
    InstancedGeometry: InstancedBufferGeometrySerializer,
    LatheGeometry: LatheBufferGeometrySerializer,
    OctahedronGeometry: OctahedronBufferGeometrySerializer,
    PlaneGeometry: PlaneBufferGeometrySerializer,
    PolyhedronGeometry: PolyhedronBufferGeometrySerializer,
    RingGeometry: RingBufferGeometrySerializer,
    ShapeGeometry: ShapeBufferGeometrySerializer,
    SphereGeometry: SphereBufferGeometrySerializer,
    TeapotGeometry: TeapotBufferGeometrySerializer,
    TetrahedronGeometry: TetrahedronBufferGeometrySerializer,
    TextGeometry: TextBufferGeometrySerializer,
    TorusGeometry: TorusBufferGeometrySerializer,
    TorusKnotGeometry: TorusKnotBufferGeometrySerializer,
    TubeGeometry: TubeBufferGeometrySerializer,
};

/**
 * GeometriesSerializer
 *
 */
class GeometriesSerializer extends BaseSerializer {
    toJSON(obj) {
        var serializer = Serializers[obj.type];

        if (serializer === undefined) {
            console.warn(`GeometriesSerializer: No serializer with ${obj.type}.`);
            return null;
        }

        return new serializer().toJSON(obj);
    }

    fromJSON(json, parent) {
        var generator = json.metadata.generator;

        var serializer = Serializers[generator.replace("Serializer", "")];

        if (serializer === undefined) {
            console.warn(`GeometriesSerializer: No deserializer with ${generator}.`);
            return null;
        }

        return new serializer().fromJSON(json, parent);
    }
}

export default GeometriesSerializer;
