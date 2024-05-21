# WebGPU Quickdraw

Custom renderer library for simplifying working with WebGPU.

The goal of this library is to dramatically reduce the setup time required
to start using WebGPU by pre-including common requirements for graphics setups,
without completely abstracting away the WebGPU architecture.

Some utility functions are included (like primitive shapes) for ease of use.

Features:
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

To-do:
- custom uniform implementation
- more primitive shapes
- 3d model importing

<img src="public/screenshot2.png" width="600px" />

Transparency, MSAA, depth buffer, and texture mapping pre-included

<img src="public/screenshot.png" width="700px" />

1000 cubes renders with 2ms GPU computation time

### Acknowledgements

Copied some matrix functions from [wgpu-matrix](https://github.com/greggman/wgpu-matrix) to reduce dependencies