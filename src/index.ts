import Primitives from "./primitives";
import Renderer from "./renderer";
import Vec from "./vec";
import Mat4 from "./mat4";

// render object information
export interface RenderObject {
  visible: boolean,
  vertexBuffer: GPUBuffer,
  uvBuffer: GPUBuffer,
  normalBuffer: GPUBuffer,
  vertexCount: number,
  pipelineIndex: number,
}

// render bind group information
export interface RenderBindGroup {
  base: GPUBindGroup,
  entries: Array<GPUBuffer>,
}

// render pipeline information
export interface RenderPipeline {
  pipe: GPURenderPipeline,
  objects: Array<RenderObject>,
  maxObjCount: number,
  bindGroup0: RenderBindGroup,
  bindGroup1?: RenderBindGroup,
  bindGroup2?: RenderBindGroup,
  bindGroup3?: RenderBindGroup,
}

// primitives shape information
export interface Shape {
  vertices: Array<[number, number, number]>,
  uvs: Array<[number, number]>,
  normals: Array<[number, number, number]>,
}

export interface UpdateData {
  pipelineId: number,
  objectId: number,
  translate?: [number, number, number],
  rotateAxis?: [number, number, number],
  rotateDeg?: number,
  scale?: [number, number, number],
  visible?: boolean,
  camera?: Camera,
}

// camera information
interface CameraTransform {
  translate: [number, number, number],
  lookAt: [number, number, number],
  up: [number, number, number],
}
interface OrthoCamera {
  type: "ortho",
  near: number,
  far: number,
}
interface PerspCamera {
  type: "persp",
  fovY: number,
  near: number,
  far: number,
}
export interface CameraOptions {
  fovY?: number,
  near?: number,
  far?: number,
  translate?: [number, number, number],
  lookAt?: [number, number, number],
  up?: [number, number, number],
}
export type Camera = CameraTransform & (OrthoCamera | PerspCamera);

export { Primitives, Mat4, Vec, Renderer };