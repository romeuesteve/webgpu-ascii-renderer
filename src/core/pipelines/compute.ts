 import computeShader from '../../../shaders/ascii-compute.wgsl?raw';

const GRID_WIDTH = 120;
const GRID_HEIGHT = 80;

export interface ComputePipeline {
  pipeline: GPUComputePipeline;
  outputBuffer: GPUBuffer;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  workgroups: [number, number, number];
  gridWidth: number;
  gridHeight: number;
}

export function createComputePipeline(
  device: GPUDevice,
  inputTexture: GPUTextureView,
  gridWidth: number = GRID_WIDTH,
  gridHeight: number = GRID_HEIGHT
): ComputePipeline {
  const bufferSize = gridWidth * gridHeight * 16;
  
  const outputBuffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const uniformBufferSize = 32;
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        texture: { sampleType: 'unfilterable-float' },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'storage' },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'uniform' },
      },
    ],
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: inputTexture },
      { binding: 1, resource: { buffer: outputBuffer } },
      { binding: 2, resource: { buffer: uniformBuffer } },
    ],
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  const pipeline = device.createComputePipeline({
    layout: pipelineLayout,
    compute: {
      module: device.createShaderModule({ code: computeShader }),
      entryPoint: 'computeMain',
    },
  });

  const workgroupCountX = Math.ceil(gridWidth / 8);
  const workgroupCountY = Math.ceil(gridHeight / 8);

  return {
    pipeline,
    outputBuffer,
    uniformBuffer,
    bindGroup,
    workgroups: [workgroupCountX, workgroupCountY, 1],
    gridWidth,
    gridHeight,
  };
}

export async function readComputeOutput(
  device: GPUDevice,
  pipeline: ComputePipeline
): Promise<Float32Array> {
  const bufferSize = pipeline.gridWidth * pipeline.gridHeight * 16;
  const stagingBuffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  const commandEncoder = device.createCommandEncoder();
  commandEncoder.copyBufferToBuffer(
    pipeline.outputBuffer,
    0,
    stagingBuffer,
    0,
    bufferSize
  );

  device.queue.submit([commandEncoder.finish()]);

  await stagingBuffer.mapAsync(GPUMapMode.READ);
  const data = new Float32Array(stagingBuffer.getMappedRange().slice(0));
  stagingBuffer.unmap();

  return data;
}

export function updateUniforms(
  device: GPUDevice,
  pipeline: ComputePipeline,
  texWidth: number,
  texHeight: number,
  gamma: number = 1.0
): void {
  const cellWidth = texWidth / pipeline.gridWidth;
  const cellHeight = texHeight / pipeline.gridHeight;

  const uniforms = new Float32Array([
    texWidth,
    texHeight,
    cellWidth,
    cellHeight,
    pipeline.gridWidth,
    pipeline.gridHeight,
    gamma,
  ]);

  device.queue.writeBuffer(pipeline.uniformBuffer, 0, uniforms);
}
