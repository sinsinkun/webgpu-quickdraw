/// <reference types="vite/client" />

interface ObjectMap<T> {
  [key: string]: T
}

interface RenderObject {
  id: number;
  name: string;
  visible: boolean;
  pipeline: GPURenderPipeline;
  vertexBuffer: GPUBuffer;
  vertexCount: number;
  bindGroup: GPUBindGroup;
  bindEntries: Array<GPUBuffer>;
}