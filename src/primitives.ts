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
  // 2d primitives
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
  static torus2d(outerRadius:number, innerRadius:number, sides:number, zIndex:number = 0): Shape {
    if (sides < 2) throw new Error("Sides count must be greater than 2");
    const vertices: Array<[number, number, number]> = [];
    const uvs: Array<[number, number]> = [];
    const normals: Array<[number, number, number]> = [];
    const index: Array<number> = [];
    const da = 2 * Math.PI / sides;
    const dr = innerRadius / outerRadius;
    let x0 = 1, y0 = 0;
    // build points
    for (let i=0; i<sides; i++) {
      const p1: [number, number, number] = [x0 * outerRadius, y0 * outerRadius, zIndex];
      const p2: [number, number, number] = [x0 * innerRadius, y0 * innerRadius, zIndex];
      const u1: [number, number] = [(1 + x0)/2, (1 + y0)/2];
      const u2: [number, number] = [(1 + dr * x0)/2, (1 + dr * y0)/2];
      // add points
      vertices.push(p1, p2);
      uvs.push(u1, u2);
      normals.push([0,0,1],[0,0,1]);
      // prepare next slice
      let x1 = Math.cos(da) * x0 - Math.sin(da) * y0;
      let y1 = Math.cos(da) * y0 + Math.sin(da) * x0;
      x0 = 0 + Number(x1.toFixed(6));
      y0 = 0 + Number(y1.toFixed(6));
    }
    // generate indexing
    for (let i=0; i<vertices.length-2; i++) {
      if (i % 2) index.push(i, i+1, i+2);
      else index.push(i+1, i, i+2);
    }
    // final faces join back to first 2 vertices
    index.push(vertices.length-1, vertices.length-2, 0);
    index.push(vertices.length-1, 0, 1);

    return { vertices, uvs, normals, index };
  }
  // 3d primitives
  static cube(width:number, height?:number, depth?:number): Shape {
    const w = width/2;
    const h = height ? height/2 : width/2;
    const d = depth ? depth/2 : width/2;
    const vertices: Array<[number, number, number]> = [
      // face front
      [w,-h,d],[w,h,d],[-w,-h,d],
      [-w,h,d],[-w,-h,d],[w,h,d],
      // face back
      [-w,-h,-d],[-w,h,-d],[w,-h,-d],
      [w,h,-d],[w,-h,-d],[-w,h,-d],
      // face left
      [-w,-h,d],[-w,h,d],[-w,-h,-d],
      [-w,h,-d],[-w,-h,-d],[-w,h,d],
      // face right
      [w,-h,-d],[w,h,-d],[w,-h,d],
      [w,h,d],[w,-h,d],[w,h,-d],
      // face up
      [w,-h,-d],[w,-h,d],[-w,-h,-d],
      [-w,-h,d],[-w,-h,-d],[w,-h,d],
      // face down
      [w,h,d],[w,h,-d],[-w,h,d],
      [-w,h,-d],[-w,h,d],[w,h,-d],
    ];
    const uvs: Array<[number, number]> = [
      // face front
      [1,0],[1,1],[0,0],[0,1],[0,0],[1,1],
      // face back
      [0,1],[0,0],[1,1],[1,0],[1,1],[0,0],
      // face left
      [1,0],[1,1],[0,0],[0,1],[0,0],[1,1],
      // face right
      [1,0],[1,1],[0,0],[0,1],[0,0],[1,1],
      // face up
      [1,0],[1,1],[0,0],[0,1],[0,0],[1,1],
      // face down
      [1,0],[1,1],[0,0],[0,1],[0,0],[1,1],
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
  static cylinder(radius:number, height:number, sides: number): Shape {
    if (sides < 2) throw new Error("Sides count must be greater than 2");
    const vertices: Array<[number, number, number]> = [];
    const uvs: Array<[number, number]> = [];
    const normals: Array<[number, number, number]> = [];
    const index: Array<number> = [];
    const da = 2 * Math.PI / sides;
    const h = height/2;
    let x0 = 1, z0 = 0;
    // build top/bottom center
    vertices.push([0, h, 0], [0, -h, 0]);
    uvs.push([0.5, 0.5], [0.5, 0.5]);
    normals.push([0, 1, 0],[0, -1, 0]);
    // build top/bottom
    for (let i=0; i<sides; i++) {
      const p1: [number, number, number] = [x0 * radius, h, z0 * radius];
      const p2: [number, number, number] = [x0 * radius, -h, z0 * radius];
      const u1: [number, number] = [(1 + x0)/2, (1 + z0)/2];
      const u2: [number, number] = [(1 + x0)/2, (1 + z0)/2];
      // add points
      vertices.push(p1, p2);
      uvs.push(u1, u2);
      normals.push([0,1,0],[0,-1,0]);
      // prepare next slice
      let x1 = Math.cos(da) * x0 - Math.sin(da) * z0;
      let z1 = Math.cos(da) * z0 + Math.sin(da) * x0;
      x0 = 0 + Number(x1.toFixed(6));
      z0 = 0 + Number(z1.toFixed(6));
    }
    // generate indexing
    for (let i=2; i<vertices.length-2; i++) {
      // bottom
      if (i % 2) index.push(i, i+2, 1);
      // top
      else index.push(i, 0, i+2);
    }
    index.push(vertices.length-2, 0, 2);
    index.push(vertices.length-1, 3, 1);
    // build sides
    const new0 = vertices.length;
    x0 = 1;
    z0 = 0;
    for (let i=0; i<sides+1; i++) {
      const p1: [number, number, number] = [x0 * radius, h, z0 * radius];
      const p2: [number, number, number] = [x0 * radius, -h, z0 * radius];
      const u1: [number, number] = [i/sides, 1];
      const u2: [number, number] = [i/sides, 0];
      // add points
      vertices.push(p1, p2);
      uvs.push(u1, u2);
      normals.push([x0,0,z0],[x0,0,z0]);
      // prepare next slice
      let x1 = Math.cos(da) * x0 - Math.sin(da) * z0;
      let z1 = Math.cos(da) * z0 + Math.sin(da) * x0;
      x0 = 0 + Number(x1.toFixed(6));
      z0 = 0 + Number(z1.toFixed(6));
    }
    // generate indexing
    for (let i=new0; i<vertices.length-2; i++) {
      if (i % 2) index.push(i, i+1, i+2);
      else index.push(i+1, i, i+2);
    }

    return { vertices, uvs, normals, index };
  }
  static tube(outerRadius:number, innerRadius:number, height:number, sides:number): Shape {
    if (sides < 2) throw new Error("Sides count must be greater than 2");
    const vertices: Array<[number, number, number]> = [];
    const uvs: Array<[number, number]> = [];
    const normals: Array<[number, number, number]> = [];
    const index: Array<number> = [];
    const da = 2 * Math.PI / sides;
    const dr = innerRadius / outerRadius;
    const h = height/2;
    let x0 = 1, z0 = 0;
    // build top/bottom
    for (let i=0; i<sides; i++) {
      const p1: [number, number, number] = [x0 * outerRadius, h, z0 * outerRadius];
      const p2: [number, number, number] = [x0 * outerRadius, -h, z0 * outerRadius];
      const p3: [number, number, number] = [x0 * innerRadius, h, z0 * innerRadius];
      const p4: [number, number, number] = [x0 * innerRadius, -h, z0 * innerRadius];
      const u1: [number, number] = [(1 + x0)/2, (1 + z0)/2];
      const u2: [number, number] = [(1 + x0)/2, (1 + z0)/2];
      const u3: [number, number] = [(1 + dr * x0)/2, (1 + dr * z0)/2];
      const u4: [number, number] = [(1 + dr * x0)/2, (1 + dr * z0)/2];
      // add points
      vertices.push(p1, p2, p3, p4);
      uvs.push(u1, u2, u3, u4);
      normals.push([0,1,0],[0,-1,0]);
      // prepare next slice
      let x1 = Math.cos(da) * x0 - Math.sin(da) * z0;
      let z1 = Math.cos(da) * z0 + Math.sin(da) * x0;
      x0 = 0 + Number(x1.toFixed(6));
      z0 = 0 + Number(z1.toFixed(6));
    }
    // generate indexing
    for (let i=0; i<vertices.length-5; i+=2) {
      if (i % 4) {
        index.push(i+2, i, i+4);
        index.push(i+1, i+3, i+5);
      } else {
        index.push(i, i+2, i+4);
        index.push(i+3, i+1, i+5);
      }
    }
    // final faces join back to first 2 vertices
    index.push(vertices.length-4, vertices.length-2, 0);
    index.push(0, vertices.length-2, 2);
    index.push(vertices.length-1, vertices.length-3, 1);
    index.push(vertices.length-1, 1, 3);
    // build sides
    const new0 = vertices.length;
    x0 = 1;
    z0 = 0;
    for (let i=0; i<sides+1; i++) {
      const p1: [number, number, number] = [x0 * outerRadius, h, z0 * outerRadius];
      const p2: [number, number, number] = [x0 * innerRadius, h, z0 * innerRadius];
      const p3: [number, number, number] = [x0 * outerRadius, -h, z0 * outerRadius];
      const p4: [number, number, number] = [x0 * innerRadius, -h, z0 * innerRadius];
      const u1: [number, number] = [i/sides, 1];
      const u2: [number, number] = [i/sides, 1];
      const u3: [number, number] = [i/sides, 0];
      const u4: [number, number] = [i/sides, 0];
      // add points
      vertices.push(p1, p2, p3, p4);
      uvs.push(u1, u2, u3, u4);
      normals.push([0,1,0],[0,-1,0]);
      // prepare next slice
      let x1 = Math.cos(da) * x0 - Math.sin(da) * z0;
      let z1 = Math.cos(da) * z0 + Math.sin(da) * x0;
      x0 = 0 + Number(x1.toFixed(6));
      z0 = 0 + Number(z1.toFixed(6));
    }
    // generate indexing
    for (let i=new0; i<vertices.length-4; i+=2) {
      if (i % 4) {
        index.push(i, i+2, i+4);
        index.push(i+3, i+1, i+5);
      } else {
        index.push(i+2, i, i+4);
        index.push(i+1, i+3, i+5);
      }
    }

    return { vertices, uvs, normals, index };
  }
  // static cone() {
  //   // todo
  // }
  // static sphere() {
  //   // todo
  // }
  // static torus() {
  //   // todo
  // }
}

export default Primitives;