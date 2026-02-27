export { ASCIIRenderer } from './core/renderer.js';
export { Camera } from './core/camera.js';
export { initWebGPU } from './core/webgpu.js';
export type { ASCIIRendererOptions, RenderMode, RendererState, WebGPUContext } from './types/index.js';

export function isWebGPUSupported(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}
