# WebGPU on Vite

Custom renderer object implementation for simplifying working with WebGPU.

- Implements support for multiple render objects 
- Implements support for reusing pipelines
- Implements support for alpha channel transparency
- Implements mvp transforms for vertex shader
- Implements uv coords for fragment shader

<img src="public/screenshot.png" height="500px" />

### Acknowledgements

Copied some matrix functions from [wgpu-matrix](https://github.com/greggman/wgpu-matrix) to reduce dependencies