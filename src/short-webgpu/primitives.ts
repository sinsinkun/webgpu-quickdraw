import type { Shape } from './index';

/**
 * Helper for building common shapes
 */
class Primitives {
  static template(): Shape {
    const vertices: Array<[number, number, number]> = [];
    const uvs: Array<[number, number]> = [];
    const normals: Array<[number, number, number]> = [];
    return { vertices, uvs, normals }
  }
  static cube(width:number, height?:number, depth?:number): Shape {
    const w = width/2;
    const h = height ? height/2 : width/2;
    const d = depth ? depth/2 : width/2;
    const vertices: Array<[number, number, number]> = [
      // face front
      [w,h,d],[w,-h,d],[-w,-h,d],
      [-w,-h,d],[-w,h,d],[w,h,d],
      // face back
      [-w,h,-d],[-w,-h,-d],[w,-h,-d],
      [w,-h,-d],[w,h,-d],[-w,h,-d],
      // face left
      [-w,h,d],[-w,-h,d],[-w,-h,-d],
      [-w,-h,-d],[-w,h,-d],[-w,h,d],
      // face right
      [w,h,-d],[w,-h,-d],[w,-h,d],
      [w,-h,d],[w,h,d],[w,h,-d],
      // face up
      [w,-h,d],[w,-h,-d],[-w,-h,-d],
      [-w,-h,-d],[-w,-h,d],[w,-h,d],
      // face down
      [w,h,-d],[w,h,d],[-w,h,d],
      [-w,h,d],[-w,h,-d],[w,h,-d],
    ];
    const uvs: Array<[number, number]> = [
      // face front
      [1,1],[1,0],[0,0],[0,0],[0,1],[1,1],
      // face back
      [0,0],[0,1],[1,1],[1,1],[1,0],[0,0],
      // face left
      [1,1],[1,0],[0,0],[0,0],[0,1],[1,1],
      // face right
      [1,1],[1,0],[0,0],[0,0],[0,1],[1,1],
      // face up
      [1,1],[1,0],[0,0],[0,0],[0,1],[1,1],
      // face down
      [1,1],[1,0],[0,0],[0,0],[0,1],[1,1],
    ];
    const normals: Array<[number, number, number]> = [
      // face front
      [0,0,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1],
      // face back
      [0,0,-1],[0,0,-1],[0,0,-1],[0,0,-1],[0,0,-1],[0,0,-1],
      // face left
      [-1,0,0],[-1,0,0],[-1,0,0],[-1,0,0],[-1,0,0],[-1,0,0],
      // face right
      [1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,0,0],
      // face up
      [0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],
      // face down
      [0,-1,0],[0,-1,0],[0,-1,0],[0,-1,0],[0,-1,0],[0,-1,0],
    ];
    return { vertices, uvs, normals }
  }
  static rect(width:number, height:number, zIndex:number = 0): Shape {
    const w = width / 2;
    const h = height / 2;
    const vertices: Array<[number, number, number]> = [
      [-w, -h, zIndex],[w, -h, zIndex],[w, h, zIndex],
      [w, h, zIndex],[-w, h, zIndex],[-w, -h, zIndex],
    ];
    const uvs: Array<[number, number]> = [
      [0,0],[1,0],[1,1],
      [1,1],[0,1],[0,0],
    ];
    const normals: Array<[number, number, number]> = [
      [0,0,1],[0,0,1],[0,0,1],
      [0,0,1],[0,0,1],[0,0,1]
    ];
    return { vertices, uvs, normals }
  }
}

export default Primitives;