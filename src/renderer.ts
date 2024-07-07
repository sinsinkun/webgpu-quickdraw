// note: unable to import webgpu types using tsconfig in subfolder
/// <reference path="../node_modules/@webgpu/types/dist/index.d.ts" />

import { Mat4 } from "./index";
import type {
  RenderObject,
  RenderBindGroup,
  RenderPipeline,
  UpdateData,
  Camera,
  CameraOptions,
  PipelineOptions,
  UniformDescription,
} from './index';

/**
 * ## Renderer
 * Primary object for storing all render data and 
 * reducing WebGPU API calls to simple js functions.
 * 
 * ### Usage:
 * ```js
 * import { Renderer, Primitive } from 'webgpu-quickdraw';
 * import shader from './shader.wgsl?raw';
 * const canvas = document.querySelector('#canvas');
 * 
 * const renderer = await Renderer.init(canvas);
 * const pipe1 = renderer.addPipeline(shader);
 * const shape = Primitive.cube(20);
 * const obj1 = renderer.addObject(pipe1, shape.vertices, shape.uvs, shape.normals);
 * renderer.updateObject({ pipelineId: pipe1, objectId: obj1, position: [0, 10, 0]});
 * 
 * renderer.render([pipe1]);
 * ```
 */
class Renderer {
  // private properties
  #device: GPUDevice;
  #format: GPUTextureFormat;
  #context: GPUCanvasContext;
  #msaa: GPUTexture;
  #zbuffer: GPUTexture;
  #width: number;
  #height: number;
  // public properties
  limits: GPUSupportedLimits;
  pipelines: Array<RenderPipeline> = [];
  textures: Array<GPUTexture>= [];
  clearColor: GPUColorDict = { r:0, g:0, b:0, a:1 };

  constructor(d:GPUDevice, f:GPUTextureFormat, c:GPUCanvasContext, m:GPUTexture, z:GPUTexture, w:number, h:number) {
    this.#device = d;
    this.#format = f;
    this.#context = c;
    this.#msaa = m;
    this.#zbuffer = z;
    this.#width = w;
    this.#height = h;
    this.limits = d.limits;
  }
  /**
   * This **MUST** be called to initialize the renderer.
   * 
   * Establishes connection for WebGPU to Graphics API
   * 
   * @param {HTMLCanvasElement} canvas 
   * @returns {Promise<Renderer>} Renderer instance
   */
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
      format: 'depth32float',
      sampleCount: 4,
      mipLevelCount: 1,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
    })

    // retain initialized components
    return new Renderer(
      device,
      format,
      context,
      msaaTexture,
      zbufferTexture,
      canvas.width,
      canvas.height,
    );
  }
  /**
   * Helper function for making a camera to attach to objects for rendering
   * 
   * @param {String} type orthographic or perspective
   * @param {Object} options 
   * @param {number} options.fovY for perspective camera only
   * @param {number} options.near near plane
   * @param {number} options.far far plane
   * @param {[number, number, number]} options.translate move camera position
   * @param {[number, number, number]} options.lookAt camera target position
   * @param {[number, number, number]} options.up up direction (defaults to Y)
   * @returns {Object} camera object with all relevant properties to adjust view matrix
   */
  makeCamera(type: "ortho" | "persp", options?: CameraOptions): Camera {
    switch (type) {
      case "ortho":
        return {
          type,
          near: options?.near || 0,
          far: options?.far || 1000,
          translate: options?.translate || [0,0,10],
          lookAt: options?.lookAt || [0.0, 0.0, 0.0],
          up: options?.up || [0.0, 1.0, 0.0],
        };
      case "persp":
        return {
          type,
          fovY: options?.fovY || 60,
          near: options?.near || 1,
          far: options?.far || 1000,
          translate: options?.translate || [0,0,10],
          lookAt: options?.lookAt || [0.0, 0.0, 0.0],
          up: options?.up || [0.0, 1.0, 0.0],
        };
      default:
        throw new Error(`Invalid camera type \"${type}\"`);
    }
  }
  /**
   * create texture buffer object, with texture loaded in if provided.
   * 
   * @param {number} width 
   * @param {number} height 
   * @param {string} url 
   * @param {boolean} canvasFormat use rgb8 format or native canvas format
   * @returns {Promise<number>}
   */
  async addTexture(width: number, height: number, url?: string, canvasFormat?: boolean): Promise<number> {
    const id = this.textures.length;
    const texture: GPUTexture = this.#device.createTexture({
      label: `texture-cache-${id}`,
      format: canvasFormat ? this.#format : 'rgba8unorm',
      size: [width, height],
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    // load image from url if provided
    if (url) {
      const blob = await fetch(url).then(x => x.blob());
      const bitmap: ImageBitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none' });
      this.#device.queue.copyExternalImageToTexture(
        { source: bitmap, flipY: true },
        { texture: texture },
        { width: bitmap.width, height: bitmap.height }
      );
    }
    // add to cache
    this.textures.push(texture);
    return id;
  }
  /**
   * swap out texture for a new one (note: cannot change size)
   * 
   * @param {number} textureId 
   * @param {string} url 
   */
  async updateTexture(textureId:number, url: string) {
    const texture = this.textures[textureId];
    if (!texture) throw new Error(`Could not find texture ${textureId}`);
    const blob = await fetch(url).then(x => x.blob());
    const bitmap: ImageBitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none' });
    this.#device.queue.copyExternalImageToTexture(
      { source: bitmap, flipY: true },
      { texture: texture },
      { width: texture.width, height: texture.height }
    );
  }
  /**
   * replace texture and associated bindgroup
   * 
   * @param {number} textureId 
   * @param {number} pipelineId 
   * @param {number} width 
   * @param {number} height 
   * @param {boolean} canvasFormat use rgb8 format or native canvas format
   */
  updateTextureSize(textureId:number, pipelineId:number, width:number, height:number, canvasFormat?: boolean) {
    const old = this.textures[textureId];
    if (!old) throw new Error(`Could not find texture ${textureId}`);
    old.destroy();
    // create new texture
    const texture: GPUTexture = this.#device.createTexture({
      label: `texture-cache-${textureId}`,
      format: canvasFormat ? this.#format : 'rgba8unorm',
      size: [width, height],
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.textures[textureId] = texture;
    // update bind group
    const pipeline = this.pipelines[pipelineId];
    if (!pipeline) throw new Error(`Could not find pipeline ${pipelineId}`);
    const newGroup = this.addBindGroup0(pipeline.pipe, pipeline.maxObjCount, texture);
    pipeline.bindGroup0 = newGroup;
  }
  /**
   * Change clear color for canvas
   * 
   * @param {number} r 
   * @param {number} g 
   * @param {number} b 
   * @param {number|undefined} a 
   */
  updateClearRGB(r: number, g: number, b: number, a?: number) {
    this.clearColor.r = r ? Math.floor(r)/255 : 0;
    this.clearColor.g = g ? Math.floor(g)/255 : 0;
    this.clearColor.b = b ? Math.floor(b)/255 : 0;
    this.clearColor.a = a ? Math.floor(a)/255 : 1;
  }
  /**
   * resize canvas
   * 
   * @param {number} w 
   * @param {number} h 
   */
  updateCanvas(w: number, h: number) {
    if (!this.#device) throw new Error("Renderer not initialized");
    // create texture for MSAA antialiasing
    const msaaTexture = this.#device.createTexture({
      label: "multi-sample-texture",
      size: [w, h],
      sampleCount: 4,
      format: this.#format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    // create texture for z-buffer
    const zbufferTexture: GPUTexture = this.#device.createTexture({
      label: "z-buffer-texture",
      size: [w, h],
      format: 'depth32float',
      sampleCount: 4,
      mipLevelCount: 1,
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    })
    this.#msaa = msaaTexture;
    this.#zbuffer = zbufferTexture;
    this.#width = w;
    this.#height = h;
  }
  /**
   * Creates rendering pipeline to feed render objects into
   * 
   * - Bind groups/uniforms are bundled together with the pipeline
   * - Can use dynamic offsets for buffers to optimize memory usage
   * - Custom uniforms are separated into bind group 1
   * 
   * @param {string} shader wgsl shader as a string
   * @param {number} maxObjCount keep low to minimize memory consumption
   * @param {object} options optional configurations for pipeline
   * @param {number} options.texture1Id texture must be added to cache, then referenced here
   * @param {number} options.texture2Id second texture reference if necessary
   * @param {GPUCullMode} options.cullMode ['front','back','none'] affects transparency
   * @param {string} options.vertexFunction name for vertex function
   * @param {string} options.fragmentFunction name for fragment function
   * @param {Array<UniformDescription>} options.uniforms additional uniforms from user
   * @returns {number} pipeline id (required for creating render objects)
   */
  addPipeline(shader:string, maxObjCount:number, options?: PipelineOptions): number {
    if (!this.#device) throw new Error("Renderer not initialized");
    const shaderModule: GPUShaderModule = this.#device.createShaderModule({
      label: "shader-module",
      code: shader
    });
    // create pipeline
    const bindGroups = [];
    const bindGroup0Layout: GPUBindGroupLayout = this.#device.createBindGroupLayout({
      label: "bind-group-0-layout",
      entries: [
        { // mvp matrix
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { hasDynamicOffset:true }
        },
        { // texture sampler
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type:'filtering' }
        },
        { // texture 1
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {}
        },
        { // texture 2
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {}
        },
      ]
    });
    bindGroups.push(bindGroup0Layout);
    // create custom uniform bind group
    if (options && options.uniforms && options.uniforms.length > 0) {
      const bind1Entries: Array<GPUBindGroupLayoutEntry> = options.uniforms.map(uniform => {
        let visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
        if (uniform.visibility === "fragment") visibility = GPUShaderStage.FRAGMENT;
        else if (uniform.visibility === 'vertex') visibility = GPUShaderStage.VERTEX;
        let entry = {
          binding: uniform.bindSlot,
          visibility,
          buffer: {}
        }
        if (uniform.dynamic) entry.buffer = { hasDynamicOffset: true };
        return entry;
      });
      const bindGroup1Layout: GPUBindGroupLayout = this.#device.createBindGroupLayout({
        label: "bind-group-1-layout",
        entries: bind1Entries
      });
      bindGroups.push(bindGroup1Layout);
    }
    const pipelineLayout: GPUPipelineLayout = this.#device.createPipelineLayout({
      label: "render-pipeline-layout",
      bindGroupLayouts: bindGroups
    });
    const blendMode: GPUBlendComponent = {
      srcFactor: 'src-alpha',
      dstFactor: 'one-minus-src-alpha',
    };
    const pipeline: GPURenderPipeline = this.#device.createRenderPipeline({
      label: "render-pipeline",
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: options?.vertexFunction ?? "vertexMain",
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
        entryPoint: options?.fragmentFunction ?? "fragmentMain",
        targets: [{ format: this.#format, blend: {color: blendMode, alpha: blendMode} }]
      },
      multisample: {
        count: 4,
      },
      depthStencil: {
        format: 'depth32float',
        depthWriteEnabled: true,
        depthCompare: 'less-equal',
      },
      primitive: {
        cullMode: options?.cullMode ? options.cullMode : 'none'
      }
    });
    // create bind group
    let tx1, tx2;
    if (options && typeof options.texture1Id === 'number') tx1 = this.textures[options.texture1Id];
    if (options && typeof options.texture2Id === 'number') tx2 = this.textures[options.texture2Id];
    const bindGroup0 = this.addBindGroup0(pipeline, maxObjCount, tx1, tx2);
    const bindGroup1 = options?.uniforms ? this.addBindGroup1(pipeline, maxObjCount, options.uniforms) : undefined;
    // add to cache
    const pipe: RenderPipeline = {
      pipe: pipeline,
      objects: [],
      maxObjCount,
      bindGroup0,
      bindGroup1,
    };
    this.pipelines.push(pipe);
    return (this.pipelines.length - 1);
  }
  // create default bind group
  addBindGroup0(pipeline: GPURenderPipeline, maxObjCount:number, texture1?:GPUTexture, texture2?:GPUTexture): RenderBindGroup {
    // create uniform buffers
    const minStrideSize: number = this.limits.minUniformBufferOffsetAlignment;
    const mvpBuffer: GPUBuffer = this.#device.createBuffer({
      label: "mvp-struct-uniform",
      size: minStrideSize * maxObjCount,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    // placeholder textures
    if (!texture1) {
      texture1 = this.#device.createTexture({
        label: `texture-cache-placeholder`,
        format: 'rgba8unorm',
        size: [1, 1],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }
    if (!texture2) {
      texture2 = this.#device.createTexture({
        label: `texture-cache-placeholder`,
        format: 'rgba8unorm',
        size: [1, 1],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }
    // create sampler
    const sampler: GPUSampler = this.#device.createSampler({
      label: "texture-sampler",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      addressModeW: "clamp-to-edge",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      lodMinClamp: 0,
      lodMaxClamp: 1,
      maxAnisotropy: 1
    });
    // create bind group
    const mvpSize: number = 4 * 4 * 4 * 3; // mat4 32bit/4byte floats
    const bindGroup: GPUBindGroup = this.#device.createBindGroup({
      label: "bind-group-0",
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {binding: 0, resource: { buffer: mvpBuffer, size: mvpSize }},
        {binding: 1, resource: sampler},
        {binding: 2, resource: texture1.createView()},
        {binding: 3, resource: texture2.createView()},
      ]
    });
    const out: RenderBindGroup = {
      base: bindGroup,
      entries: [mvpBuffer],
    }
    return out;
  }
  // create custom bind group
  addBindGroup1(pipeline: GPURenderPipeline, maxObjCount:number, uniforms:Array<UniformDescription>): RenderBindGroup {
    // create uniform buffers
    const minStrideSize: number = this.limits.minUniformBufferOffsetAlignment;
    const bindEntries: Array<GPUBuffer> = []; 
    const bindDesc: Array<GPUBindGroupEntry> = [];
    const dynRef: Array<boolean> = [];
    uniforms.forEach((uniform, i) => {
      let sizeInBytes = uniform.sizeInBytes || 0;
      switch (uniform.type) {
        case 'f32':
        case 'i32':
          sizeInBytes = 4;
          break;
        case 'vec2f':
          sizeInBytes = 8;
          break;
        case 'vec3f':
          sizeInBytes = 12;
          break;
        case 'vec4f':
          sizeInBytes = 16;
          break;
        case 'struct':
        default:
          break;
      }
      const size = uniform.dynamic ? minStrideSize * maxObjCount : sizeInBytes;
      const entry: GPUBuffer = this.#device.createBuffer({
        label: `custom-uniform-${i}`,
        size: size,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      })
      bindEntries.push(entry);
      const desc: GPUBindGroupEntry = {
        binding: i,
        resource: { buffer:entry, size: sizeInBytes }
      }
      bindDesc.push(desc);
      dynRef.push(uniform.dynamic);
    });
    // create bind group
    const bindGroup: GPUBindGroup = this.#device.createBindGroup({
      label: "bind-group-1",
      layout: pipeline.getBindGroupLayout(1),
      entries: bindDesc
    });
    const out: RenderBindGroup = {
      base: bindGroup,
      entries: bindEntries,
      dynRef,
    }
    return out;
  }
  /**
   * Add new object to render
   * 
   * @param {number} pipelineId which shader pipeline to use for object
   * @param {Array<[number, number, number]>} verts
   * @param {Array<[number, number]>} uvs
   * @param {Array<[number, number, number]>} normals
   * @param {Array<number>} indices indexing of vertices to render
   * @param {number} instances number of instances of object to render
   * @returns {number} objectId
   */
  addObject(
    pipelineId: number,
    verts: Array<[number, number, number]>,
    uvs?: Array<[number, number]>,
    normals?: Array<[number, number, number]>,
    indices?: Array<number>,
    instances?: number,
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
    // create index buffer
    let indexBuffer: GPUBuffer | undefined;
    if (indices && indices.length > 0) {
      const indexMap = new Uint32Array(indices.length);
      for (let i=0; i<indices.length; i++) {
        indexMap[i] = indices[i];
      }
      indexBuffer = this.#device.createBuffer({
        label: "index-buffer",
        size: indexMap.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      });
      this.#device.queue.writeBuffer(indexBuffer, 0, indexMap);
    }
    // save to cache
    const pipe = this.pipelines[pipelineId];
    const id = pipe.objects.length;
    const obj: RenderObject = {
      visible: true,
      vertexBuffer,
      uvBuffer,
      normalBuffer,
      vertexCount: vlen,
      pipelineIndex: id,
      indexBuffer,
      indexCount: indices?.length,
      indexType: 'uint32',
      instances: instances || 1,
    }
    pipe.objects.push(obj);
    this.updateObject({ pipelineId, objectId:id });
    return id;
  }
  /**
   * Add new object to render
   * 
   * @param {number} pipelineId which shader pipeline to use for object
   * @param {ArrayBuffer} verts
   * @param {number} vertCount
   * @param {ArrayBuffer} uvs
   * @param {ArrayBuffer} normals
   * @param {ArrayBuffer} indices indexing of vertices to render
   * @param {number} indexCount
   * @param {number} instances number of instances of object to render
   * @returns {number} objectId
   */
  addObjectAsBuffers(
    pipelineId: number,
    verts: ArrayBuffer,
    vertCount: number,
    uvs?: ArrayBuffer,
    normals?: ArrayBuffer,
    indices?: ArrayBuffer,
    indexCount?: number,
    instances?: number,
  ) {
    if (!this.#device) throw new Error("Renderer not initialized");
    // create vertex buffer
    const vertexBuffer: GPUBuffer = this.#device.createBuffer({
      label: "vertex-buffer",
      size: verts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.#device.queue.writeBuffer(vertexBuffer, 0, verts);
    // create uv buffer
    let uvMap = new ArrayBuffer(vertCount);
    if (uvs && uvs?.byteLength > 0) uvMap = uvs;
    const uvBuffer: GPUBuffer = this.#device.createBuffer({
      label: "uv-buffer",
      size: uvMap.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.#device.queue.writeBuffer(uvBuffer, 0, uvMap);
    // create normal buffer
    let normalMap = new ArrayBuffer(vertCount);
    if (normals && normals.byteLength > 0) normalMap = normals;
    const normalBuffer: GPUBuffer = this.#device.createBuffer({
      label: "normal-buffer",
      size: normalMap.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.#device.queue.writeBuffer(normalBuffer, 0, normalMap);
    // create index buffer
    let indexBuffer: GPUBuffer | undefined;
    if (indices && indexCount && indices.byteLength > 0) {
      indexBuffer = this.#device.createBuffer({
        label: "index-buffer",
        size: indices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      });
      this.#device.queue.writeBuffer(indexBuffer, 0, indices);
    }
    // save to cache
    const pipe = this.pipelines[pipelineId];
    const id = pipe.objects.length;
    const obj: RenderObject = {
      visible: true,
      vertexBuffer,
      uvBuffer,
      normalBuffer,
      vertexCount: vertCount,
      pipelineIndex: id,
      indexBuffer,
      indexCount,
      indexType: 'uint16',
      instances: instances || 1,
    }
    pipe.objects.push(obj);
    this.updateObject({ pipelineId, objectId:id });
    return id;
  }
  /**
   * Updates model transforms for object
   * 
   * @param {Object} input
   * @param {number} input.pipelineId required field
   * @param {number} input.objectId required field
   * @param {[number, number, number] | undefined} input.translate
   * @param {[number, number, number] | undefined} input.rotateAxis
   * @param {number | undefined} input.rotateDeg
   * @param {[number, number, number] | undefined} input.scale
   * @param {boolean} input.visible
   * @param {Object} input.camera output from renderer.makeCamera(...)
   */
  updateObject(input: UpdateData) {
    const { pipelineId, objectId, translate, visible, rotateAxis, rotateDeg, scale, camera } = input;
    if (!this.#device) throw new Error("Renderer not initialized");
    const dpipe = this.pipelines[pipelineId];
    if (!dpipe) throw new Error(`Could not find pipeline ${pipelineId}`);
    const obj = dpipe.objects[objectId];
    if (!obj) throw new Error(`Could not find object ${objectId}`);
    
    obj.visible = visible ?? true;
    if (!obj.visible) return;
    // model matrix
    const modelt: Float32Array = Mat4.translate(translate?.[0] || 0, translate?.[1] || 0, translate?.[2] || 0);
    const modelr: Float32Array = Mat4.rotate(rotateAxis || [0,0,1], (rotateDeg || 0) * Math.PI / 180);
    const models: Float32Array = Mat4.scale(scale?.[0] || 1, scale?.[1] || 1, scale?.[2] || 1);
    const model: Float32Array = Mat4.multiply(modelt, Mat4.multiply(models, modelr));
    // view matrix
    let view: Float32Array = Mat4.identity();
    if (camera) {
      const pos = new Float32Array(camera.translate);
      const lookAt = new Float32Array(camera.lookAt);
      const up = new Float32Array(camera.up);
      const viewt = Mat4.translate(-camera.translate[0], -camera.translate[1], -camera.translate[2]);
      const viewr = Mat4.view_rot(pos, lookAt, up);
      view = Mat4.multiply(viewt, viewr);
    }
    // projection matrix
    const w2 = this.#width/2;
    const h2 = this.#height/2;
    let proj: Float32Array;
    if (camera?.type === "persp") proj = Mat4.perspective(camera.fovY, w2/h2, camera.near, camera.far);
    else proj = Mat4.ortho(-w2, w2, h2, -h2, camera?.near, camera?.far);
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
    this.#device.queue.writeBuffer(dpipe.bindGroup0.entries[0], stride * obj.pipelineIndex, mvp);
    // update custom uniforms
    if (dpipe.bindGroup1 && input.uniformData) {
      dpipe.bindGroup1.entries.forEach((buffer, i) => {
        if (!input.uniformData?.[i] || input.uniformData[i] === null) return;
        const bufferData: Float32Array | Int32Array = input.uniformData[i] ?? new Int32Array;
        if (dpipe.bindGroup1?.dynRef?.[i]) {
          this.#device.queue.writeBuffer(buffer, stride * obj.pipelineIndex, bufferData);
        } else {
          this.#device.queue.writeBuffer(buffer, 0, bufferData);
        }
      });
    }
  }
  /**
   * Render pipeline to target
   * 
   * @param {Array<number>} pipelineIds pipelines to render
   * @param {number | undefined} targetId texture to render to, or canvas if unfilled
   */
  render(pipelineIds: Array<number>, targetId?: number) {
    if (!this.#device) throw new Error("Renderer not initialized");
    let t = this.#context.getCurrentTexture().createView();
    if (typeof targetId === 'number') {
      const tx = this.textures[targetId];
      if (tx) {
        t = tx.createView();
      } else {
        console.warn(`Could not find render target ${targetId}. Rendering to screen`);
      }
    }
    // create new command encoder (consumed at the end)
    const encoder: GPUCommandEncoder = this.#device.createCommandEncoder({ label: "render-encoder" });
    const pass: GPURenderPassEncoder = encoder.beginRenderPass({
      label: "render-pass",
      colorAttachments: [{
        view: this.#msaa.createView(),
        resolveTarget: t,
        clearValue: this.clearColor,
        loadOp: "clear",
        storeOp: "store",
      }],
      depthStencilAttachment: {
        view: this.#zbuffer.createView(),
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      }
    });
    pipelineIds.forEach(id => {
      const pipeline = this.pipelines[id];
      if (!pipeline) {
        console.warn(`Pipeline not found: ${id}`);
        return;
      }
      pipeline.objects.forEach(obj => {
        if (!obj.visible) return;
        const stride = this.limits.minUniformBufferOffsetAlignment;
        pass.setPipeline(pipeline.pipe);
        pass.setVertexBuffer(0, obj.vertexBuffer);
        pass.setVertexBuffer(1, obj.uvBuffer);
        pass.setVertexBuffer(2, obj.normalBuffer);
        pass.setBindGroup(0, pipeline.bindGroup0.base, [stride * obj.pipelineIndex]);
        if (pipeline.bindGroup1) {
          const offsets: Array<number> = [];
          pipeline.bindGroup1.dynRef?.forEach(dyn => {
            if (dyn) offsets.push(stride * obj.pipelineIndex);
          });
          pass.setBindGroup(1, pipeline.bindGroup1.base, offsets);
        }
        if (obj.indexBuffer && obj.indexCount) {
          pass.setIndexBuffer(obj.indexBuffer, obj.indexType);
          pass.drawIndexed(obj.indexCount, obj.instances || 1);
        } else {
          pass.draw(obj.vertexCount, obj.instances || 1);
        }
      });
    });
    pass.end();
    this.#device.queue.submit([encoder.finish()]);
  }
  /**
   * Manually free references to GPU memory
   */
  destroy() {
    // destroy textures
    this.#msaa.destroy();
    this.#zbuffer.destroy();
    this.textures.forEach(tx => tx.destroy());

    // destroy pipeline buffers
    this.pipelines.forEach(pipe => {
      pipe.objects.forEach(obj => {
        obj.vertexBuffer.destroy();
        obj.uvBuffer.destroy();
        obj.normalBuffer.destroy();
        obj.indexBuffer?.destroy();
      });
      pipe.objects = [];
      pipe.bindGroup0.entries.forEach(bf => bf.destroy());
      pipe.bindGroup1?.entries.forEach(bf => bf.destroy());
      pipe.bindGroup2?.entries.forEach(bf => bf.destroy());
      pipe.bindGroup3?.entries.forEach(bf => bf.destroy());
    });
    this.pipelines = [];

    // destroy device
    this.#device.destroy();
  }
};

export default Renderer;