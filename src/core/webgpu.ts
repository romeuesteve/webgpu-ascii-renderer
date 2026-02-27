export async function initWebGPU(canvas: HTMLCanvasElement) {
  if (!navigator.gpu) {
    throw new Error('WebGPU not supported');
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('Failed to get GPU adapter');
  }

  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu') as GPUCanvasContext;
  
  if (!context) {
    throw new Error('Failed to get WebGPU context');
  }

  const format = navigator.gpu.getPreferredCanvasFormat();
  
  context.configure({
    device,
    format,
    alphaMode: 'premultiplied',
  });

  return { device, context, format };
}
