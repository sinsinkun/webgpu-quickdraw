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

export default Vec;