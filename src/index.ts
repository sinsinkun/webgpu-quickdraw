import Primitives from "./primitives";
import Renderer from "./renderer";
import Vec from "./vec";
import Mat4 from "./mat4";
import ModelLoader from "./modelLoader";

// structs for obj
export interface VertexGroup {
  vertex: [number, number, number],
  uv: [number, number],
  normal: [number, number, number],
}

// structs for gltf
export interface GltfPrimitive {
  attributes: any,
  indices: number,
}

export interface GltfMesh {
  name: string,
  primitives: Array<GltfPrimitive>,
}

export interface GltfBuffer {
  byteLength: number,
  uri: string,
}

export interface GltfBufferView {
  buffer: number,
  byteLength: number,
  byteOffset: number,
  target: number,
}

export interface GltfAccessor {
  bufferView: number,
  componentType: number,
  count: number,
  type: string,
  [key: string]: any
}

export interface GltfData {
  accessors: Array<GltfAccessor>,
  bufferViews: Array<GltfBufferView>,
  buffers: Array<GltfBuffer>,
  meshes: Array<GltfMesh>,
  [key: string]: any
}

// render object information
export interface RenderObject {
  visible: boolean,
  vertexBuffer: GPUBuffer,
  uvBuffer: GPUBuffer,
  normalBuffer: GPUBuffer,
  vertexCount: number,
  pipelineIndex: number,
  indexBuffer?: GPUBuffer,
  indexCount?: number,
  indexType: GPUIndexFormat,
  instances?: number,
}

// render bind group information
export interface RenderBindGroup {
  base: GPUBindGroup,
  entries: Array<GPUBuffer>,
  dynRef?: Array<boolean>,
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
  index?: Array<number>
}

// primitives shape info as ArrayBuffers
export interface BufferShape {
  vertices: ArrayBuffer,
  vertexCount: number,
  uvs: ArrayBuffer,
  normals: ArrayBuffer,
  index?: ArrayBuffer,
  indexCount?: number,
}

/**
 * Inputs for updating an object in a pipeline
 * 
 * Note that uniformData arrays must be in the Float32Array/Int32Array format,
 * not as a default js array. The Vec.float()/Vec.int() functions can also be used.
 * 
 * If a buffer entry is not dynamic, it can be set by the first object and left null otherwise.
 * 
 * Also note that even individual values must be wrapped in a Float32Array/Int32Array
 * due to fixed size requirements
 * 
 * @param {number} pipelineId
 * @param {number} objectId
 * @param {[number, number, number]} translate
 * @param {[number, number, number]} rotateAxis the axis on which rotation occurs
 * @param {number} rotateDeg
 * @param {[number, number, number]} scale
 * @param {boolean} visible whether or not to render the object
 * @param {Camera} camera camera object to determine view transform
 * @param {Array<Float32Array | Int32Array | null>} uniformData custom uniform data can be passed in here
 */
export interface UpdateData {
  pipelineId: number,
  objectId: number,
  translate?: [number, number, number],
  rotateAxis?: [number, number, number],
  rotateDeg?: number,
  scale?: [number, number, number],
  visible?: boolean,
  camera?: Camera,
  uniformData?: Array<Float32Array | Int32Array | null>
}

/**
 * Configurations for custom uniform binding.
 * 
 * Note that dynamic uniforms have a max size of 256 bytes.
 * If passing in a struct, use sizeInBytes to describe the size.
 * 
 * @param {number} bindSlot binding index in WGSL
 * @param {string} visibility which shader function to expose this uniform to
 * @param {boolean} dynamic whether or not uniform is different per object in the pipeline
 * @param {string} type type of uniform (determines size)
 * @param {number | undefined} sizeInBytes size of uniform in bytes (if type is struct)
 */
export interface UniformDescription {
  bindSlot: number,
  visibility: 'vertex' | 'fragment' | 'both',
  dynamic: boolean,
  type: 'i32' | 'f32' | 'vec2f'| 'vec3f' | 'vec4f' | 'struct',
  sizeInBytes?: number,
}

// additional options when creating a pipeline
export interface PipelineOptions {
  texture1Id?: number,
  texture2Id?: number,
  cullMode?: 'back' | 'front' | 'none',
  uniforms?: Array<UniformDescription>,
  vertexFunction?: string,
  fragmentFunction?: string,
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

export { Primitives, Mat4, Vec, Renderer, ModelLoader };