import { mat4, vec3 } from 'wgpu-matrix';
import type { Vec4, Mat4 } from 'wgpu-matrix';

//#region Types
// render object information
interface RenderObject {
  visible: boolean,
  vertexBuffer: GPUBuffer,
  vertexCount: number,
  pipelineIndex: number,
  bindGroup: GPUBindGroup,
  bindEntries: Array<GPUBuffer>,
}
//#endregion Types

//#region Renderer Class
/**
 * ## Renderer
 * Primary object for storing all render data and 
 * reducing WebGPU API calls to simple js functions.
 * 
 * ### Usage:
 * ```js
 * const renderer = await Renderer.init(canvas);
 * const pipe1 = renderer.addPipeline2D(shader);
 * const obj1 = renderer.addObject2D(vertices);
 * renderer.draw();
 * ```
 */
class Renderer {
  // private properties
  #device: GPUDevice;
  #format: GPUTextureFormat;
  #context: GPUCanvasContext;
  #msaa: GPUTextureView;
  // public properties
  pipelines: Array<GPURenderPipeline> = [];
  objects: Array<RenderObject> = [];
  clearColor: GPUColorDict = { r:0, g:0, b:0, a:1 };

  constructor(d: GPUDevice, f: GPUTextureFormat, c: GPUCanvasContext, m: GPUTextureView) {
    this.#device = d;
    this.#format = f;
    this.#context = c;
    this.#msaa = m;
  }
  // initialize WebGPU connection
  static async init(canvas: HTMLCanvasElement | null): Promise<Renderer> {
    if (!canvas) throw new Error("No canvas provided");
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
    context.configure({ device, format, alphaMode: 'premultiplied' });

    // create texture for MSAA antialiasing
    const MsaaTexture = device.createTexture({
      size: [canvas.width, canvas.height],
      sampleCount: 4,
      format: format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    // retain initialized components
    return new Renderer(
      device,
      format,
      context,
      MsaaTexture.createView()
    );
  }
  // change clear color
  updateClearRGB(r: number, g: number, b: number, a?: number) {
    this.clearColor.r = r ? Math.floor(r)/255 : 0;
    this.clearColor.g = g ? Math.floor(g)/255 : 0;
    this.clearColor.b = b ? Math.floor(b)/255 : 0;
    this.clearColor.a = a ? Math.floor(a)/255 : 1;
  }
  addPipeline2D(shader:string): number {
    if (!this.#device) throw new Error("Renderer not initialized");
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
      },
      multisample: {
        count: 4,
      }
    });
    this.pipelines.push(pipeline);
    return (this.pipelines.length - 1);
  }
  // create pipeline for rendering
  addObject2D(verts: Array<[number, number]>, pipelineIndex: number): number {
    if (!this.#device) throw new Error("Renderer not initialized");
    // create vertex buffer
    const verts1d: Array<number> = [];
    verts.forEach((v: [number, number]) => verts1d.push(v[0], v[1]));
    const vertices = new Float32Array(verts1d);
    const vertexBuffer: GPUBuffer = this.#device.createBuffer({
      label: "vertex-buffer",
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.#device.queue.writeBuffer(vertexBuffer, 0, vertices);
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
      layout: this.pipelines[pipelineIndex].getBindGroupLayout(0),
      entries: [
        {binding: 0, resource: { buffer: modelMatBuffer }},
        {binding: 1, resource: { buffer: viewMatBuffer }},
        {binding: 2, resource: { buffer: projMatBuffer }},
      ]
    });
    // save to cache
    const obj: RenderObject = {
      visible: true,
      vertexBuffer,
      vertexCount: verts.length,
      pipelineIndex: pipelineIndex,
      bindGroup: bindGroup0,
      bindEntries: [modelMatBuffer, viewMatBuffer, projMatBuffer],
    };
    this.objects.push(obj);
    this.updateObject2D(this.objects.length - 1);
    return this.objects.length - 1;
  }
  // update buffers
  updateObject2D(
    id: number,
    translate: [number, number] = [0, 0],
    rotate: number = 0,
    scale: number = 1,
    visible: boolean = true,
  ) {
    if (!this.#device) throw new Error("Renderer not initialized");
    const obj = this.objects[id];
    if (!obj) throw new Error(`Could not find pipeline id:${id}`);
    obj.visible = visible;
    // todo: model matrix
    const modelt: Mat4 = mat4.translation(vec3.create(translate[0], translate[1], 0));
    const modelr: Mat4 = mat4.axisRotation(vec3.create(0, 0, 1), rotate * Math.PI / 180);
    const models: Mat4 = mat4.scaling(vec3.create(scale, scale, 1));
    const model: Mat4 = mat4.multiply(modelt, mat4.multiply(modelr, models)) as Float32Array;
    this.#device.queue.writeBuffer(obj.bindEntries[0], 0, model);
    // todo: view matrix
    const view: Mat4 = mat4.identity() as Float32Array;
    this.#device.queue.writeBuffer(obj.bindEntries[1], 0, view);
    // projection matrix
    const proj: Mat4 = orthoProjMatrix(-256, 256, 256, -256) as Float32Array;
    this.#device.queue.writeBuffer(obj.bindEntries[2], 0, proj);
  }
  // render to canvas
  draw() {
    if (!this.#device) throw new Error("Renderer not initialized");
    // create new command encoder (consumed at the end)
    const encoder: GPUCommandEncoder = this.#device.createCommandEncoder();
    const pass: GPURenderPassEncoder = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.#msaa,
        resolveTarget: this.#context.getCurrentTexture().createView(),
        clearValue: this.clearColor,
        loadOp: "clear",
        storeOp: "store",
      }]
    });
    this.objects.forEach(obj => {
      if (!obj.visible) return;
      pass.setPipeline(this.pipelines[obj.pipelineIndex]);
      pass.setVertexBuffer(0, obj.vertexBuffer);
      pass.setBindGroup(0, obj.bindGroup);
      pass.draw(obj.vertexCount);
    })
    pass.end();
    this.#device.queue.submit([encoder.finish()]);
  }
};
//#endregion Renderer Class

//#region Util functions
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
//#endregion Util functions


export default Renderer;
export { Renderer, colorRGB };