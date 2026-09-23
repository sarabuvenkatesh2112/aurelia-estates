import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Mesh, Vector3 } from 'three';
import { sceneSegment, sceneChapters } from '../lib/scene-config';
await test('camera interpolation is bounded, continuous and reversible across checkpoints', () => {
  const sample = (p: number) => {
    const { a, b, t } = sceneSegment(p);
    return sceneChapters[a].position.map(
      (v, i) => v + (sceneChapters[b].position[i] - v) * t,
    );
  };
  for (const p of [-0.1, 0, 0.18, 0.36, 0.57, 0.77, 1, 1.1])
    assert.ok(sample(p).every(Number.isFinite));
  for (const c of sceneChapters) {
    const exact = sample(c.at);
    assert.ok(exact.every((n, i) => Math.abs(n - c.position[i]) < 0.0001));
  }
  for (let i = 1; i <= 1000; i++) {
    const p = i / 1000;
    assert.ok(
      sample(p).every((n, k) => Math.abs(n - sample(p - 0.001)[k]) < 2),
    );
  }
  const forward = Array.from({ length: 101 }, (_, i) => sample(i / 100));
  assert.deepEqual(
    forward,
    Array.from({ length: 101 }, (_, i) => sample((100 - i) / 100)).reverse(),
  );
});
await test('exported GLB parses with complete named architecture inside the geometry budget', async () => {
  const file = readFileSync('public/models/aurelia-residence.glb');
  const buffer = file.buffer.slice(
    file.byteOffset,
    file.byteOffset + file.byteLength,
  );
  const gltf = await new GLTFLoader().parseAsync(buffer, '');
  for (const name of [
    'Aurelia_Building',
    'Floor_18_Highlight',
    'Floor_22_Highlight',
    'Hotspot_PrivateClub',
    'Hotspot_SkyTerrace',
    'Hotspot_Residences',
    'Hotspot_Landscape',
  ])
    assert.ok(gltf.scene.getObjectByName(name), name);
  const bounds = new Box3().setFromObject(gltf.scene).getSize(new Vector3());
  assert.ok(bounds.y > 90 && bounds.y < 100);
  let triangles = 0,
    meshes = 0;
  const materials = new Set();
  gltf.scene.traverse((o) => {
    if (o instanceof Mesh) {
      meshes++;
      triangles +=
        (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        materials.add(m.uuid);
      const normal = o.geometry.attributes.normal;
      assert.ok(normal && normal.count > 0);
    }
  });
  assert.ok(triangles < 150000);
  assert.ok(file.length < 10000000);
  assert.ok(materials.size <= 12);
  writeFileSync(
    'assets/blender/metrics.json',
    JSON.stringify(
      {
        triangles,
        materials: materials.size,
        meshObjects: meshes,
        glbBytes: file.length,
        textures: 0,
        heightMeters: bounds.y,
      },
      null,
      2,
    ) + '\n',
  );
});
