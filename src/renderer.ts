//#region Types
// render object information
interface RenderObject {
  visible: boolean,
  vertexBuffer: GPUBuffer,
  uvBuffer: GPUBuffer,
  normalBuffer: GPUBuffer,
  vertexCount: number,
  pipelineIndex: number,
  pipelineOffset: number,
}
// render pipeline information
interface RenderPipeline {
  pipe: GPURenderPipeline,
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
  #zbuffer: GPUTextureView;
  #width: number;
  #height: number;
  // public properties
  limits: GPUSupportedLimits;
  cameraOrthoPos: [number, number, number] = [0, 0, -1000];
  pipelines: Array<RenderPipeline> = [];
  objects: Array<RenderObject> = [];
  clearColor: GPUColorDict = { r:0, g:0, b:0, a:1 };

  constructor(d: GPUDevice, f: GPUTextureFormat, c: GPUCanvasContext, m: GPUTextureView, z: GPUTextureView, w: number, h: number) {
    this.#device = d;
    this.#format = f;
    this.#context = c;
    this.#msaa = m;
    this.#zbuffer = z;
    this.#width = w;
    this.#height = h;
    this.limits = d.limits;
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
    const msaaTexture: GPUTexture = device.createTexture({
      size: [canvas.width, canvas.height],
      sampleCount: 4,
      format: format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    // create texture for z-buffer
    const zbufferTexture: GPUTexture = device.createTexture({
      size: [canvas.width, canvas.height],
      format: 'depth24plus',
      sampleCount: 4,
      mipLevelCount: 1,
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    })

    // retain initialized components
    return new Renderer(
      device,
      format,
      context,
      msaaTexture.createView(),
      zbufferTexture.createView(),
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
  // change canvas size
  updateCanvas(w: number, h: number) {
    if (!this.#device) throw new Error("Renderer not initialized");
    // create texture for MSAA antialiasing
    const msaaTexture = this.#device.createTexture({
      size: [w, h],
      sampleCount: 4,
      format: this.#format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    // create texture for z-buffer
    const zbufferTexture: GPUTexture = this.#device.createTexture({
      size: [w, h],
      format: 'depth24plus',
      sampleCount: 4,
      mipLevelCount: 1,
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    })
    this.#msaa = msaaTexture.createView();
    this.#zbuffer = zbufferTexture.createView();
    this.#width = w;
    this.#height = h;
  }
  // change camera position
  updateCameraOrtho(x: number, y: number, z: number) {
    this.cameraOrthoPos[0] = x;
    this.cameraOrthoPos[1] = y;
    this.cameraOrthoPos[2] = z;
  }
  /**
   * Creates rendering pipeline to feed render objects into
   * - Bind groups/uniforms are bundled together with the pipeline
   * - Uses dynamic offsets for buffers to optimize memory usage
   * 
   * @param {string} shader wgsl shader as a string
   * @param {number} maxObjCount keep low to minimize memory consumption
   * @returns {number} pipeline id (required for creating render objects)
   */
  addPipeline(shader:string, maxObjCount:number): number {
    if (!this.#device) throw new Error("Renderer not initialized");
    const shaderModule: GPUShaderModule = this.#device.createShaderModule({
      label: "shader-module",
      code: shader
    });
    // create pipeline
    const bindGroupLayout: GPUBindGroupLayout = this.#device.createBindGroupLayout({
      entries: [
        { // mvp matrix
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { hasDynamicOffset:true }
        },
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
        buffers: [
          { // position
            arrayStride: 12,
            attributes: [{ shaderLocation: 0, format: "float32x3", offset: 0 }]
          },
          { // uv coords
            arrayStride: 8,
            attributes: [{ shaderLocation: 1, format: "float32x2", offset: 0 }]
          },
          { // normal
            arrayStride: 12,
            attributes: [{ shaderLocation: 2, format: "float32x3", offset: 0 }]
          },
        ]
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragmentMain",
        targets: [{ format: this.#format, blend: {color: blendMode, alpha: blendMode} }]
      },
      multisample: {
        count: 4,
      },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
      // primitive: {
      //   cullMode: 'back' // culls back-facing tris, breaks self-transparency
      // }
    });
    // create uniform buffers
    const minStrideSize: number = this.limits.minUniformBufferOffsetAlignment;
    const mvpBuffer: GPUBuffer = this.#device.createBuffer({
      label: "mvp-struct-uniform",
      size: minStrideSize * maxObjCount,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    // -- TODO: texture sampler
    // -- TODO: intake custom uniforms
    // create bind group
    const mvpSize: number = 4 * 4 * 4 * 3; // mat4 32bit/4byte floats
    const bindGroup0: GPUBindGroup = this.#device.createBindGroup({
      label: "bind-group-0",
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {binding: 0, resource: { buffer: mvpBuffer, size: mvpSize }}
      ]
    });
    // add to cache
    const pipelineDyn: RenderPipeline = {
      pipe: pipeline,
      bindGroup: bindGroup0,
      bindEntries: [mvpBuffer]
    };
    this.pipelines.push(pipelineDyn);
    return (this.pipelines.length - 1);
  }
  // create buffers for render object
  addObject(
    pipelineIndex: number,
    verts: Array<[number, number, number]>,
    uvs?: Array<[number, number]>,
    normals?: Array<[number, number, number]>,
  ): number {
    if (!this.#device) throw new Error("Renderer not initialized");
    if (verts.length < 3) throw new Error("Not enough vertices");
    // create vertex buffer
    let vlen = verts.length;
    const vertices = new Float32Array(vlen * 3);
    for (let i=0; i<verts.length; i++) {
      vertices[i*3] = verts[i][0];
      vertices[i*3+1] = verts[i][1];
      vertices[i*3+2] = verts[i][2];
    }
    const vertexBuffer: GPUBuffer = this.#device.createBuffer({
      label: "vertex-buffer",
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.#device.queue.writeBuffer(vertexBuffer, 0, vertices);
    // create uv buffer
    const uvMap = new Float32Array(vlen * 2);
    if (uvs && uvs.length > 0) {
      for (let i=0; i<uvs.length; i++) {
        uvMap[i*2] = uvs[i][0];
        uvMap[i*2+1] = uvs[i][1];
      }
    }
    const uvBuffer: GPUBuffer = this.#device.createBuffer({
      label: "uv-buffer",
      size: uvMap.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.#device.queue.writeBuffer(uvBuffer, 0, uvMap);
    // create normals buffer
    const normalMap = new Float32Array(vlen * 3);
    if (normals && normals.length > 0) {
      for (let i=0; i<normals.length; i++) {
        normalMap[i*3] = normals[i][0];
        normalMap[i*3+1] = normals[i][1];
        normalMap[i*3+2] = normals[i][2];
      }
    }
    const normalBuffer: GPUBuffer = this.#device.createBuffer({
      label: "normal-buffer",
      size: normalMap.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.#device.queue.writeBuffer(normalBuffer, 0, normalMap);
    // save to cache
    const id = this.objects.length;
    const obj: RenderObject = {
      visible: true,
      vertexBuffer,
      uvBuffer,
      normalBuffer,
      vertexCount: vlen,
      pipelineIndex,
      pipelineOffset: id,
    }
    this.objects.push(obj);
    return id;
  }
  // update buffers for render object
  updateObject(
    id: number,
    translate: [number, number, number] = [0, 0, 0],
    rotateAxis: [number, number, number] = [0, 0, 1],
    rotateDeg: number = 0,
    scale: [number, number, number] = [1, 1, 1],
    visible: boolean = true
  ) {
    if (!this.#device) throw new Error("Renderer not initialized");
    const obj = this.objects[id];
    if (!obj) throw new Error(`Could not find pipeline id:${id}`);
    const dpipe = this.pipelines[obj.pipelineIndex];
    obj.visible = visible;
    // model matrix
    const modelt: Float32Array = Mat4.translate(translate[0], translate[1], translate[2]);
    const modelr: Float32Array = Mat4.rotate(rotateAxis, rotateDeg * Math.PI / 180);
    const models: Float32Array = Mat4.scale(scale[0], scale[1], scale[2]);
    const model: Float32Array = Mat4.multiply(modelt, Mat4.multiply(modelr, models));
    // view matrix
    const view: Float32Array = Mat4.translate(this.cameraOrthoPos[0], this.cameraOrthoPos[1], this.cameraOrthoPos[2]);
    // projection matrix
    const w2 = this.#width/2;
    const h2 = this.#height/2;
    const proj: Float32Array = Mat4.ortho(-w2, w2, -h2, h2);
    // join everything together
    const mat4Size: number = 4 * 4;
    const mvpSize: number = 4 * 4 * 3; // mat4 32bit/4byte floats
    const mvp = new Float32Array(mvpSize);
    for (let i=0; i<mvpSize; i++) {
      if (i < mat4Size) mvp[i] = model[i];
      else if (i < mat4Size * 2) mvp[i] = view[i - mat4Size];
      else mvp[i] = proj[i - mat4Size*2];
    }
    const stride = this.limits.minStorageBufferOffsetAlignment;
    this.#device.queue.writeBuffer(dpipe.bindEntries[0], stride * obj.pipelineOffset, mvp);
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
      }],
      depthStencilAttachment: {
        view: this.#zbuffer,
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      }
    });
    this.objects.forEach(obj => {
      if (!obj.visible) return;
      const pipeline = this.pipelines[obj.pipelineIndex];
      const stride = this.limits.minUniformBufferOffsetAlignment;
      pass.setPipeline(pipeline.pipe);
      pass.setVertexBuffer(0, obj.vertexBuffer);
      pass.setVertexBuffer(1, obj.uvBuffer);
      pass.setVertexBuffer(2, obj.normalBuffer);
      pass.setBindGroup(0, pipeline.bindGroup, [stride * obj.pipelineOffset]);
      pass.draw(obj.vertexCount);
    })
    pass.end();
    this.#device.queue.submit([encoder.finish()]);
  }
};
//#endregion Renderer Class

//#region Matrix 4x4
/**
 * Container for util functions for matrix math
 * 
 * Note: matrix elements are ordered [col][row], not [row][col]
 * 
 * refer to Mat4.from2Darray function for more details
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
    far: number = 2000
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
  // transpose 4x4 matrix
  static transpose(src: Float32Array): Float32Array {
    const dst = new Float32Array(16);
    for (let i=0; i<4; i++) {
      for (let j=0; j<4; j++) {
        dst[i*4 + j] = src[j*4 + i];
      }
    }
    return dst;
  }
}
//#endregion Matrix 4x4

//#region Vector
/**
 * Container for util functions for vector math
 */
class Vec {
  static uint(x: number, y: number, z?: number, w?: number): Uint32Array {
    let size = 2;
    if (typeof z === 'number') size = 3;
    if (typeof w === 'number') size = 4;
    const dst = new Uint32Array(size);
    dst[0] = Math.round(x);
    dst[1] = Math.round(y);
    if (typeof z === 'number') dst[2] = Math.round(z);
    if (typeof w === 'number') dst[3] = Math.round(w);
    return dst;
  }
  static int(x: number, y: number, z?: number, w?: number): Int32Array {
    let size = 2;
    if (typeof z === 'number') size = 3;
    if (typeof w === 'number') size = 4;
    const dst = new Int32Array(size);
    dst[0] = Math.round(x);
    dst[1] = Math.round(y);
    if (typeof z === 'number') dst[2] = Math.round(z);
    if (typeof w === 'number') dst[3] = Math.round(w);
    return dst;
  }
  static float(x: number, y: number, z?: number, w?: number): Float32Array {
    let size = 2;
    if (typeof z === 'number') size = 3;
    if (typeof w === 'number') size = 4;
    const dst = new Float32Array(size);
    dst[0] = x;
    dst[1] = y;
    if (typeof z === 'number') dst[2] = z;
    if (typeof w === 'number') dst[3] = w;
    return dst;
  }
  static colorRGB(r: number, g: number, b: number, a?: number): Float32Array {
    const color = new Float32Array(4);
    color[0] = r ? Math.floor(r)/255 : 0;
    color[1] = g ? Math.floor(g)/255 : 0;
    color[2] = b ? Math.floor(b)/255 : 0;
    color[3] = a ? Math.floor(a)/255 : 1;
    return color;
  }
  static add(v1: Float32Array, v2: Float32Array): Float32Array {
    let size1 = v1.length;
    let size2 = v2.length;
    let size3 = size1 > size2 ? size1 : size2;
    const dst = new Float32Array(size3);
    dst[0] = v1[0] + v2[0];
    dst[1] = v1[1] + v1[1];
    if (size3 > 2 && size1 > 2) dst[2] = v1[2];
    if (size2 > 2) dst[2] += v2[2];
    if (size3 > 3 && size1 > 3) dst[3] = v1[3];
    if (size2 > 3) dst[3] += v2[3];
    return dst; 
  }
  static subtract(v1: Float32Array, v2: Float32Array): Float32Array {
    let size1 = v1.length;
    let size2 = v2.length;
    let size3 = size1 > size2 ? size1 : size2;
    const dst = new Float32Array(size3);
    dst[0] = v1[0] - v2[0];
    dst[1] = v1[1] - v2[1];
    if (size3 > 2 && size1 > 2) dst[2] = v1[2];
    if (size2 > 2) dst[2] -= v2[2];
    if (size3 > 3 && size1 > 3) dst[3] = v1[3];
    if (size2 > 3) dst[3] -= v2[3];
    return dst; 
  }
  static dot(v1: Float32Array, v2: Float32Array): number {
    if (v1.length !== v2.length) throw new Error("Vector sizes don't match");
    let out = 0, size = v1.length;
    for (let i=0; i<size; i++) {
      out += v1[i] * v2[i];
    }
    return out;
  }
  static cross(v1: Float32Array, v2: Float32Array): Float32Array {
    if (v1.length !== 3 || v2.length !== 3)
      throw new Error("Cannot take cross product of non-3D vectors");
    return new Float32Array([
      v1[1]*v2[2] - v1[2]*v2[1],
      v1[2]*v2[0] - v1[0]*v2[2],
      v1[0]*v2[1] - v1[1]*v2[0],
    ]);
  }
  static normalize(v: Float32Array): Float32Array {
    const m = v.reduce((p, v) => p += Math.abs(v), 0);
    if (m <= 0) throw new Error(`Could not compute magnitude of [${v}]`);
    const dst = new Float32Array(v.length);
    for (let i=0; i<v.length; i++) dst[i] = v[i]/m;
    return dst;
  }
  static normalFromCoords(p1: Float32Array, p2: Float32Array, p3: Float32Array): Float32Array {
    if (p1.length !== 3 || p2.length !== 3 || p3.length !== 3)
      throw new Error("Cannot find normal in non-3D space");
    const v1: Float32Array = this.subtract(p2, p1);
    const v2: Float32Array = this.subtract(p3, p1);
    const v3: Float32Array = this.cross(v1, v2);
    return this.normalize(v3);
  }
}
//#endregion Vector

export default Renderer;
export { Renderer, Mat4, Vec };