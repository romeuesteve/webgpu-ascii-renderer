# WebGPU ASCII Renderer

A WebGPU-powered 3D ASCII renderer for the web. Transform any GLTF 3D model into beautiful ASCII art with real-time rendering and camera controls.

## Features

- 🎨 **Dual Rendering Modes**: Switch between ASCII art and normal 3D rendering
- 🖱️ **Interactive Camera**: Drag to rotate, scroll to zoom
- ⚡ **WebGPU Powered**: Hardware-accelerated rendering for maximum performance
- 🎛️ **Configurable**: Customize font size, ASCII characters, colors, and more
- 📦 **Easy Integration**: Simple API with sensible defaults
- 🎯 **TypeScript Support**: Full TypeScript definitions included
- 🚀 **Zero Dependencies**: Only requires WebGPU-compatible browser

## Browser Compatibility

Requires a WebGPU-compatible browser:
- Chrome 113+
- Firefox 113+
- Edge 113+

Check support with `isWebGPUSupported()`.

## Installation

```bash
npm install webgpu-ascii-renderer
```

## Quick Start

```typescript
import { ASCIIRenderer, isWebGPUSupported } from 'webgpu-ascii-renderer';

// Check WebGPU support
if (!isWebGPUSupported()) {
  console.error('WebGPU not supported');
}

// Create a canvas element
const canvas = document.getElementById('my-canvas') as HTMLCanvasElement;
canvas.width = 960;
canvas.height = 960;

// Initialize the renderer
const renderer = new ASCIIRenderer({
  canvas,
  modelUrl: '/path/to/model.glb',
  mode: 'ascii',
  fontSize: 12,
});

await renderer.init();
```

## API Reference

### ASCIIRenderer

Main renderer class for creating and controlling the ASCII renderer.

#### Constructor Options

```typescript
interface ASCIIRendererOptions {
  // Required
  canvas: HTMLCanvasElement;      // Canvas element to render to
  modelUrl: string;               // URL to GLTF/GLB model file
  
  // Optional - Rendering
  mode?: 'ascii' | 'normal';      // Initial render mode (default: 'ascii')
  asciiWidth?: number;            // ASCII grid width (default: 120)
  asciiHeight?: number;           // ASCII grid height (default: 80)
  fontSize?: number;              // Font size in pixels (default: 12)
  
  // Optional - Visuals
  asciiChars?: string;            // ASCII character set (default: ' .epflÄ')
  gamma?: number;                 // Gamma correction (default: 0.7)
  brightness?: number;            // Brightness multiplier (default: 2.5)
  bgColor?: string;               // Background color (default: '#0a0a0a')
  
  // Optional - Camera
  autoRotate?: boolean;           // Enable auto-rotation (default: true)
  autoRotateSpeed?: number;       // Rotation speed (default: 0.005)
  initialDistance?: number;       // Initial camera distance (default: 8)
  
  // Optional - Callbacks
  onError?: (error: Error) => void;
  onModeChange?: (mode: 'ascii' | 'normal') => void;
  onFPSUpdate?: (fps: number) => void;
}
```

#### Methods

##### `async init(): Promise<void>`
Initialize the renderer and start the render loop.

```typescript
await renderer.init();
```

##### `dispose(): void`
Clean up resources and stop rendering.

```typescript
renderer.dispose();
```

##### `setMode(mode: 'ascii' | 'normal'): void`
Switch between ASCII and normal rendering modes.

```typescript
renderer.setMode('normal');
```

##### `getMode(): 'ascii' | 'normal'`
Get the current render mode.

```typescript
const mode = renderer.getMode();
```

##### `setFontSize(size: number): void`
Change the ASCII font size at runtime.

```typescript
renderer.setFontSize(16);
```

##### `setAsciiChars(chars: string): void`
Change the ASCII character set at runtime.

```typescript
renderer.setAsciiChars(' .:-=+*#%@');
```

##### `setDistance(distance: number): void`
Set the camera distance.

```typescript
renderer.setDistance(5);
```

##### `setRotation(x: number, y: number): void`
Set the camera rotation angles (in radians).

```typescript
renderer.setRotation(Math.PI / 4, 0);
```

##### `getFPS(): number`
Get the current frames per second.

```typescript
const fps = renderer.getFPS();
console.log(`Running at ${fps} FPS`);
```

##### `getASCIICanvas(): HTMLCanvasElement`
Get the ASCII canvas element for custom positioning.

```typescript
const asciiCanvas = renderer.getASCIICanvas();
document.body.appendChild(asciiCanvas);
```

#### Static Methods

##### `static isWebGPUSupported(): boolean`
Check if WebGPU is supported in the current browser.

```typescript
if (ASCIIRenderer.isWebGPUSupported()) {
  // WebGPU is available
}
```

## Examples

### Basic Usage

```typescript
import { ASCIIRenderer } from 'webgpu-ascii-renderer';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = 960;
canvas.height = 960;

const renderer = new ASCIIRenderer({
  canvas,
  modelUrl: '/models/apple.glb',
});

await renderer.init();
```

### With Event Callbacks

```typescript
const renderer = new ASCIIRenderer({
  canvas,
  modelUrl: '/models/apple.glb',
  onError: (error) => {
    console.error('Renderer error:', error);
  },
  onModeChange: (mode) => {
    console.log('Mode changed to:', mode);
  },
  onFPSUpdate: (fps) => {
    console.log('Current FPS:', fps);
  },
});

await renderer.init();
```

### Mode Toggle Button

```typescript
const toggleButton = document.getElementById('toggle-btn');

toggleButton.addEventListener('click', () => {
  const currentMode = renderer.getMode();
  const newMode = currentMode === 'ascii' ? 'normal' : 'ascii';
  renderer.setMode(newMode);
});
```

### Custom Styling

```typescript
const renderer = new ASCIIRenderer({
  canvas,
  modelUrl: '/models/apple.glb',
  fontSize: 16,
  asciiChars: ' .:-=+*#%@',
  gamma: 1.0,
  brightness: 3.0,
  bgColor: '#000000',
  autoRotate: false,
});

await renderer.init();
```

### React Integration

```typescript
import { useEffect, useRef } from 'react';
import { ASCIIRenderer } from 'webgpu-ascii-renderer';

function ASCIIViewer({ modelUrl }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ASCIIRenderer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new ASCIIRenderer({
      canvas: canvasRef.current,
      modelUrl,
    });

    renderer.init().then(() => {
      rendererRef.current = renderer;
    });

    return () => {
      renderer.dispose();
    };
  }, [modelUrl]);

  return <canvas ref={canvasRef} width={960} height={960} />;
}
```

### Vue Integration

```vue
<template>
  <canvas ref="canvasRef" width="960" height="960"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ASCIIRenderer } from 'webgpu-ascii-renderer';

const canvasRef = ref<HTMLCanvasElement>();
let renderer: ASCIIRenderer | null = null;

onMounted(async () => {
  if (!canvasRef.value) return;

  renderer = new ASCIIRenderer({
    canvas: canvasRef.value,
    modelUrl: '/models/apple.glb',
  });

  await renderer.init();
});

onUnmounted(() => {
  renderer?.dispose();
});
</script>
```

## Model Requirements

The renderer supports GLTF/GLB models with:
- Standard mesh geometry (positions, normals, UVs)
- Optional base color texture
- Triangular faces

Models should be optimized for web use:
- Keep triangle count reasonable (< 100k for smooth performance)
- Use compressed textures (KTX2, WebP) when possible
- Consider using mesh simplification for complex models

## Performance Tips

1. **Adjust Grid Size**: Lower `asciiWidth` and `asciiHeight` for better performance
2. **Disable Auto-Rotate**: Set `autoRotate: false` when not needed
3. **Simplify Models**: Use optimized GLTF models with fewer triangles
4. **Reduce Texture Size**: Smaller textures improve performance
5. **Monitor FPS**: Use `onFPSUpdate` callback to track performance

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please use the GitHub issue tracker.
