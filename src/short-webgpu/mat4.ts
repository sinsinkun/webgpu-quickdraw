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
    const f = Math.tan(Math.PI * 0.5 - 0.5 * fovY * Math.PI / 180);
    const rangeInv = 1 / (zNear - zFar);
    const a = f / aspectRatio;
    const c = zFar * rangeInv;
    const d = zNear * zFar * rangeInv;

    return new Float32Array([
      a, 0, 0, 0,
      0, f, 0, 0,
      0, 0, c, -1,
      0, 0, d, 0,
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

export default Mat4;