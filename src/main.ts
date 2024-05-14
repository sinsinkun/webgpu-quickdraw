import { Renderer, Primitives } from './short-webgpu';
import type { CameraType } from './short-webgpu';
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
    renderer.updateClearRGB(15, 20, 30);
    // object properties
    let rot: number = 60;
    let raxis: [number, number, number] = [1, 0.6, 0.3];
    // create pipeline
    let bitmap1: ImageBitmap = await renderer.loadTexture(import.meta.env.BASE_URL + '/logo.png');
    const pipe1 = renderer.addPipeline(shader, 10, bitmap1);
    const pipe2 = renderer.addPipeline(shader, 100);
    
    // create pcamera
    const pcam: CameraType = {
      type: "persp",
      fovY: 80,
      near: 1,
      far: 1000,
    }
    // create objects
    const rect = Primitives.rect(300, 300);
    rect.normals = [
      [-1,-1,0],[0,-1,-1],[0,0,-1],
      [0,0,-1],[-1,0,-1],[-1,-1,0],
    ]
    renderer.addObject(pipe1, rect.vertices, rect.uvs, rect.normals);
    for (let i=1; i<100; i++) {
      const size = 20 + (i%7) * 5;
      const cube = Primitives.cube(size, size, size);
      renderer.addObject(pipe2, cube.vertices, cube.uvs, cube.normals);
    }
    // update obj parameters
    function update(redraw:boolean = false) {
      // update properties
      if (!redraw) rot += 2;
      renderer.updateObject({
        id: 0, 
        translate: [0, 0, -50],
        rotateDeg: rot * 0.05,
        camera: pcam
      });
      for (let i=0; i<10; i++) {
        for (let j=0; j<10; j++) {
          if (i === 0 && j === 0) continue;
          renderer.updateObject({
            id: i*10 + j,
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
  
  } catch (err) {
    console.log(err);
    log(`${err}`);
  }
}

main();