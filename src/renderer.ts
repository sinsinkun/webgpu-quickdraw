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
  #width: number;
  #height: number;
  // public properties
  camera2DPos: [number, number] = [0, 0];
  pipelines: Array<GPURenderPipeline> = [];
  objects: Array<RenderObject> = [];
  clearColor: GPUColorDict = { r:0, g:0, b:0, a:1 };

  constructor(d: GPUDevice, f: GPUTextureFormat, c: GPUCanvasContext, m: GPUTextureView, w: number, h: number) {
    this.#device = d;
    this.#format = f;
    this.#context = c;
    this.#msaa = m;
    this.#width = w;
    this.#height = h;
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
    const msaaTexture = device.createTexture({
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
      msaaTexture.createView(),
      canvas.width,
      canvas.height,
    );
  }
  // change clear color
  updateClearRGB(r: number, g: number, b: number, a?: number) {
    this.clearColor.r = r ? Math.floor(r)/255 : 0;
    this.clearColor.g = g ? Math.floor(g)/255 : 0;
    this.clearColor.b = b ? Math.floor(b)/255 : 0;
    this.clearColor.a = a ? Math.floor(a)/255 : 1;
  }
  // create pipeline for rendering
  addPipeline2D(shader:string): number {
    if (!this.#device) throw new Error("Renderer not initialized");
    // define layout
    const vbLayout: GPUVertexBufferLayout = {
      arrayStride: 8,
      attributes: [{ format: "float32x2", offset: 0, shaderLocation: 0 }]
    }
    const shaderModule: GPUShaderModule = this.#device.createShaderModule({
      label: "shader-module",
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
        },
        {
          binding: 3,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {}
        },
        {
          binding: 4,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {}
        }
      ]
    });
    const pipelineLayout: GPUPipelineLayout = this.#device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    });
    const blendMode: GPUBlendComponent = {
      srcFactor: 'src-alpha',
      dstFactor: 'one-minus-src-alpha',
    };
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
        targets: [{ format: this.#format, blend: {color: blendMode, alpha: blendMode} }]
      },
      multisample: {
        count: 4,
      }
    });
    this.pipelines.push(pipeline);
    return (this.pipelines.length - 1);
  }
  // create buffers for render object
  addObject2D(verts: Array<[number, number]>, pipelineIndex: number): number {
    if (!this.#device) throw new Error("Renderer not initialized");
    if (verts.length < 3) throw new Error("Not enough vertices");
    // create vertex buffer
    const verts1d: Array<number> = [];
    let xmin: number = verts[0][0];
    let xmax: number = verts[0][0];
    let ymin: number = verts[0][1];
    let ymax: number = verts[0][1];
    verts.forEach((v: [number, number]) => {
      verts1d.push(v[0], v[1]);
      if (v[0] < xmin) xmin = v[0];
      if (v[0] > xmax) xmax = v[0];
      if (v[1] < ymin) ymin = v[1];
      if (v[1] > ymax) ymax = v[1];
    });
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
    const uvSizeBuffer: GPUBuffer = this.#device.createBuffer({
      label: "uv-size-uniform",
      size: 8, // 2 32bit floats
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const colorBuffer: GPUBuffer = this.#device.createBuffer({
      label: "color-uniform",
      size: 16, // 4 32bit floats
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
        {binding: 3, resource: { buffer: uvSizeBuffer }},
        {binding: 4, resource: { buffer: colorBuffer }},
      ]
    });
    // pre-set buffers
    const uvSize: Float32Array = new Float32Array([xmax - xmin, ymax - ymin]);
    this.#device.queue.writeBuffer(uvSizeBuffer, 0, uvSize);
    const color: Float32Array = colorRGB(255, 255, 255, 255);
    this.#device.queue.writeBuffer(colorBuffer, 0, color);
    // save to cache
    const obj: RenderObject = {
      visible: true,
      vertexBuffer,
      vertexCount: verts.length,
      pipelineIndex: pipelineIndex,
      bindGroup: bindGroup0,
      bindEntries: [modelMatBuffer, viewMatBuffer, projMatBuffer, uvSizeBuffer, colorBuffer],
    };
    this.objects.push(obj);
    this.updateObject2D(this.objects.length - 1);
    return this.objects.length - 1;
  }
  // update buffers
  updateObject2D(
    id: number,
    translate: [number,number] = [0,0],
    rotate: number = 0,
    scale: number = 1,
    visible: boolean = true
  ) {
    if (!this.#device) throw new Error("Renderer not initialized");
    const obj = this.objects[id];
    if (!obj) throw new Error(`Could not find pipeline id:${id}`);
    obj.visible = visible;
    // model matrix
    const modelt: Float32Array = Mat4.translate(translate[0], translate[1], 0);
    const modelr: Float32Array = Mat4.rotate([0, 0, 1], rotate * Math.PI / 180);
    const models: Float32Array = Mat4.scale(scale, scale, 1);
    const model: Float32Array = Mat4.multiply(modelt, Mat4.multiply(modelr, models));
    this.#device.queue.writeBuffer(obj.bindEntries[0], 0, model);
    // view matrix
    const view: Float32Array = Mat4.translate(this.camera2DPos[0], this.camera2DPos[1], -1000);
    this.#device.queue.writeBuffer(obj.bindEntries[1], 0, view);
    // projection matrix
    const w2 = this.#width/2;
    const h2 = this.#height/2;
    const proj: Float32Array = Mat4.ortho(-w2, w2, -h2, h2);
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
  // update 2d camera position
  updateCamera2D(x: number, y: number) {
    this.camera2DPos[0] = x;
    this.camera2DPos[1] = y;
  }
};
//#endregion Renderer Class

//#region Matrix 4x4
/**
 * Container for util functions for matrix math
 * 
 * Note: matrices are ordered [col][row], not [row][col]
 */
class Mat4 {
  // convert 2D array to column matrix
  static from2DArray(src: Array<Array<number>>): Float32Array {
    const dst = new Float32Array([
      src[0][0], src[1][0], src[2][0], src[3][0],
      src[0][1], src[1][1], src[2][1], src[3][1],
      src[0][2], src[1][2], src[2][2], src[3][2],
      src[0][3], src[1][3], src[2][3], src[3][3],
    ]);
    return dst;
  }
  // create perspective projection matrix
  static perspective(fovY: number, aspectRatio: number, zNear: number, zFar: number): Float32Array {
    const f = Math.tan(Math.PI * 0.5 - 0.5 * (fovY * Math.PI / 180));
    const a = f / aspectRatio;
    const r = 1 / (zNear - zFar);
    const b = zNear * r;
    return new Float32Array([
      a, 0, 0, 0,
      0, f, 0, 0,
      0, 0, r, -1,
      0, 0, b, 0,
    ]);
  }
  // create orthographic projection matrix
  static ortho(
    left: number,
    right: number,
    top: number,
    bottom: number,
    near: number = 0,
    far: number = 1000
  ): Float32Array {
    const dst = new Float32Array([
      (2/(right-left)), 0, 0, 0,
      0, (2/(top-bottom)), 0, 0,
      0, 0, (1/(near-far)), 0,
      (right+left)/(left-right), (top+bottom)/(bottom-top), near/(near-far), 1
    ]);
    return dst;
  }
  // create identity matrix
  static identity() {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);
  }
  // create translation matrix
  static translate(x: number, y: number, z: number): Float32Array {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      x, y, z, 1,
    ]);
  }
  // create rotation matrix
  static rotate(axis: [number, number, number], deg: number): Float32Array {
    const dst = new Float32Array(16);
    let x = axis[0];
    let y = axis[1];
    let z = axis[2];
    // normalize axis
    const n = Math.sqrt(x * x + y * y + z * z);
    x /= n;
    y /= n;
    z /= n;
    // helpers
    const xx = x * x;
    const yy = y * y;
    const zz = z * z;
    const c = Math.cos(deg);
    const s = Math.sin(deg);
    const o = 1 - c;
    // build output
    dst[ 0] = xx + (1 - xx) * c;
    dst[ 1] = x * y * o + z * s;
    dst[ 2] = x * z * o - y * s;
    dst[ 3] = 0;
    dst[ 4] = x * y * o - z * s;
    dst[ 5] = yy + (1 - yy) * c;
    dst[ 6] = y * z * o + x * s;
    dst[ 7] = 0;
    dst[ 8] = x * z * o + y * s;
    dst[ 9] = y * z * o - x * s;
    dst[10] = zz + (1 - zz) * c;
    dst[11] = 0;
    dst[12] = 0;
    dst[13] = 0;
    dst[14] = 0;
    dst[15] = 1;

    return dst;
  }
  // create scale matrix
  static scale(x: number, y: number, z: number): Float32Array {
    return new Float32Array([
      x, 0, 0, 0,
      0, y, 0, 0,
      0, 0, z, 0,
      0, 0, 0, 1,
    ]);
  }
  // multiply 2 4x4 matrices
  static multiply(a: Float32Array, b: Float32Array): Float32Array {
    const dst = new Float32Array(16);
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[ 4 + 0];
    const a11 = a[ 4 + 1];
    const a12 = a[ 4 + 2];
    const a13 = a[ 4 + 3];
    const a20 = a[ 8 + 0];
    const a21 = a[ 8 + 1];
    const a22 = a[ 8 + 2];
    const a23 = a[ 8 + 3];
    const a30 = a[12 + 0];
    const a31 = a[12 + 1];
    const a32 = a[12 + 2];
    const a33 = a[12 + 3];
    const b00 = b[0];
    const b01 = b[1];
    const b02 = b[2];
    const b03 = b[3];
    const b10 = b[ 4 + 0];
    const b11 = b[ 4 + 1];
    const b12 = b[ 4 + 2];
    const b13 = b[ 4 + 3];
    const b20 = b[ 8 + 0];
    const b21 = b[ 8 + 1];
    const b22 = b[ 8 + 2];
    const b23 = b[ 8 + 3];
    const b30 = b[12 + 0];
    const b31 = b[12 + 1];
    const b32 = b[12 + 2];
    const b33 = b[12 + 3];

    dst[ 0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
    dst[ 1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
    dst[ 2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
    dst[ 3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;
    dst[ 4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
    dst[ 5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
    dst[ 6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
    dst[ 7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;
    dst[ 8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
    dst[ 9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
    dst[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
    dst[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;
    dst[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
    dst[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
    dst[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
    dst[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;
    return dst;
  }
}
//#endregion

//#region Util functions
// convert color to float range
function colorRGB(r: number, g: number, b: number, a?: number): Float32Array {
  const color = new Float32Array(4);
  color[0] = r ? Math.floor(r)/255 : 0;
  color[1] = g ? Math.floor(g)/255 : 0;
  color[2] = b ? Math.floor(b)/255 : 0;
  color[3] = a ? Math.floor(a)/255 : 1;
  return color;
}
//#endregion Util functions

export default Renderer;
export { Renderer, Mat4, colorRGB };