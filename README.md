# WebGPU Quickdraw

Custom renderer library for simplifying working with WebGPU.

The goal of this library is to dramatically reduce the setup time required
to start using WebGPU by pre-including common requirements for graphics setups,
without completely abstracting away the WebGPU architecture.

Some utility functions are included (like primitive shapes) for ease of use.

### Usage:

All WebGPU configurations have been reduced to the absolute lowest possible number of lines.

```js
import { Renderer, Primitive } from 'webgpu-quickdraw';
const canvas = document.querySelector('#canvas');

// initialize WebGPU connection to GPU
const renderer = await Renderer.init(canvas);

// create new pipeline
const pipe1 = renderer.addPipeline(shader);

// create new object
const shape = Primitive.cube(20, 20, 20);
const obj1 = renderer.addObject(pipe1, shape.vertices, shape.uvs, shape.normals);

// update object
renderer.updateObject({ pipelineId: pipe1, objectId: obj1, position: [0, 10, 0]});

// render to canvas
renderer.render([pipe1]);
```

Note: Primitives is only to help generate the vertex, uv, and normal arrays.
It does not retain any information regarding the output shape.

### Features:
- support for reusing pipelines
- support for canvas resizing
- multiple render objects
- alpha channel transparency
- depth buffer z-indexing
- multi-sampled anti-aliasing (4x)
- pre-built mvp transforms for vertex shader
- intakes uv buffer for VBO
- intakes normal buffer for VBO
- intakes texture for uv mapping
- can output into textures for post processing

### To-do:
- custom uniform implementation
- more primitive shapes
- 3d model importing

<img src="https://sinsinkun.github.io/webgpu-quickdraw/screenshot2.png" width="600px" />

Transparency, MSAA, depth buffer, and texture mapping pre-included

<img src="https://sinsinkun.github.io/webgpu-quickdraw/screenshot.png" width="700px" />

1000 cubes renders with 2ms GPU computation time

### Acknowledgements

Copied some matrix functions from [wgpu-matrix](https://github.com/greggman/wgpu-matrix) to reduce dependencies