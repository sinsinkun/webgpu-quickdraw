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
  static regPolygon(radius:number, sides:number, zIndex:number = 0): Shape {
    if (sides < 2) throw new Error("Sides count must be greater than 2");
    const vertices: Array<[number, number, number]> = [];
    const uvs: Array<[number, number]> = [];
    const normals: Array<[number, number, number]> = [];
    const da = 2 * Math.PI / sides;
    let x0 = 1, y0 = 0;
    for (let i=0; i<sides; i++) {
      let x1 = Math.cos(da) * x0 - Math.sin(da) * y0;
      let y1 = Math.cos(da) * y0 + Math.sin(da) * x0;
      x1 = 0 + Number(x1.toFixed(6));
      y1 = 0 + Number(y1.toFixed(6));
      // build slice
      const p1: [number, number, number] = [x0 * radius, y0 * radius, zIndex];
      const p2: [number, number, number] = [x1 * radius, y1 * radius, zIndex];
      const p3: [number, number, number] = [0, 0, zIndex];
      const u1: [number, number] = [(1 + x0)/2, (1 + y0)/2];
      const u2: [number, number] = [(1 + x1)/2, (1 + y1)/2];
      const u3: [number, number] = [0.5, 0.5];
      // build arrays
      vertices.push(p1, p2, p3);
      uvs.push(u1, u2, u3);
      normals.push([0,0,1],[0,0,1],[0,0,1]);
      // prepare next slice
      x0 = x1;
      y0 = y1;
    }
    return { vertices, uvs, normals };
  }
}

export default Primitives;