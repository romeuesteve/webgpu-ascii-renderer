const DEFAULT_ASCII_CHARS = ' .:-=+*#%@@';
const DEFAULT_BRIGHTNESS = 2.5;
const GAMMA = 0.9;
const GRID_WIDTH = 120;
const GRID_HEIGHT = 80;

export interface TextRendererOptions {
  fontSize?: number;
  asciiChars?: string;
  brightness?: number;
  bgColor?: string;
}

export function createTextRenderer(
  canvas: HTMLCanvasElement,
  options: TextRendererOptions = {}
) {
  if (!canvas) {
    throw new Error('Canvas element is null');
  }

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D context from canvas');
  }

  const fontSize = options.fontSize || 12;
  let asciiChars = options.asciiChars || DEFAULT_ASCII_CHARS;
  let brightness = options.brightness !== undefined ? options.brightness : DEFAULT_BRIGHTNESS;
  const bgColor = options.bgColor || '#0a0a0a';

  let CELL_WIDTH = Math.round(fontSize * 8 / 12);
  let CELL_HEIGHT = fontSize;

  function updateCanvasSize() {
    canvas.width = GRID_WIDTH * CELL_WIDTH;
    canvas.height = GRID_HEIGHT * CELL_HEIGHT;
    ctx!.font = `${CELL_HEIGHT}px monospace`;
    ctx!.textBaseline = 'top';
    ctx!.textAlign = 'left';
  }

  updateCanvasSize();

  const colorBatches = new Map<string, Array<{char: string, x: number, y: number}>>();

  return {
    setFontSize(size: number) {
      CELL_HEIGHT = size;
      CELL_WIDTH = Math.round(size * 8 / 12);
      updateCanvasSize();
    },
    setAsciiChars(chars: string) {
      asciiChars = chars;
    },
    setBrightness(b: number) {
      brightness = b;
    },
    render(data: Float32Array) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      colorBatches.clear();

      for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          const index = (y * GRID_WIDTH + x) * 4;
          const charIndex = Math.floor(Math.max(0, Math.min(data[index], asciiChars.length - 1)));
          const r = Math.min(255, Math.floor(Math.pow(data[index + 1], GAMMA) * 255 * brightness));
          const g = Math.min(255, Math.floor(Math.pow(data[index + 2], GAMMA) * 255 * brightness));
          const b = Math.min(255, Math.floor(Math.pow(data[index + 3], GAMMA) * 255 * brightness));

          const char = asciiChars[Math.min(charIndex, asciiChars.length - 1)];
          const colorKey = (r << 16) | (g << 8) | b;

          let batch = colorBatches.get(colorKey.toString());
          if (!batch) {
            batch = [];
            colorBatches.set(colorKey.toString(), batch);
          }
          batch.push({ char, x: x * CELL_WIDTH, y: y * CELL_HEIGHT });
        }
      }

      for (const [colorKey, cells] of colorBatches) {
        const colorNum = parseInt(colorKey, 10);
        const r = (colorNum >> 16) & 0xFF;
        const g = (colorNum >> 8) & 0xFF;
        const b = colorNum & 0xFF;

        ctx.fillStyle = `rgb(${r},${g},${b})`;

        for (const cell of cells) {
          ctx.fillText(cell.char, cell.x, cell.y);
        }
      }
    },
  };
}
