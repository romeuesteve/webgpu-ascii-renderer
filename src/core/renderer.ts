import { initWebGPU } from './webgpu.js';
import { createRenderPipeline, updateUniforms as updateRenderUniforms } from './pipelines/render.js';
import { createComputePipeline, readComputeOutput, updateUniforms as updateComputeUniforms } from './pipelines/compute.js';
import { createTextRenderer } from '../utils/text-renderer.js';
import { Camera } from './camera.js';
import type { ASCIIRendererOptions, RenderMode, WebGPUContext, PipelineResources } from '../types/index.js';

const DEFAULT_ASCII_WIDTH = 120;
const DEFAULT_ASCII_HEIGHT = 80;
const DEFAULT_FONT_SIZE = 12;
const DEFAULT_GAMMA = 0.7;
const DEFAULT_BRIGHTNESS = 2.5;
const DEFAULT_BG_COLOR = '#0a0a0a';
const DEFAULT_AUTO_ROTATE_SPEED = 0.005;
const DEFAULT_INITIAL_DISTANCE = 8;

export class ASCIIRenderer {
  private options: Required<ASCIIRendererOptions>;
  private canvas: HTMLCanvasElement;
  private asciiCanvas: HTMLCanvasElement;
  private state: {
    mode: RenderMode;
    fps: number;
    isInitialized: boolean;
    isDisposed: boolean;
    frameCount: number;
    lastTime: number;
  };
  
  private webgpuContext: WebGPUContext | null = null;
  private camera: Camera | null = null;
  private textRenderer: ReturnType<typeof createTextRenderer> | null = null;
  private pipelines: PipelineResources | null = null;
  private animationFrameId: number | null = null;

  constructor(options: ASCIIRendererOptions) {
    this.canvas = options.canvas;
    this.asciiCanvas = document.createElement('canvas');
    
    this.state = {
      mode: options.mode || 'ascii',
      fps: 0,
      isInitialized: false,
      isDisposed: false,
      frameCount: 0,
      lastTime: performance.now(),
    };

    this.options = {
      canvas: options.canvas,
      modelUrl: options.modelUrl,
      mode: options.mode || 'ascii',
      asciiWidth: options.asciiWidth || DEFAULT_ASCII_WIDTH,
      asciiHeight: options.asciiHeight || DEFAULT_ASCII_HEIGHT,
      fontSize: options.fontSize || DEFAULT_FONT_SIZE,
      asciiChars: options.asciiChars || ' .epflÄ',
      gamma: options.gamma !== undefined ? options.gamma : DEFAULT_GAMMA,
      brightness: options.brightness !== undefined ? options.brightness : DEFAULT_BRIGHTNESS,
      bgColor: options.bgColor || DEFAULT_BG_COLOR,
      autoRotate: options.autoRotate !== undefined ? options.autoRotate : true,
      autoRotateSpeed: options.autoRotateSpeed || DEFAULT_AUTO_ROTATE_SPEED,
      initialDistance: options.initialDistance || DEFAULT_INITIAL_DISTANCE,
      onError: options.onError || ((error: Error) => console.error('ASCIIRenderer error:', error)),
      onModeChange: options.onModeChange || (() => {}),
      onFPSUpdate: options.onFPSUpdate || (() => {}),
    };
  }

  async init(): Promise<void> {
    if (this.state.isInitialized) {
      throw new Error('ASCIIRenderer is already initialized');
    }

    if (this.state.isDisposed) {
      throw new Error('ASCIIRenderer has been disposed and cannot be reinitialized');
    }

    try {
      await this.initializeWebGPU();
      await this.initializePipelines();
      this.initializeCamera();
      this.initializeTextRenderer();
      this.startRenderLoop();
      
      this.state.isInitialized = true;
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private async initializeWebGPU(): Promise<void> {
    this.webgpuContext = await initWebGPU(this.canvas);
  }

  private async initializePipelines(): Promise<void> {
    if (!this.webgpuContext) {
      throw new Error('WebGPU context not initialized');
    }

    const { device, format } = this.webgpuContext;
    const { asciiWidth, asciiHeight, gamma, modelUrl } = this.options;

    this.asciiCanvas.width = asciiWidth * 8;
    this.asciiCanvas.height = asciiHeight * 12;

    const asciiPipeline = await createRenderPipeline(device, 'rgba8unorm', modelUrl, asciiWidth, asciiHeight);
    const normalPipeline = await createRenderPipeline(device, format, modelUrl, asciiWidth, asciiHeight);
    const computePipeline = createComputePipeline(device, asciiPipeline.textureView, asciiWidth, asciiHeight);
    
    updateComputeUniforms(device, computePipeline, asciiWidth, asciiHeight, gamma);

    const depthTexture = device.createTexture({
      size: [asciiWidth, asciiHeight, 1],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const normalDepthTexture = device.createTexture({
      size: [this.canvas.width, this.canvas.height, 1],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.pipelines = {
      asciiPipeline,
      normalPipeline,
      computePipeline,
      depthTexture,
      normalDepthTexture,
    };
  }

  private initializeCamera(): void {
    this.camera = new Camera(this.asciiCanvas, {
      initialDistance: this.options.initialDistance,
      autoRotateSpeed: this.options.autoRotateSpeed,
    });
    this.camera.attachCanvas(this.canvas);
  }

  private initializeTextRenderer(): void {
    this.textRenderer = createTextRenderer(this.asciiCanvas, {
      fontSize: this.options.fontSize,
      asciiChars: this.options.asciiChars,
      brightness: this.options.brightness,
      bgColor: this.options.bgColor,
    });
  }

  private startRenderLoop(): void {
    const render = () => {
      if (this.state.isDisposed) {
        return;
      }

      this.update();
      this.render();

      this.animationFrameId = requestAnimationFrame(render);
    };

    render();
  }

  private update(): void {
    if (!this.camera) return;

    this.camera.update();

    const now = performance.now();
    this.state.frameCount++;

    if (now - this.state.lastTime >= 1000) {
      this.state.fps = this.state.frameCount;
      this.options.onFPSUpdate(this.state.fps);
      this.state.frameCount = 0;
      this.state.lastTime = now;
    }
  }

  private render(): void {
    if (!this.webgpuContext || !this.camera || !this.pipelines || !this.textRenderer) {
      return;
    }

    const { device, context } = this.webgpuContext;
    const { asciiPipeline, normalPipeline, computePipeline, depthTexture, normalDepthTexture } = this.pipelines;
    const { asciiWidth, asciiHeight } = this.options;

    const charAspect = (8 / 12);
    const gridAspect = (asciiWidth / asciiHeight);
    const aspect = gridAspect * charAspect;

    const projection = this.camera.getProjectionMatrix(aspect);
    const view = this.camera.getViewMatrix();
    const model = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

    const mvp = this.multiplyMatrices(projection, view);

    updateRenderUniforms(device, asciiPipeline, mvp, model);
    updateRenderUniforms(device, normalPipeline, mvp, model);

    const commandEncoder = device.createCommandEncoder();

    if (this.state.mode === 'ascii') {
      this.renderASCII(commandEncoder, asciiPipeline, computePipeline, depthTexture);
    } else {
      this.renderNormal(commandEncoder, normalPipeline, normalDepthTexture, context);
    }

    device.queue.submit([commandEncoder.finish()]);
  }

  private renderASCII(
    commandEncoder: GPUCommandEncoder,
    asciiPipeline: any,
    computePipeline: any,
    depthTexture: GPUTexture
  ): void {
    if (!this.webgpuContext || !this.textRenderer) return;

    const { device } = this.webgpuContext;
    const { asciiWidth, asciiHeight } = this.options;

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: asciiPipeline.textureView,
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    renderPass.setPipeline(asciiPipeline.pipeline);
    renderPass.setBindGroup(0, asciiPipeline.bindGroup);
    renderPass.setVertexBuffer(0, asciiPipeline.positionBuffer);
    renderPass.setVertexBuffer(1, asciiPipeline.normalBuffer);
    renderPass.setVertexBuffer(2, asciiPipeline.uvBuffer);
    renderPass.setIndexBuffer(asciiPipeline.indexBuffer, asciiPipeline.indexFormat);
    renderPass.setViewport(0, 0, asciiWidth, asciiHeight, 0, 1);
    renderPass.setScissorRect(0, 0, asciiWidth, asciiHeight);
    renderPass.drawIndexed(asciiPipeline.indexCount);
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);

    device.queue.onSubmittedWorkDone().then(() => {
      const computeEncoder = device.createCommandEncoder();
      const computePass = computeEncoder.beginComputePass();
      computePass.setPipeline(computePipeline.pipeline);
      computePass.setBindGroup(0, computePipeline.bindGroup);
      computePass.dispatchWorkgroups(computePipeline.workgroups[0], computePipeline.workgroups[1], computePipeline.workgroups[2]);
      computePass.end();
      device.queue.submit([computeEncoder.finish()]);

      return readComputeOutput(device, computePipeline);
    }).then((asciiData) => {
      this.textRenderer!.render(asciiData);
    });
  }

  private renderNormal(
    commandEncoder: GPUCommandEncoder,
    normalPipeline: any,
    normalDepthTexture: GPUTexture,
    context: GPUCanvasContext
  ): void {
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: normalDepthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    renderPass.setPipeline(normalPipeline.pipeline);
    renderPass.setBindGroup(0, normalPipeline.bindGroup);
    renderPass.setVertexBuffer(0, normalPipeline.positionBuffer);
    renderPass.setVertexBuffer(1, normalPipeline.normalBuffer);
    renderPass.setVertexBuffer(2, normalPipeline.uvBuffer);
    renderPass.setIndexBuffer(normalPipeline.indexBuffer, normalPipeline.indexFormat);
    renderPass.setViewport(0, 0, this.canvas.width, this.canvas.height, 0, 1);
    renderPass.setScissorRect(0, 0, this.canvas.width, this.canvas.height);
    renderPass.drawIndexed(normalPipeline.indexCount);
    renderPass.end();
  }

  private multiplyMatrices(a: Float32Array, b: Float32Array): Float32Array {
    const result = new Float32Array(16);
    
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i * 4 + j] = 
          a[0 * 4 + j] * b[i * 4 + 0] +
          a[1 * 4 + j] * b[i * 4 + 1] +
          a[2 * 4 + j] * b[i * 4 + 2] +
          a[3 * 4 + j] * b[i * 4 + 3];
      }
    }
    
    return result;
  }

  private handleError(error: Error): void {
    this.options.onError(error);
  }

  setMode(mode: RenderMode): void {
    if (this.state.mode !== mode) {
      this.state.mode = mode;
      this.options.onModeChange(mode);
    }
  }

  getMode(): RenderMode {
    return this.state.mode;
  }

  setDistance(distance: number): void {
    if (this.camera) {
      this.camera.setDistance(distance);
    }
  }

  setRotation(x: number, y: number): void {
    if (this.camera) {
      this.camera.setRotation(x, y);
    }
  }

  setFontSize(size: number): void {
    if (this.textRenderer) {
      this.textRenderer.setFontSize(size);
    }
  }

  setAsciiChars(chars: string): void {
    if (this.textRenderer) {
      this.textRenderer.setAsciiChars(chars);
    }
  }

  getFPS(): number {
    return this.state.fps;
  }

  static isWebGPUSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  getASCIICanvas(): HTMLCanvasElement {
    return this.asciiCanvas;
  }

  dispose(): void {
    if (this.state.isDisposed) {
      return;
    }

    this.state.isDisposed = true;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.camera) {
      this.camera.dispose();
      this.camera = null;
    }

    this.textRenderer = null;
    this.pipelines = null;
    this.webgpuContext = null;
  }
}
