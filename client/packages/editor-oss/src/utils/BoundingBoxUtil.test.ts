import { Mesh, Object3D, SphereGeometry, BoxGeometry, MeshBasicMaterial } from 'three';
import { describe, it, expect, beforeEach } from 'vitest';

import BoundingBoxUtil from '../utils/BoundingBoxUtil';

const createMesh = (geometry: BoxGeometry | SphereGeometry, position: [number, number, number], visible = true) => {
  const mesh = new Mesh(geometry, new MeshBasicMaterial());
  mesh.position.set(...position);
  mesh.visible = visible;
  mesh.updateMatrixWorld(true);
  return mesh;
};

describe('BoundingBoxUtil', () => {
  let root: Object3D;

  beforeEach(() => {
    root = new Object3D();
  });

  describe('getBox()', () => {
    it.skip('should compute bounding box including invisible children when skipInvisible is false', () => {
      const visibleBox = new BoxGeometry(1, 1, 1);
      const invisibleBox = new BoxGeometry(1, 1, 1);
      const mesh1 = createMesh(visibleBox, [0, 0, 0], true);
      const mesh2 = createMesh(invisibleBox, [2, 0, 0], false);

      root.add(mesh1, mesh2);
      root.updateMatrixWorld(true);

      const box = BoundingBoxUtil.getBox(root, false);
      expect(box.min.x).toBeCloseTo(-0.5);
      expect(box.max.x).toBeCloseTo(2.5);
    });

    it.skip('should skip invisible children when skipInvisible is true', () => {
      const visibleBox = new BoxGeometry(1, 1, 1);
      const invisibleBox = new BoxGeometry(1, 1, 1);
      const mesh1 = createMesh(visibleBox, [0, 0, 0], true);
      const mesh2 = createMesh(invisibleBox, [2, 0, 0], false);

      root.add(mesh1, mesh2);
      root.updateMatrixWorld(true);

      const box = BoundingBoxUtil.getBox(root, true);
      expect(box.min.x).toBeCloseTo(-0.5);
      expect(box.max.x).toBeCloseTo(0.5);
    });
  });

  describe('getBoxWithoutTransform()', () => {
    it.skip('should ignore transforms when computing bounding box', () => {
      const mesh = createMesh(new BoxGeometry(1, 1, 1), [10, 0, 0]);
      root.add(mesh);
      root.position.set(100, 0, 0);
      root.updateMatrixWorld(true);

      const box = BoundingBoxUtil.getBoxWithoutTransform(root, false);
      expect(box.min.x).toBeCloseTo(9.5);
      expect(box.max.x).toBeCloseTo(10.5);
    });
  });

  describe('getRadius()', () => {
    it.skip('should compute scaled bounding sphere radius', () => {
      const mesh = createMesh(new SphereGeometry(1, 8, 8), [0, 0, 0]);
      mesh.scale.set(2, 2, 2);

      const radius = BoundingBoxUtil.getRadius(mesh, false);
      expect(radius).toBeCloseTo(2);
    });

    it('should return 0 for invisible object if skipInvisible is true', () => {
      const mesh = createMesh(new SphereGeometry(1, 8, 8), [0, 0, 0], false);

      const radius = BoundingBoxUtil.getRadius(mesh, true);
      expect(radius).toBe(0);
    });
  });

  describe('getRadiusWithoutTransform()', () => {
    it.skip('should ignore transform when computing radius', () => {
      const mesh = createMesh(new SphereGeometry(1, 8, 8), [10, 0, 0]);
      mesh.scale.set(3, 3, 3);

      const radius = BoundingBoxUtil.getRadiusWithoutTransform(mesh, false);
      expect(radius).toBeCloseTo(1);
    });
  });

  describe('getCapsule()', () => {
    it.skip('should compute capsule from bounding box', () => {
      const mesh = createMesh(new BoxGeometry(1, 4, 1), [0, 0, 0]);
      root.add(mesh);
      root.updateMatrixWorld(true);

      const capsule = BoundingBoxUtil.getCapsule(root, false);
      expect(capsule.radius).toBeCloseTo(0.5);
      expect(capsule.height).toBeCloseTo(4 - 2 * 0.5);
      expect(capsule.center.y).toBeCloseTo(0);
    });
  });

  describe('getCapsuleWithoutTransform()', () => {
    it.skip('should ignore transforms when computing capsule', () => {
      const mesh = createMesh(new BoxGeometry(2, 6, 2), [10, 0, 0]);
      root.add(mesh);
      root.position.set(50, 0, 0);
      root.updateMatrixWorld(true);

      const capsule = BoundingBoxUtil.getCapsuleWithoutTransform(root, false);
      expect(capsule.radius).toBeCloseTo(1);
      expect(capsule.height).toBeCloseTo(4);
      expect(capsule.center.x).toBeCloseTo(10);
    });
  });

  describe('calculateObjectsCenter()', () => {
    it('should compute center from multiple objects with geometry', () => {
      const mesh1 = createMesh(new BoxGeometry(1, 1, 1), [-2, 0, 0]);
      const mesh2 = createMesh(new BoxGeometry(1, 1, 1), [2, 0, 0]);

      const center = BoundingBoxUtil.calculateObjectsCenter([mesh1, mesh2]);
      expect(center.x).toBeCloseTo(0);
    });

    it.skip('should compute center from objects with no geometry', () => {
      const empty = new Object3D();
      empty.position.set(3, 0, 0);
      empty.updateMatrixWorld(true);

      const center = BoundingBoxUtil.calculateObjectsCenter([empty]);
      expect(center.x).toBeCloseTo(3);
    });
  });
});
