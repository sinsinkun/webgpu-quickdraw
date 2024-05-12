@group(0) @binding(0) var<uniform> modelMat: mat4x4<f32>;
@group(0) @binding(1) var<uniform> viewMat: mat4x4<f32>;
@group(0) @binding(2) var<uniform> projMat: mat4x4<f32>;
@group(0) @binding(3) var<uniform> color: vec4f;

struct VertIn {
  @location(0) pos: vec3f,
  @location(1) uv: vec2f,
  @location(2) normal: vec3f,
}

struct VertOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
}

@vertex
fn vertexMain(input: VertIn) -> VertOut {
  var out: VertOut;
  let mvp = projMat * viewMat * modelMat;
  out.pos = mvp * vec4f(input.pos, 1);
  out.uv = input.uv;
  out.normal = input.normal;
  return out;
}

@fragment
fn fragmentMain(input: VertOut) -> @location(0) vec4f {
  return vec4f(input.uv, 0.5, 0.8);
}