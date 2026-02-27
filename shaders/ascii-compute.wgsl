struct ComputeInput {
  @builtin(global_invocation_id) global_id: vec3<u32>,
};

struct Uniforms {
  tex_width: f32,
  tex_height: f32,
  cell_width: f32,
  cell_height: f32,
  grid_width: u32,
  grid_height: u32,
  gamma: f32,
};

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var<storage, read_write> outputBuf: array<vec4<f32>>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

const GRID_WIDTH: u32 = 120u;
const GRID_HEIGHT: u32 = 80u;

const BRIGHTNESS_LUT: array<f32, 10> = array<f32, 10>(
  0.0,  // 0.0 - ' '
  1.0,  // 0.1 - '.'
  2.0,  // 0.2 - ':'
  3.0,  // 0.3 - '-'
  4.0,  // 0.4 - '='
  5.0,  // 0.5 - '+'
  6.0,  // 0.6 - '*'
  7.0,  // 0.7 - '#'
  8.0,  // 0.8 - '%'
  9.0,  // 0.9 - '@'
);

fn brightness_to_char(brightness: f32) -> f32 {
  let index = u32(brightness * 10.0);
  let clamped_index = min(index, 9u);
  return BRIGHTNESS_LUT[clamped_index];
}

@compute
@workgroup_size(8, 8, 1)
fn computeMain(input: ComputeInput) {
  let x = input.global_id.x;
  let y = input.global_id.y;

  if (x >= GRID_WIDTH || y >= GRID_HEIGHT) {
    return;
  }

  let cell_width = uniforms.cell_width;
  let cell_height = uniforms.cell_height;

  let px = u32(f32(x) * cell_width + cell_width * 0.5);
  let py = u32(f32(y) * cell_height + cell_height * 0.5);
  let color = textureLoad(inputTex, vec2<i32>(i32(px), i32(py)), 0);

  let brightness = dot(color.rgb, vec3<f32>(0.299, 0.587, 0.114));
  let adjusted_brightness = pow(brightness, uniforms.gamma);

  let char_index = brightness_to_char(adjusted_brightness);
  let index = y * GRID_WIDTH + x;

  outputBuf[index] = vec4<f32>(char_index, color.r, color.g, color.b);
}
