@group(0) @binding(0) var<uniform> modelMat: mat4x4<f32>;
@group(0) @binding(1) var<uniform> viewMat: mat4x4<f32>;
@group(0) @binding(2) var<uniform> projMat: mat4x4<f32>;

struct VertOut {
  @builtin(position) pos: vec4f,
  @location(0) fpos: vec4f,
}

@vertex
fn vertexMain(@location(0) pos: vec2f) -> VertOut {
  var out: VertOut;
  let mvp = projMat * viewMat * modelMat;
  out.pos = mvp * vec4f(pos, 0, 1);
  out.fpos = mvp * vec4f(pos, 0, 1);
  return out;
}

@fragment
fn fragmentMain(@location(0) fpos: vec4f) -> @location(0) vec4f {
  let shiftedpos = (1 + fpos) / 2;
  return vec4f(shiftedpos.xy, 0.5, 1);
}