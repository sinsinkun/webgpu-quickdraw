@group(0) @binding(0) var<uniform> mvp: MVP;

struct MVP {
  model: mat4x4<f32>,
  view: mat4x4<f32>,
  proj: mat4x4<f32>,
}

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
  let mvpMat = mvp.proj * mvp.view * mvp.model;
  out.pos = mvpMat * vec4f(input.pos, 1);
  out.uv = input.uv;
  out.normal = input.normal;
  return out;
}

@fragment
fn fragmentMain(input: VertOut) -> @location(0) vec4f {
  let n = (1.0 + input.normal) / 2.0;
  return vec4f(n, 0.8);
}