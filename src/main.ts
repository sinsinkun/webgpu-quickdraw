import { Renderer, Primitives } from './renderer';
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
    const vertices: Array<[number, number, number]> = [
      [260, 260, 0],[260, -260, 0],[-260, -260, 0],
      [-260, -260, 0],[-260, 260, 0],[260, 260, 0],
    ];
    const uvs: Array<[number, number]> = [
      [1,1],[1,0],[0,0],
      [0,0],[0,1],[1,1],
    ];
    const normals: Array<[number, number, number]> = [
      [-1,0,-1],[-1,-1,-1],[0,-1,-1],
      [0,-1,-1],[-1,-1,-1],[-1,0,-1],
    ]
    let rot: number = 60;
    let raxis: [number, number, number] = [1, 0.6, 0.3];
    // create pipeline
    let bitmap1: ImageBitmap = await renderer.loadTexture('/logo.png');
    const pipe1 = renderer.addPipeline(shader, 10, bitmap1);
    const pipe2 = renderer.addPipeline(shader, 10);
    renderer.addObject(pipe1, vertices, uvs, normals);
    // create objects
    const cube = Primitives.cube(40, 40, 40);
    for (let i=1; i<10; i++) {
      renderer.addObject(pipe2, cube.vertices, cube.uvs, cube.normals);
    }
    // update obj parameters
    function update(redraw:boolean = false) {
      // update properties
      if (!redraw) rot += 2;
      renderer.updateObject(0, [0, 0, 0]);
      for (let i=1; i<10; i++) {
        renderer.updateObject(i, [300 - i * 60, 50 * Math.sin(i), 20], raxis, rot);
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