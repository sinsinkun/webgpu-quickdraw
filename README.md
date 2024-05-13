# WebGPU on Vite

Custom renderer object implementation for simplifying working with WebGPU.

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

<img src="public/screenshot.png" width="700px" />

1000 cubes with varying transforms, MSAA, and transparency, renders with 2ms GPU computation time

### Acknowledgements

Copied some matrix functions from [wgpu-matrix](https://github.com/greggman/wgpu-matrix) to reduce dependencies