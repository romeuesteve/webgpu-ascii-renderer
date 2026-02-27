 import { WebIO } from '@gltf-transform/core';
import type { Mesh } from '../mesh.js';

export interface TexturedMesh {
  mesh: Mesh;
  baseColorTexture?: ImageBitmap;
}

export async function loadGLBMesh(url: string): Promise<TexturedMesh> {
  const io = new WebIO();


  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const document = await io.readBinary(new Uint8Array(arrayBuffer));

  const root = document.getRoot();
  const scenes = root.listScenes();

  console.log('Debug: Scenes:', scenes.length);
  
  if (scenes.length === 0) {
    throw new Error('GLB file contains no scenes');
  }

  const scene = scenes[0];
  const nodes = scene.listChildren();
  
  console.log('Debug: Nodes in scene:', nodes.length);
  for (const node of nodes) {
    const mesh = node.getMesh();
    console.log('Debug: Node has mesh:', !!mesh, mesh?.getName());
  }

  let meshData: Mesh | null = null;
  let baseColorImageBitmap: ImageBitmap | undefined;

  // Recursively search for mesh in scene graph
  async function searchNodes(nodes: any[]): Promise<boolean> {
    for (const node of nodes) {
      const mesh = node.getMesh();
      if (mesh) {
        const primitives = mesh.listPrimitives();
        if (primitives.length > 0) {
          const primitive = primitives[0];

          const positionsAttr = primitive.getAttribute('POSITION');
          const normalsAttr = primitive.getAttribute('NORMAL');
          const uvsAttr = primitive.getAttribute('TEXCOORD_0');
          const indicesAttr = primitive.getIndices();

          if (!positionsAttr || !normalsAttr || !indicesAttr) {
            throw new Error('Mesh missing required attributes (POSITION, NORMAL, or indices)');
          }

          let positions = positionsAttr.getArray() as Float32Array;
          const normals = normalsAttr.getArray() as Float32Array;
          let uvs = uvsAttr?.getArray() as Float32Array | undefined;
          let indices = indicesAttr.getArray() as Uint16Array | Uint32Array;

          if (!uvs) {
            uvs = new Float32Array(positions.length / 3 * 2);
          }

          positions = autoScaleAndCenterMesh(positions);

          meshData = {
            positions,
            normals,
            uvs,
            indices,
          };

          // Load base color texture
          const material = primitive.getMaterial();
          if (material) {
            const baseColorTexture = material.getBaseColorTexture();
            if (baseColorTexture) {
              const image = baseColorTexture.getImage();
              if (image) {
                const blob = new Blob([image], { type: baseColorTexture.getMimeType() });
                baseColorImageBitmap = await createImageBitmap(blob);
                console.log('Loaded base color texture:', baseColorImageBitmap.width, 'x', baseColorImageBitmap.height);
              }
            }
          }

          return true; // Found and processed
        }
      }

      // Search children recursively
      if (node.listChildren().length > 0) {
        if (await searchNodes(node.listChildren())) {
          return true;
        }
      }
    }
    return false;
  }

  await searchNodes(nodes);

  if (!meshData) {
    throw new Error('GLB file contains no mesh data');
  }

  return {
    mesh: meshData,
    baseColorTexture: baseColorImageBitmap,
  };
}

function autoScaleAndCenterMesh(positions: Float32Array): Float32Array {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;

  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const sizeZ = maxZ - minZ;
  const maxSize = Math.max(sizeX, sizeY, sizeZ);

  const targetSize = 2.4;
  const scale = targetSize / maxSize;

  const scaled = new Float32Array(positions.length);

  for (let i = 0; i < positions.length; i += 3) {
    scaled[i] = (positions[i] - centerX) * scale;
    scaled[i + 1] = (positions[i + 1] - centerY) * scale;
    scaled[i + 2] = (positions[i + 2] - centerZ) * scale;
  }

  return scaled;
}
