// import {vec3, mat3} from 'wgpu-matrix';

class Renderer {
  // private properties
  #device: GPUDevice | null = null;
  #format: GPUTextureFormat | null = null;
  #context: GPUCanvasContext | null = null;
  frame: number = 0;
  clearColor: GPUColorDict = { r:0, g:0, b:0, a:1 };

  // temp fields for rendering
  #renderpipe: GPURenderPipeline | null = null;
  #vertbuffer: GPUBuffer | null = null;
  #vertcount: number = 0;

  constructor() {
    // TODO
  }
  // initialize WebGPU connection
  async init(canvas: HTMLCanvasElement): Promise<void> {
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
  createPipeline(verts: Array<number>, shader: string) {
    if (!this.#device || !this.#format) throw new Error("Renderer not initialized");
    // create vertex buffer
    const vertices = new Float32Array(verts);
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
    const pipeline: GPURenderPipeline = this.#device.createRenderPipeline({
      label: "vertex-pipeline",
      layout: "auto",
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
    // save to temp
    this.#renderpipe = pipeline;
    this.#vertbuffer = vertexBuffer;
    this.#vertcount = vertices.length / 2;
  }
  // render to canvas
  draw() {
    if (!this.#device || !this.#context || !this.#renderpipe) 
      throw new Error("Renderer not initialized, or pipeline does not exist");
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
    pass.draw(this.#vertcount);
    pass.end();
    this.#device.queue.submit([encoder.finish()]);
  }
};

// ---- UTIL FUNCTIONS ----
// convert color to float range
function colorRGB(r: number, g: number, b: number, a?: number): Float32Array {
  const color = new Float32Array(4);
  color[0] = r ? Math.floor(r)/255 : 0;
  color[1] = g ? Math.floor(g)/255 : 0;
  color[2] = b ? Math.floor(b)/255 : 0;
  color[3] = a ? Math.floor(a)/255 : 1;
  return color;
}

export { Renderer, colorRGB };