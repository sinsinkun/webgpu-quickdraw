import { Shape } from './index';

interface VertexGroup {
  vertex: [number, number, number],
  uv: [number, number],
  normal: [number, number, number],
}

class ModelLoader {
  // load vertex data from obj file
  static async loadObj(file: string): Promise<Shape> {
    // load raw data as text
    const rawData = await fetch(file).then(v => v.text());
    const dataArr: Array<string> = rawData.split("\n");

    // collections
    let vertices: Array<[number, number, number]> = [];
    let uvs: Array<[number, number]> = [];
    let normals: Array<[number, number, number]> = [];
    let output: Shape = {
      vertices: [],
      uvs: [],
      normals: []
    }

    // sort data into collections
    dataArr.forEach(line => {
      let type = "-";
      if (line.startsWith("v ")) type = "vertex";
      else if (line.startsWith("vt ")) type = "uv";
      else if (line.startsWith("vn ")) type = "normal";
      else if (line.startsWith("f ")) type = "index";
      else return; // skip any other line types

      // split data
      const l = line.split(" ");
      switch (type) {
        case "vertex":
          if (l.length !== 4) throw new Error("Invalid line input");
          const v: [number, number, number] = [Number(l[1]), Number(l[2]), Number(l[3])];
          vertices.push(v);
          break;
        case "uv":
          if (l.length !== 3) throw new Error("Invalid line input");
          const u: [number, number] = [Number(l[1]), Number(l[2])];
          uvs.push(u);
          break;
        case "normal":
          if (l.length !== 4) throw new Error("Invalid line input");
          const n: [number, number, number] = [Number(l[1]), Number(l[2]), Number(l[3])];
          normals.push(n);
          break;
        case "index":
          if (l.length < 4 || l.length > 5) throw new Error("Invalid line input");
          const v1: VertexGroup = this.objIndexParse(l[1], vertices, uvs, normals);
          output.vertices.push(v1.vertex);
          output.uvs.push(v1.uv);
          output.normals.push(v1.normal);
          const v2: VertexGroup = this.objIndexParse(l[2], vertices, uvs, normals);
          output.vertices.push(v2.vertex);
          output.uvs.push(v2.uv);
          output.normals.push(v2.normal);
          const v3: VertexGroup = this.objIndexParse(l[3], vertices, uvs, normals);
          output.vertices.push(v3.vertex);
          output.uvs.push(v3.uv);
          output.normals.push(v3.normal);
          if (l.length === 5) {
            const v4: VertexGroup = this.objIndexParse(l[4], vertices, uvs, normals);
            output.vertices.push(v3.vertex);
            output.uvs.push(v3.uv);
            output.normals.push(v3.normal);
            output.vertices.push(v4.vertex);
            output.uvs.push(v4.uv);
            output.normals.push(v4.normal);
            output.vertices.push(v1.vertex);
            output.uvs.push(v1.uv);
            output.normals.push(v1.normal);
          }
          break;
        case "-":
        default:
          break;
      }
    });

    return output;
  }
  // loadObj helper
  private static objIndexParse(
    indexing: string,
    verts: Array<[number, number, number]>,
    uvs: Array<[number, number]>,
    normals: Array<[number, number, number]>
  ): VertexGroup {
    // break up indexing
    const ixs = indexing.split("/");
    const vIdx = Number(ixs[0]) - 1;
    const uvIdx = Number(ixs[1]) - 1;
    const nIdx = Number(ixs[2]) - 1;

    return {
      vertex: verts[vIdx],
      uv: uvs[uvIdx],
      normal: normals[nIdx]
    }

  }
  // load vertex data from glb file
  static async loadGlb(file: string): Promise<any> {
    const rawData = await fetch(file).then(v => v.blob());
    console.log("todo", rawData);
  }
  // load vertex data from gltf file
  static async loadGltf(file: string): Promise<any> {
    const rawData = await fetch(file).then(v => v.text());
    console.log("todo", rawData);
  }
}

export default ModelLoader;