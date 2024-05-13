import Renderer from './renderer';
import shader from './basic.wgsl?raw';

// get HTML elements
const canvas: HTMLCanvasElement | null = document.getElementById("canvas") as HTMLCanvasElement;
const uilog: HTMLElement | null = document.getElementById("log");
const scrollable: HTMLElement | null = document.getElementById("log-scroll");
const btn: HTMLElement | null = document.getElementById("btn-1");
const btn2: HTMLElement | null = document.getElementById("btn-2");
const btn3: HTMLElement | null = document.getElementById("btn-3");

// util function to print to UI
function log(msg: string): void {
  if (uilog) uilog.innerHTML += `<li>${(new Date()).toLocaleTimeString()}: ${msg}</li>`;
  if (scrollable) scrollable.scrollTo(0, scrollable.scrollHeight);
}

async function main() {
  try {
    log("Hello world");
    // initialize renderer
    const renderer = await Renderer.init(canvas);
    // change background color
    renderer.updateClearRGB(30, 40, 60);
    // object properties
    const size = 60;
    const offset1: [number, number, number] = [90, 0, 0];
    const offset2: [number, number, number] = [-90, 0, 0];
    const rotAxis1: [number, number, number] = [1, -1, 0.3];
    const rotAxis2: [number, number, number] = [-1, 1, 0.3];
    let rot: number = 76;
    let s1 = 1.2 + 0.4 * Math.sin(rot / 100);
    let s2 = 1.2 + 0.4 * Math.cos(rot / 100);
    // create pipeline
    const pipe1 = renderer.addPipeline(shader);
    // declare vertices to draw (in sets of tris)
    const verts: Array<[number, number, number]> = [
      // face front
      [size,size,size],[size,-size,size],[-size,-size,size],
      [-size,-size,size],[-size,size,size],[size,size,size],
      // face back
      [-size,size,-size],[-size,-size,-size],[size,-size,-size],
      [size,-size,-size],[size,size,-size],[-size,size,-size],
      // face left
      [-size,size,size],[-size,-size,size],[-size,-size,-size],
      [-size,-size,-size],[-size,size,-size],[-size,size,size],
      // face right
      [size,size,-size],[size,-size,-size],[size,-size,size],
      [size,-size,size],[size,size,size],[size,size,-size],
      // face up
      [size,-size,size],[size,-size,-size],[-size,-size,-size],
      [-size,-size,-size],[-size,-size,size],[size,-size,size],
      // face down
      [size,size,-size],[size,size,size],[-size,size,size],
      [-size,size,size],[-size,size,-size],[size,size,-size],
    ];
    // declare uv setup
    const uvs: Array<[number, number]> = [
      // face front
      [1,1],[1,0],[0,0],[0,0],[0,1],[1,1],
      // face back
      [1,1],[1,0],[0,0],[0,0],[0,1],[1,1],
      // face left
      [1,1],[1,0],[0,0],[0,0],[0,1],[1,1],
      // face right
      [1,1],[1,0],[0,0],[0,0],[0,1],[1,1],
      // face up
      [1,1],[1,0],[0,0],[0,0],[0,1],[1,1],
      // face down
      [1,1],[1,0],[0,0],[0,0],[0,1],[1,1],
    ]
    const obj1 = renderer.addObject(pipe1, verts, uvs);
    const obj2 = renderer.addObject(pipe1, verts, uvs);
    // update properties
    renderer.updateObject(obj1, offset1, rotAxis1, rot, [s1, s1, s1]);
    renderer.updateObject(obj2, offset2, rotAxis2, rot, [s2, s2, s2]);
    // render to canvas
    renderer.draw();
    log("Drew to canvas");
  
    // button event listeners
    let intervalHolder: ReturnType<typeof setInterval> | null = null;
    function update() {
      // update properties
      rot += 2;
      s1 = 1.2 + 0.4 * Math.sin(rot / 100);
      s2 = 1.2 + 0.4 * Math.cos(rot / 100);
      renderer.updateObject(obj1, offset1, rotAxis1, rot, [s1, s1, s1]);
      renderer.updateObject(obj2, offset2, rotAxis2, rot, [s2, s2, s2]);
      // render to canvas
      renderer.draw();
    }
    btn?.addEventListener("click", () => {
      update();
      log("Drew to canvas");
    });
    btn2?.addEventListener("click", () => {
      if (intervalHolder) {
        log("Stop continuous drawing");
        window.clearInterval(intervalHolder);
        intervalHolder = null;
        return;
      }
      intervalHolder = window.setInterval(update, 15);
      log("Drawing to canvas continuously");
    });
    btn3?.addEventListener("click", () => {
      if (canvas) {
        canvas.width = canvas.width === 650 ? 512 : 650;
        renderer.updateCanvas(canvas.width, canvas.height);
        renderer.updateObject(obj1, offset1, rotAxis1, rot, [s1, s1, s1]);
        renderer.updateObject(obj2, offset2, rotAxis2, rot, [s2, s2, s2]);
        renderer.draw();
        log("Resized canvas");
      }
    });
  
  } catch (err) {
    console.log(err);
    log(`${err}`);
  }
}

main();