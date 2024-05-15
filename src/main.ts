import { Renderer, Primitives } from './short-webgpu';
import type { CameraType } from './short-webgpu';
import shader1 from './basic.wgsl?raw';
import shader2 from "./showtx.wgsl?raw";

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
    renderer.updateClearRGB(15, 20, 30);
    // object properties
    let rot: number = 60;
    let raxis: [number, number, number] = [1, 0.6, 0.3];
    // create pipeline
    let bitmap1: ImageBitmap = await renderer.loadTexture(import.meta.env.BASE_URL + '/logo.png');
    const pipe1 = renderer.addPipeline(shader2, 10, bitmap1);
    const pipe2 = renderer.addPipeline(shader1, 100, bitmap1);
    
    // create pcamera
    const pcam: CameraType = {
      type: "persp",
      fovY: 80,
      near: 1,
      far: 1000,
    }
    // create objects
    const poly = Primitives.regPolygon(250, 8);
    const polyId = renderer.addObject(pipe1, poly.vertices, poly.uvs, poly.normals);
    for (let i=0; i<99; i++) {
      const size = 20 + (i%7) * 5;
      const cube = Primitives.cube(size, size, size);
      renderer.addObject(pipe2, cube.vertices, cube.uvs, cube.normals);
    }
    // update obj parameters
    function update(redraw:boolean = false) {
      // update properties
      if (!redraw) rot += 2;
      renderer.updateObject({
        pipelineId: pipe1,
        objectId: polyId, 
        translate: [0, 0, -50],
        rotateAxis: [0, 0, 1],
        rotateDeg: rot * 0.2,
        camera: pcam
      });
      for (let i=0; i<10; i++) {
        for (let j=0; j<10; j++) {
          if (i === 9 && j === 9) continue;
          renderer.updateObject({
            pipelineId: pipe2,
            objectId: i*10 + j,
            translate: [
              250 - i * 50, 
              50 * Math.sin(i + j * 0.5 + rot * 0.01) + 50 * j - 250, 
              100 * Math.cos(i + j + rot * 0.01)
            ],
            rotateAxis: raxis,
            rotateDeg: rot,
            camera: pcam
          });
        }
      }
      // render to canvas
      renderer.draw();
    }
    update(true);
    log("Drew to canvas");
  
    // button event listeners
    let intervalHolder: ReturnType<typeof setInterval> | null = null;
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
        canvas.width = canvas.width === 680 ? 512 : 680;
        renderer.updateCanvas(canvas.width, canvas.height);
        update(true);
        log("Resized canvas");
      }
    });
    // start with animation on
    // btn2?.click();
  
  } catch (err) {
    console.log(err);
    log(`${err}`);
  }
}

main();