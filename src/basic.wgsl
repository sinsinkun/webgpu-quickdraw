@group(0) @binding(0) var<uniform> modelMat: mat4x4<f32>;
@group(0) @binding(1) var<uniform> viewMat: mat4x4<f32>;
@group(0) @binding(2) var<uniform> projMat: mat4x4<f32>;
@group(0) @binding(3) var<uniform> uvSize: vec2f;
@group(0) @binding(4) var<uniform> color: vec4f;

struct VertOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@location(0) pos: vec2f) -> VertOut {
  var out: VertOut;
  let mvp = projMat * viewMat * modelMat;
  out.pos = mvp * vec4f(pos, 0, 1);
  out.uv = (pos + uvSize/2) / uvSize;
  return out;
}

@fragment
fn fragmentMain(input: VertOut) -> @location(0) vec4f {
  return vec4f(input.uv, 0.5, 0.8);
}