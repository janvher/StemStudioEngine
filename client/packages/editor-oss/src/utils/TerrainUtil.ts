import {Mesh, MeshPhongMaterial, PlaneGeometry, RepeatWrapping, TextureLoader} from "three";
import type Ammo from "ammo";

import { resolveAssetUrl } from "./AssetDownloadUtils";
import {CollisionFlag, IPhysics, TerrainData} from "../physics/common/types";

class TerrainUtil {
    heightMapUrl = "";
    textureUrl = "";

    terrainWidthExtents = 100;
    terrainDepthExtents = 100;
    terrainWidth = 128;
    terrainDepth = 128;
    terrainTextureRepeatU = 10;
    terrainTextureRepeatV = 10;
    terrainMaxHeight = 3;
    terrainMinHeight = -5;

    heightData: Float32Array = new Float32Array(0);

    physics: IPhysics | undefined;

    constructor(
        physics: IPhysics | undefined,
        heightMapUrl: string,
        textureUrl: string,
        terrainMaxHeight = 3,
        terrainMinHeight = -5,
        terrainTextureRepeatU = 1,
        terrainTextureRepeatV = 1,
    ) {
        this.physics = physics;
        this.heightMapUrl = heightMapUrl;
        this.textureUrl = textureUrl;
        this.terrainMaxHeight = terrainMaxHeight;
        this.terrainMinHeight = terrainMinHeight;
        this.terrainTextureRepeatU = terrainTextureRepeatU ? terrainTextureRepeatU : 10;
        this.terrainTextureRepeatV = terrainTextureRepeatV ? terrainTextureRepeatV : 10;
    }

    async buildMesh(withPhysics = false): Promise<Mesh> {
        const heightData = await this.generateHeight(
            this.terrainWidth,
            this.terrainDepth,
            this.terrainMinHeight,
            this.terrainMaxHeight,
            this.heightMapUrl,
        );

        const terrainMesh = this.createMesh(this.terrainWidth, this.terrainDepth, heightData);

        if (withPhysics) {
            let friction = 0.5,
                restitution = 0.5;
            //let terrainBody = this.ammoLib ? this._createRigidBody() : null;
            if (this.physics) {
                // @ts-expect-error Need to fix this type
                const terrainData: TerrainData = {
                    uuid: terrainMesh.uuid,
                    position: terrainMesh.position,
                    quaternion: {
                        x: terrainMesh.quaternion.x,
                        y: terrainMesh.quaternion.y,
                        z: terrainMesh.quaternion.z,
                        w: terrainMesh.quaternion.w,
                    },
                    mass: 0,
                    terrainWidth: this.terrainWidth,
                    terrainDepth: this.terrainDepth,
                    terrainMinHeight: this.terrainMinHeight,
                    terrainMaxHeight: this.terrainMaxHeight,
                    collision_flag: CollisionFlag.STATIC,
                    friction: friction,
                    restitution: restitution,
                    heightData: heightData,
                };
                this.physics.addTerrain(terrainMesh, terrainData);
            }
            terrainMesh.userData.physics = {
                enabled: true,
                type: "rigidBody",
                inertia: {x: 0, y: 0, z: 0},
                mass: 0,
                friction: friction,
                restitution: restitution,
            };
        }

        return terrainMesh;
    }

    private createMesh(terrainWidth: number, terrainDepth: number, heightData: Float32Array): Mesh {
        //store height data for physics
        this.heightData = heightData;
        //geometry
        let geometry = new PlaneGeometry(
            this.terrainWidthExtents,
            this.terrainDepthExtents,
            this.terrainWidth - 1,
            this.terrainDepth - 1,
        );
        geometry.rotateX(-Math.PI / 2);

        const positionAttr = geometry.attributes.position;
        if (!positionAttr) {
            throw new Error("PlaneGeometry missing position attribute");
        }
        let vertices = positionAttr.array as Float32Array;

        for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
            // j + 1 because it is the y component that we modify
            vertices[j + 1] = heightData[i] as number;
        }

        geometry.computeVertexNormals();

        //mesh
        const groundMaterial = new MeshPhongMaterial({color: 0xc7c7c7});
        let terrainMesh = new Mesh(geometry, groundMaterial);
        terrainMesh.receiveShadow = true;
        terrainMesh.castShadow = true;

        //texture
        const textureLoader = new TextureLoader();
        resolveAssetUrl(this.textureUrl, 'image').then(resolvedUrl => {
            textureLoader.load(resolvedUrl, texture => {
                texture.wrapS = RepeatWrapping;
                texture.wrapT = RepeatWrapping;
                //texture.repeat.set( terrainWidth - 1, terrainDepth - 1 );
                texture.repeat.set(this.terrainTextureRepeatU, this.terrainTextureRepeatV);
                groundMaterial.map = texture;
                groundMaterial.needsUpdate = true;
            });
        });

        return terrainMesh;
    }

    private generateHeight(
        width: number,
        depth: number,
        minHeight: number,
        maxHeight: number,
        heightMapUrl: string,
    ): Promise<Float32Array> {
        return new Promise(function (resolve, reject) {
            // Generates the height data (a sinus wave)
            let size = width * depth;
            let data = new Float32Array(size);
            let hRange = maxHeight - minHeight;

            //height map image
            let img = new Image();
            img.setAttribute("crossOrigin", "");
            img.onload = function () {
                let canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = depth;
                let ctx = canvas.getContext("2d");
                if (!ctx) {
                    return reject(new Error("Failed to create canvas context"));
                }
                ctx.drawImage(img, 0, 0, width, depth);
                let pixels = ctx.getImageData(0, 0, width, depth).data;
                let p = 0;
                for (let i = 0; i < width * depth; i++) {
                    //let p = i * 3 + 1;
                    p++;
                    let height = ((pixels[i * 4] ?? 0) / 256 + 1) * 0.5 * hRange + minHeight;
                    data[p] = height;
                    //console.log(`${p}->${height}`);
                    resolve(data);
                }
            };
            img.onabort = reject;
            img.onerror = reject;
            img.src = heightMapUrl;
        });
    }

    //physics

    private static createTerrainShapeForPhysics(
        ammo: typeof Ammo,
        terrainWidth: number,
        terrainDepth: number,
        terrainMinHeight: number,
        terrainMaxHeight: number,
        terrainWidthExtents: number,
        terrainDepthExtents: number,
        heightData: Float32Array,
    ): Ammo.btHeightfieldTerrainShape {
        // This parameter is not really used, since we are using PHY_FLOAT height data type and hence it is ignored
        const heightScale = 1;
        // Up axis = 0 for X, 1 for Y, 2 for Z. Normally 1 = Y is used.
        const upAxis = 1;
        // hdt, height data type. "PHY_FLOAT" is used. Possible values are "PHY_FLOAT", "PHY_UCHAR", "PHY_SHORT"
        const hdt = "PHY_FLOAT";
        // Set this to your needs (inverts the triangles)
        const flipQuadEdges = false;

        // Creates height data buffer in Ammo heap
        let ammoHeightData = ammo._malloc(4 * terrainWidth * terrainDepth);

        // Copy the javascript height data array to the Ammo one.
        let p = 0;
        let p2 = 0;

        for (let j = 0; j < terrainDepth; j++) {
            for (let i = 0; i < terrainWidth; i++) {
                // write 32-bit float data to memory
                ammo.HEAPF32[ammoHeightData + p2 >> 2] = heightData[p] as number;
                p++;
                // 4 bytes/float
                p2 += 4;
            }
        }

        // Creates the heightfield physics shape
        const heightFieldShape = new ammo.btHeightfieldTerrainShape(
            terrainWidth,
            terrainDepth,
            ammoHeightData,
            heightScale,
            terrainMinHeight,
            terrainMaxHeight,
            upAxis,
            hdt,
            flipQuadEdges,
        );

        // Set horizontal scale
        const scaleX = terrainWidthExtents / (terrainWidth - 1);
        const scaleZ = terrainDepthExtents / (terrainDepth - 1);
        const scalingVector = new ammo.btVector3(scaleX, 1, scaleZ);
        heightFieldShape.setLocalScaling(scalingVector);
        ammo.destroy(scalingVector); // Clean up temporary vector

        heightFieldShape.setMargin(0.05);

        return heightFieldShape;
    }

    static createRigidBody(
        ammo: typeof Ammo,
        terrainWidth: number,
        terrainDepth: number,
        terrainMinHeight: number,
        terrainMaxHeight: number,
        terrainWidthExtents: number,
        terrainDepthExtents: number,
        heightData: Float32Array,
    ): Ammo.btRigidBody {
        // Create the terrain body
        const groundShape = this.createTerrainShapeForPhysics(
            ammo,
            terrainWidth,
            terrainDepth,
            terrainMinHeight,
            terrainMaxHeight,
            terrainWidthExtents,
            terrainDepthExtents,
            heightData,
        );
        const groundTransform = new ammo.btTransform();
        groundTransform.setIdentity();
        // Shifts the terrain, since bullet re-centers it on its bounding box.
        const originVector = new ammo.btVector3(0, (terrainMaxHeight + terrainMinHeight) / 2, 0);
        groundTransform.setOrigin(originVector);
        ammo.destroy(originVector); // Clean up temporary vector
        
        const groundMass = 0;
        const groundLocalInertia = new ammo.btVector3(0, 0, 0);
        const groundMotionState = new ammo.btDefaultMotionState(groundTransform);
        const rbInfo = new ammo.btRigidBodyConstructionInfo(groundMass, groundMotionState, groundShape, groundLocalInertia);
        const groundBody = new ammo.btRigidBody(rbInfo);
        
        // Clean up temporary objects
        ammo.destroy(groundTransform);
        ammo.destroy(groundLocalInertia);
        ammo.destroy(rbInfo);

        return groundBody;

        //app.addPhysicsObject(terrainMesh, groundBody);

        //physicsWorld.addRigidBody( groundBody );
        //transformAux1 = new scene.userData.physics.Ammo.btTransform();
    }
}

export default TerrainUtil;
