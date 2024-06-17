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
    if (sides < 3) throw new Error("Sides count must be greater than 2");
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
    if (sides < 3) throw new Error("Sides count must be greater than 2");
    const vertices: Array<[number, number, number]> = [];
    const uvs: Array<[number, number]> = [];
    const normals: Array<[number, number, number]> = [];
    const index: Array<number> = [];
    const dr = innerRadius / outerRadius;
    // build points
    for (let i=0; i<sides; i++) {
      const theta = 2 * Math.PI * i / sides;
      const x = Math.cos(theta);
      const y = Math.sin(theta);
      const p1: [number, number, number] = [x * outerRadius, y * outerRadius, zIndex];
      const p2: [number, number, number] = [x * innerRadius, y * innerRadius, zIndex];
      const u1: [number, number] = [(1 + x)/2, (1 + y)/2];
      const u2: [number, number] = [(1 + dr * x)/2, (1 + dr * y)/2];
      // add points
      vertices.push(p1, p2);
      uvs.push(u1, u2);
      normals.push([0,0,1],[0,0,1]);
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
    if (sides < 3) throw new Error("Sides count must be greater than 2");
    const vertices: Array<[number, number, number]> = [];
    const uvs: Array<[number, number]> = [];
    const normals: Array<[number, number, number]> = [];
    const index: Array<number> = [];
    const h = height/2;
    // build top/bottom center
    vertices.push([0, h, 0], [0, -h, 0]);
    uvs.push([0.5, 0.5], [0.5, 0.5]);
    normals.push([0, 1, 0],[0, -1, 0]);
    // build top/bottom
    for (let i=0; i<sides; i++) {
      const theta = 2 * Math.PI * i / sides;
      const x = Math.cos(theta);
      const z = Math.sin(theta);
      const p1: [number, number, number] = [x * radius, h, z * radius];
      const p2: [number, number, number] = [x * radius, -h, z * radius];
      const u1: [number, number] = [(1 + x)/2, (1 + z)/2];
      const u2: [number, number] = [(1 + x)/2, (1 - z)/2];
      // add points
      vertices.push(p1, p2);
      uvs.push(u1, u2);
      normals.push([0,1,0],[0,-1,0]);
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
    for (let i=0; i<sides+1; i++) {
      const theta = 2 * Math.PI * i / sides;
      const x = Math.cos(theta);
      const z = Math.sin(theta);
      const p1: [number, number, number] = [x * radius, h, z * radius];
      const p2: [number, number, number] = [x * radius, -h, z * radius];
      const u1: [number, number] = [i/sides, 1];
      const u2: [number, number] = [i/sides, 0];
      // add points
      vertices.push(p1, p2);
      uvs.push(u1, u2);
      normals.push([x,0,z],[x,0,z]);
    }
    // generate indexing
    for (let i=new0; i<vertices.length-2; i++) {
      if (i % 2) index.push(i, i+1, i+2);
      else index.push(i+1, i, i+2);
    }

    return { vertices, uvs, normals, index };
  }
  static tube(outerRadius:number, innerRadius:number, height:number, sides:number): Shape {
    if (sides < 3) throw new Error("Sides count must be greater than 2");
    const vertices: Array<[number, number, number]> = [];
    const uvs: Array<[number, number]> = [];
    const normals: Array<[number, number, number]> = [];
    const index: Array<number> = [];
    const dr = innerRadius / outerRadius;
    const h = height/2;
    // build top/bottom
    for (let i=0; i<sides; i++) {
      const theta = 2 * Math.PI * i / sides;
      const x = Math.cos(theta);
      const z = Math.sin(theta);
      const p1: [number, number, number] = [x * outerRadius, h, z * outerRadius];
      const p2: [number, number, number] = [x * outerRadius, -h, z * outerRadius];
      const p3: [number, number, number] = [x * innerRadius, h, z * innerRadius];
      const p4: [number, number, number] = [x * innerRadius, -h, z * innerRadius];
      const u1: [number, number] = [(1 + x)/2, (1 + z)/2];
      const u2: [number, number] = [(1 + x)/2, (1 - z)/2];
      const u3: [number, number] = [(1 + dr * x)/2, (1 + dr * z)/2];
      const u4: [number, number] = [(1 + dr * x)/2, (1 - dr * z)/2];
      // add points
      vertices.push(p1, p2, p3, p4);
      uvs.push(u1, u2, u3, u4);
      normals.push([0,1,0],[0,-1,0],[0,1,0],[0,-1,0]);
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
    for (let i=0; i<sides+1; i++) {
      const theta = 2 * Math.PI * i / sides;
      const x = Math.cos(theta);
      const z = Math.sin(theta);
      const p1: [number, number, number] = [x * outerRadius, h, z * outerRadius];
      const p2: [number, number, number] = [x * innerRadius, h, z * innerRadius];
      const p3: [number, number, number] = [x * outerRadius, -h, z * outerRadius];
      const p4: [number, number, number] = [x * innerRadius, -h, z * innerRadius];
      const u1: [number, number] = [i/sides, 1];
      const u2: [number, number] = [i/sides, 1];
      const u3: [number, number] = [i/sides, 0];
      const u4: [number, number] = [i/sides, 0];
      // add points
      vertices.push(p1, p2, p3, p4);
      uvs.push(u1, u2, u3, u4);
      normals.push([x,0,z],[x,0,z],[x,0,z],[x,0,z]);
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
  static cone(radius:number, height:number, sides:number): Shape {
    if (sides < 3) throw new Error("Sides count must be greater than 2");
    const vertices: Array<[number, number, number]> = [];
    const uvs: Array<[number, number]> = [];
    const normals: Array<[number, number, number]> = [];
    const index: Array<number> = [];
    // build top
    vertices.push([0, height, 0]);
    uvs.push([0.5, 1]);
    normals.push([0, 1, 0]);
    // build sides
    for (let i=0; i<sides+1; i++) {
      const theta = 2 * Math.PI * i / sides;
      const x = Math.cos(theta);
      const z = Math.sin(theta);
      const p: [number, number, number] = [x * radius, 0, z * radius];
      const u: [number, number] = [i/sides, 0];
      // add points
      vertices.push(p);
      uvs.push(u);
      normals.push([x,0,z]);
    }
    // generate indexing
    for (let i=1; i<vertices.length-1; i++) {
      index.push(i+1, i, 0);
    }
    // build bottom center
    vertices.push([0, 0, 0]);
    uvs.push([0.5, 0.5]);
    normals.push([0, -1, 0]);
    // build bottom
    const new0 = vertices.length;
    for (let i=0; i<sides; i++) {
      const theta = 2 * Math.PI * i / sides;
      const x = Math.cos(theta);
      const z = Math.sin(theta);
      const p: [number, number, number] = [x * radius, 0, z * radius];
      const u: [number, number] = [(1 + x)/2, (1 - z)/2];
      // add points
      vertices.push(p);
      uvs.push(u);
      normals.push([0,-1,0]);
    }
    // generate index
    for (let i=new0; i<vertices.length; i++) {
      index.push(i, i+1, new0-1);
    }
    // final face joins back to first vertex
    index.push(vertices.length-1, new0, new0-1);

    return { vertices, uvs, normals, index };
  }
  static sphere(radius:number, sides:number, slices:number): Shape {
    if (sides < 3) throw new Error("Sides count must be greater than 2");
    const vertices: Array<[number, number, number]> = [];
    const uvs: Array<[number, number]> = [];
    const normals: Array<[number, number, number]> = [];
    const index: Array<number> = [];
    // add top point
    vertices.push([0, radius, 0]);
    uvs.push([0.5,0.5]);
    normals.push([0,1,0]);
    // generate points per slice
    for (let i=0; i<slices - 1; i++) {
      const phi = Math.PI * (i+1) / slices;
      for (let j=0; j<sides; j++) {
        const theta = 2 * Math.PI * j / sides;
        const x = Math.sin(phi) * Math.cos(theta);
        const y = Math.cos(phi);
        const z = Math.sin(phi) * Math.sin(theta);
        const p: [number, number, number] = [x * radius, y * radius, z * radius];
        const u: [number, number] = [(1 + x)/2, (1 + z)/2];
        // add points
        vertices.push(p);
        uvs.push(u);
        normals.push([x,y,z]);
      }
    }
    // add bottom point
    vertices.push([0, -radius, 0]);
    uvs.push([0.5,0.5]);
    normals.push([0,-1,0]);
    // generate top/bottom index
    for (let i=0; i < sides; i++) {
      let i0 = i + 1, i1 = (i + 1) % sides + 1;
      index.push(0, i1, i0);
      i0 = i + sides * (slices - 2) + 1;
      i1 = (i + 1) % sides + sides * (slices - 2) + 1;
      index.push(vertices.length-1, i0, i1);
    }
    // generate slice indices
    for (let j = 0; j < slices - 2; j++) {
      let j0 = j * sides + 1;
      let j1 = (j + 1) * sides + 1;
      for (let i=0; i < sides; i++) {
        let i0 = j0 + i;
        let i1 = j0 + (i + 1) % sides;
        let i2 = j1 + (i + 1) % sides;
        let i3 = j1 + i;
        index.push(i0, i1, i2, i2, i3, i0);
      }
    }

    return { vertices, uvs, normals, index };
  }
  static hemisphere(radius:number, sides:number, slices:number): Shape {
    if (sides < 3) throw new Error("Sides count must be greater than 2");
    const vertices: Array<[number, number, number]> = [];
    const uvs: Array<[number, number]> = [];
    const normals: Array<[number, number, number]> = [];
    const index: Array<number> = [];
    // add top point
    vertices.push([0, radius, 0]);
    uvs.push([0.5,0.5]);
    normals.push([0,1,0]);
    // generate points per slice
    for (let i=0; i<slices; i++) {
      const phi = Math.PI * (i+1) / (2 * slices);
      for (let j=0; j<sides; j++) {
        const theta = 2 * Math.PI * j / sides;
        const x = Math.sin(phi) * Math.cos(theta);
        const y = Math.cos(phi);
        const z = Math.sin(phi) * Math.sin(theta);
        const p: [number, number, number] = [x * radius, y * radius, z * radius];
        const u: [number, number] = [(1 + x)/2, (1 + z)/2];
        // add points
        vertices.push(p);
        uvs.push(u);
        normals.push([x,y,z]);
      }
    }
    // generate top index
    for (let i=0; i < sides; i++) {
      let i0 = i + 1, i1 = (i + 1) % sides + 1;
      index.push(0, i1, i0);
    }
    // generate slice indices
    for (let j = 0; j < slices - 1; j++) {
      let j0 = j * sides + 1;
      let j1 = (j + 1) * sides + 1;
      for (let i=0; i < sides; i++) {
        let i0 = j0 + i;
        let i1 = j0 + (i + 1) % sides;
        let i2 = j1 + (i + 1) % sides;
        let i3 = j1 + i;
        index.push(i0, i1, i2, i2, i3, i0);
      }
    }
    // generate bottom face
    const new0 = vertices.length;
    for (let i=0; i < sides; i++) {
      const theta = 2 * Math.PI * i / sides;
      const x = Math.cos(theta);
      const z = Math.sin(theta);
      const p: [number, number, number] = [x * radius, 0, z * radius];
      const u: [number, number] = [(1 + x)/2, (1 + z)/2];
      // add points
      vertices.push(p);
      uvs.push(u);
      normals.push([0,-1,0]);
    }
    // add bottom point
    vertices.push([0, 0, 0]);
    uvs.push([0.5,0.5]);
    normals.push([0,-1,0]);
    const center = vertices.length - 1;
    // index bottom face
    for (let i=0; i < sides - 1; i++) {
      index.push(center, new0 + i, new0 + i + 1);
    }
    index.push(center, center - 1, new0);

    return { vertices, uvs, normals, index };
  }
  // static torus() {
  //   // todo
  // }
}

export default Primitives;