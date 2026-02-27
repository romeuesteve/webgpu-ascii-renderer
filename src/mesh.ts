export interface Mesh {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array | Uint32Array;
}

export function createCubeMesh(): Mesh {
  const positions = new Float32Array([
    -1, -1, -1,  1, -1, -1,  1,  1, -1, -1,  1, -1,
    -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,  1,
    -1, -1, -1, -1,  1, -1, -1,  1,  1, -1, -1,  1,
     1, -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,
    -1, -1, -1,  1, -1, -1,  1, -1,  1, -1, -1,  1,
    -1,  1, -1,  1,  1, -1,  1,  1,  1, -1,  1,  1,
  ]);

  const normals = new Float32Array([
    0,  0, -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,
    0,  0,  1,  0,  0,  1,  0,  0,  1,  0,  0,  1,
   -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,  0,  0,
    1,  0,  0,  1,  0,  0,  1,  0,  0,  1,  0,  0,
    0, -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,  0,
    0,  1,  0,  0,  1,  0,  0,  1,  0,  0,  1,  0,
  ]);

  const uvs = new Float32Array([
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
  ]);

  const indices = new Uint16Array([
    0,  2,  1,  0,  3,  2,
    4,  6,  5,  4,  7,  6,
    8,  10, 9,  8,  11, 10,
    12, 14, 13, 12, 15, 14,
    16, 18, 17, 16, 19, 18,
    20, 22, 21, 20, 23, 22,
  ]);

  return { positions, normals, uvs, indices };
}

export function createTorusMesh(majorRadius: number = 1.0, minorRadius: number = 0.3, majorSegments: number = 32, minorSegments: number = 16): Mesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= majorSegments; i++) {
    const u = (i / majorSegments) * Math.PI * 2;
    const cosU = Math.cos(u);
    const sinU = Math.sin(u);

    for (let j = 0; j <= minorSegments; j++) {
      const v = (j / minorSegments) * Math.PI * 2;
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      const x = (majorRadius + minorRadius * cosV) * cosU;
      const y = minorRadius * sinV;
      const z = (majorRadius + minorRadius * cosV) * sinU;

      const nx = cosV * cosU;
      const ny = sinV;
      const nz = cosV * sinU;

      positions.push(x, y, z);
      normals.push(nx, ny, nz);
      uvs.push(i / majorSegments, j / minorSegments);
    }
  }

  for (let i = 0; i < majorSegments; i++) {
    for (let j = 0; j < minorSegments; j++) {
      const a = i * (minorSegments + 1) + j;
      const b = a + minorSegments + 1;
      const c = a + 1;
      const d = b + 1;

      indices.push(a, c, b);
      indices.push(c, d, b);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}
