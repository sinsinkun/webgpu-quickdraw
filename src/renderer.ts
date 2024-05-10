import { mat4, vec2, Vec2, Vec4, Mat4, vec3 } from 'wgpu-matrix';

class Renderer {
  // private properties
  #device: GPUDevice | null = null;
  #format: GPUTextureFormat | null = null;
  #context: GPUCanvasContext | null = null;
  // public properties
  frame: number = 0;
  clearColor: GPUColorDict = { r:0, g:0, b:0, a:1 };

  // transient fields for rendering
  #renderpipe: GPURenderPipeline | null = null;
  #vertbuffer: GPUBuffer | null = null;
  #vertcount: number = 0;
  #bindgroup: GPUBindGroup | null = null;
  #bindEntries: Array<GPUBuffer> = [];

  constructor() {}
  // initialize WebGPU connection
  async init(canvas: HTMLCanvasElement): Promise<void> {
    if (this.#device) return console.warn("Already initialized renderer");
    // test webgpu compatibility
    if (!navigator.gpu) throw new Error("WebGPU not supported on this browser");

    // attach to gpu
    const adapter: GPUAdapter | null = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("No GPUAdapter found");
    const device = await adapter.requestDevice();

    // configure canvas
    const context = canvas?.getContext("webgpu");
    if (!context) throw new Error("Could not get canvas context");
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format });

    // retain initialized components
    this.#device = device;
    this.#context = context;
    this.#format = format;
  }
  // change clear color
  updateClearRGB(r: number, g: number, b: number, a?: number) {
    this.clearColor.r = r ? Math.floor(r)/255 : 0;
    this.clearColor.g = g ? Math.floor(g)/255 : 0;
    this.clearColor.b = b ? Math.floor(b)/255 : 0;
    this.clearColor.a = a ? Math.floor(a)/255 : 1;
  }
  // create pipeline for rendering
  createPipeline2D(verts: Array<Vec2>, shader: string) {
    if (!this.#device || !this.#format) throw new Error("Renderer not initialized");
    // create vertex buffer
    const verts1d: Array<number> = [];
    verts.forEach((v: Vec2) => verts1d.push(v[0], v[1]));
    const vertices = new Float32Array(verts1d);
    const vertexBuffer: GPUBuffer = this.#device.createBuffer({
      label: "vertex-buffer",
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.#device.queue.writeBuffer(vertexBuffer, 0, vertices);
    // define layout
    const vbLayout: GPUVertexBufferLayout = {
      arrayStride: 8,
      attributes: [{ format: "float32x2", offset: 0, shaderLocation: 0 }]
    }
    const shaderModule: GPUShaderModule = this.#device.createShaderModule({
      label: "vertex-shader-module",
      code: shader
    });
    // define uniform layout
    const bindGroupLayout: GPUBindGroupLayout = this.#device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {}
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: {}
        },
        {
          binding: 2,
          visibility: GPUShaderStage.VERTEX,
          buffer: {}
        }
      ]
    });
    const pipelineLayout: GPUPipelineLayout = this.#device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    });
    const pipeline: GPURenderPipeline = this.#device.createRenderPipeline({
      label: "vertex-pipeline",
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vertexMain",
        buffers: [vbLayout]
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragmentMain",
        targets: [{ format: this.#format }]
      }
    });
    // create uniform buffers
    const mat4Size: number = 4 * 4 * 4; // mat4 32bit/4byte floats
    const modelMatBuffer: GPUBuffer = this.#device.createBuffer({
      label: "mvp-uniform",
      size: mat4Size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const viewMatBuffer: GPUBuffer = this.#device.createBuffer({
      label: "mvp-uniform",
      size: mat4Size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const projMatBuffer: GPUBuffer = this.#device.createBuffer({
      label: "mvp-uniform",
      size: mat4Size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    // create bind group
    const bindGroup0: GPUBindGroup = this.#device.createBindGroup({
      label: "bind-group-0",
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {binding: 0, resource: { buffer: modelMatBuffer }},
        {binding: 1, resource: { buffer: viewMatBuffer }},
        {binding: 2, resource: { buffer: projMatBuffer }},
      ]
    });
    // save to cache
    this.#renderpipe = pipeline;
    this.#vertbuffer = vertexBuffer;
    this.#vertcount = verts.length;
    this.#bindgroup = bindGroup0;
    this.#bindEntries.push(modelMatBuffer, viewMatBuffer, projMatBuffer);
  }
  // render to canvas
  draw() {
    if (!this.#device || !this.#context || !this.#renderpipe) 
      throw new Error("Renderer not initialized, or pipeline does not exist");
    // update buffers
    if (this.#bindgroup) {
      // todo: model matrix
      const modelt = mat4.translation(vec3.create(0, 0, 0));
      const modelr = mat4.axisRotation(vec3.create(0, 0, 1), 0);
      const models = mat4.scaling(vec3.create(1, 1, 1));
      const model = mat4.multiply(modelt, mat4.multiply(modelr, models)) as Float32Array;
      this.#device.queue.writeBuffer(this.#bindEntries[0], 0, model);
      // todo: view matrix
      const view = mat4.identity() as Float32Array;
      this.#device.queue.writeBuffer(this.#bindEntries[1], 0, view);
      // projection matrix
      const proj = orthoProjMatrix(-256, 256, 256, -256) as Float32Array;
      this.#device.queue.writeBuffer(this.#bindEntries[2], 0, proj);
    }
    // create new command encoder (consumed at the end)
    const encoder: GPUCommandEncoder = this.#device.createCommandEncoder();
    const pass: GPURenderPassEncoder = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.#context.getCurrentTexture().createView(),
        clearValue: this.clearColor,
        loadOp: "clear",
        storeOp: "store",
      }]
    });
    pass.setPipeline(this.#renderpipe);
    pass.setVertexBuffer(0, this.#vertbuffer);
    if (this.#bindgroup) pass.setBindGroup(0, this.#bindgroup);
    pass.draw(this.#vertcount);
    pass.end();
    this.#device.queue.submit([encoder.finish()]);
  }
};

// ---- UTIL FUNCTIONS ----
// convert color to float range
function colorRGB(r: number, g: number, b: number, a?: number): Vec4 {
  const color = new Float32Array(4);
  color[0] = r ? Math.floor(r)/255 : 0;
  color[1] = g ? Math.floor(g)/255 : 0;
  color[2] = b ? Math.floor(b)/255 : 0;
  color[3] = a ? Math.floor(a)/255 : 1;
  return color;
}

// create orthographic projection matrix
function orthoProjMatrix(
  left: number,
  right: number,
  top: number,
  bottom: number,
  near: number = 0.0001,
  far: number = 1000
): Mat4 {
  return mat4.create(
    (2/(right-left)), 0, 0, -(right+left)/(right-left),
    0, (2/(top-bottom)), 0, -(top+bottom)/(top-bottom),
    0, 0, (-2/(far-near)), -(far+near)/(far-near),
    0, 0, 0, 1
  );
}

export { Renderer, colorRGB, vec2, mat4 };
export type { Vec2, Vec4 };