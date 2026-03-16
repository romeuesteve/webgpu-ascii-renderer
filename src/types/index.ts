export type RenderMode = 'ascii' | 'normal';

export interface ASCIIRendererOptions {
  canvas: HTMLCanvasElement;
  modelUrl: string;
  mode?: RenderMode;
  asciiWidth?: number;
  asciiHeight?: number;
  fontSize?: number;
  asciiChars?: string;
  asciiPattern?: string;
  gamma?: number;
  brightness?: number;
  bgColor?: string;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  initialDistance?: number;
  onError?: (error: Error) => void;
  onModeChange?: (mode: RenderMode) => void;
  onFPSUpdate?: (fps: number) => void;
}

export interface RendererState {
  mode: RenderMode;
  fps: number;
  isInitialized: boolean;
  isDisposed: boolean;
}

export interface WebGPUContext {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
}

export interface PipelineResources {
  asciiPipeline: any;
  normalPipeline: any;
  computePipeline: any;
  depthTexture: GPUTexture;
  normalDepthTexture: GPUTexture;
}
