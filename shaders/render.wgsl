struct Uniforms {
  modelViewProjectionMatrix: mat4x4<f32>,
  modelMatrix: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var baseColorTexture: texture_2d<f32>;
@group(0) @binding(2) var baseColorSampler: sampler;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
};

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = uniforms.modelViewProjectionMatrix * vec4<f32>(input.position, 1.0);
  output.worldPos = (uniforms.modelMatrix * vec4<f32>(input.position, 1.0)).xyz;
  output.normal = (uniforms.modelMatrix * vec4<f32>(input.normal, 0.0)).xyz;
  output.uv = input.uv;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  let lightDir = normalize(vec3<f32>(1.0, 1.0, 1.0));
  let normal = normalize(input.normal);

  let ambient = 0.2;
  let diffuse = max(dot(normal, lightDir), 0.0) * 0.8;
  let lighting = ambient + diffuse;

  let textureColor = textureSample(baseColorTexture, baseColorSampler, input.uv).rgb;
  let finalColor = textureColor * lighting;

  return vec4<f32>(finalColor, 1.0);
}
