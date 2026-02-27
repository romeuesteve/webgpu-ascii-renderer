 import { loadGLBMesh } from '../../utils/gltf-loader.js';
import renderShader from '../../../shaders/render.wgsl?raw';

const GRID_WIDTH = 120;
const GRID_HEIGHT = 80;

export interface RenderPipeline {
  pipeline: GPURenderPipeline;
  positionBuffer: GPUBuffer;
  normalBuffer: GPUBuffer;
  uvBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  indexCount: number;
  indexFormat: GPUIndexFormat;
  texture: GPUTexture;
  textureView: GPUTextureView;
  baseColorTexture: GPUTexture;
  baseColorTextureView: GPUTextureView;
  sampler: GPUSampler;
}

export async function createRenderPipeline(device: GPUDevice, format: GPUTextureFormat, modelUrl: string, gridWidth: number = GRID_WIDTH, gridHeight: number = GRID_HEIGHT): Promise<RenderPipeline> {
  const texturedMesh = await loadGLBMesh(modelUrl);
  const mesh = texturedMesh.mesh;

  // Align buffer sizes to 4-byte multiples for WebGPU
  const alignedPositionsSize = Math.ceil(mesh.positions.byteLength / 4) * 4;
  const alignedNormalsSize = Math.ceil(mesh.normals.byteLength / 4) * 4;
  const alignedUVsSize = Math.ceil(mesh.uvs.byteLength / 4) * 4;
  const alignedIndicesSize = Math.ceil(mesh.indices.byteLength / 4) * 4;

  console.log('Buffer sizes (original):', {
    positions: mesh.positions.byteLength,
    normals: mesh.normals.byteLength,
    uvs: mesh.uvs.byteLength,
    indices: mesh.indices.byteLength,
  });
  console.log('Buffer sizes (aligned):', {
    positions: alignedPositionsSize,
    normals: alignedNormalsSize,
    uvs: alignedUVsSize,
    indices: alignedIndicesSize,
  });

  // Determine index format and create appropriate aligned TypedArray
  const indexFormat = mesh.indices instanceof Uint32Array ? 'uint32' : 'uint16';
  const alignedIndices = indexFormat === 'uint32'
    ? new Uint32Array(alignedIndicesSize / 4)
    : new Uint16Array(alignedIndicesSize / 2);

  // Create padded TypedArrays to ensure 4-byte alignment
  const alignedPositions = new Float32Array(alignedPositionsSize / 4);
  const alignedNormals = new Float32Array(alignedNormalsSize / 4);
  const alignedUVs = new Float32Array(alignedUVsSize / 4);

  alignedPositions.set(mesh.positions);
  alignedNormals.set(mesh.normals);
  alignedUVs.set(mesh.uvs);
  alignedIndices.set(mesh.indices);

  const positionBuffer = device.createBuffer({
    size: alignedPositionsSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const normalBuffer = device.createBuffer({
    size: alignedNormalsSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  const uvBuffer = device.createBuffer({
    size: alignedUVsSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(positionBuffer, 0, alignedPositions.buffer);
  device.queue.writeBuffer(normalBuffer, 0, alignedNormals.buffer);
  device.queue.writeBuffer(uvBuffer, 0, alignedUVs.buffer);

  const indexBuffer = device.createBuffer({
    size: alignedIndicesSize,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(indexBuffer, 0, alignedIndices.buffer);

  // Create GPU texture from base color image
  let baseColorTexture: GPUTexture;
  let baseColorTextureView: GPUTextureView;

  if (texturedMesh.baseColorTexture) {
    baseColorTexture = device.createTexture({
      size: [texturedMesh.baseColorTexture.width, texturedMesh.baseColorTexture.height, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    device.queue.copyExternalImageToTexture(
      { source: texturedMesh.baseColorTexture },
      { texture: baseColorTexture },
      [texturedMesh.baseColorTexture.width, texturedMesh.baseColorTexture.height]
    );

    baseColorTextureView = baseColorTexture.createView();
  } else {
    // Create a default 1x1 white texture
    baseColorTexture = device.createTexture({
      size: [1, 1, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    device.queue.writeTexture(
      { texture: baseColorTexture },
      new Uint8Array([255, 255, 255, 255]),
      { bytesPerRow: 4, rowsPerImage: 1 },
      [1, 1, 1]
    );

    baseColorTextureView = baseColorTexture.createView();
  }

  // Create sampler
  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
  });

  const uniformBufferSize = 128 + 64;
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const texture = device.createTexture({
    size: [gridWidth, gridHeight],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });

  const textureView = texture.createView();

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: 'float' },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: { type: 'filtering' },
      },
    ],
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: baseColorTextureView },
      { binding: 2, resource: sampler },
    ],
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module: device.createShaderModule({ code: renderShader }),
      entryPoint: 'vertexMain',
      buffers: [{
        arrayStride: 12,
        attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
      }, {
        arrayStride: 12,
        attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }],
      }, {
        arrayStride: 8,
        attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x2' }],
      }],
    },
    fragment: {
      module: device.createShaderModule({ code: renderShader }),
      entryPoint: 'fragmentMain',
      targets: [{
        format: format,
      }],
    },
    primitive: {
      topology: 'triangle-list',
      cullMode: 'none',
    },
    depthStencil: {
      format: 'depth24plus',
      depthWriteEnabled: true,
      depthCompare: 'less',
    },
  });

  return {
    pipeline,
    positionBuffer,
    normalBuffer,
    uvBuffer,
    indexBuffer,
    uniformBuffer,
    bindGroup,
    indexCount: mesh.indices.length,
    indexFormat,
    texture,
    textureView,
    baseColorTexture,
    baseColorTextureView,
    sampler,
  };
}

export function updateUniforms(device: GPUDevice, pipeline: RenderPipeline, mvp: Float32Array, model: Float32Array) {
  device.queue.writeBuffer(pipeline.uniformBuffer, 0, mvp.buffer);
  device.queue.writeBuffer(pipeline.uniformBuffer, 64, model.buffer);
}
