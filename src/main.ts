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
    const rotAxis1: [number, number, number] = [1, -1, 0.3];
    const rotAxis2: [number, number, number] = [-1, 1, 0.3];
    const rotAxis3: [number, number, number] = [1, 0.3, -1];
    const rotAxis4: [number, number, number] = [-1, 0.3, 1];
    const rotAxis5: [number, number, number] = [0.3, 1, -1];
    const rotAxis6: [number, number, number] = [0.3, -1, 1];
    let rot: number = 76;
    // create pipeline
    const pipe1 = renderer.addPipeline(shader, 1000);
    // declare vertices to draw (in sets of tris)
    const cube = Primitives.cube(10, 10, 10);
    for (let i=0; i<1000; i++) {
      renderer.addObject(pipe1, cube.vertices, cube.uvs, cube.normals);
    }
    // update obj parameters
    function update(redraw:boolean = false) {
      // update properties
      if (!redraw) rot += 1;
      for (let i=0; i<32; i++) {
        for (let j=0; j<31; j++) {
          const id: number = i*31 + j;
          let raxis: [number, number, number] = [0, 0, 1];
          switch((i+j) % 6) {
            case 1:
              raxis = rotAxis1;
              break;
            case 2:
              raxis = rotAxis2;
              break;
            case 3:
              raxis = rotAxis3;
              break;
            case 4:
              raxis = rotAxis4;
              break;
            case 5:
              raxis = rotAxis5;
              break;
            default:
              raxis = rotAxis6;
              break;
          }
          const s = (i*j) % 4 ? 1 : 1.5;
          renderer.updateObject(id, [248 - i * 16, 240 - j * 16, 0], raxis, rot + j * 3 - i * 3, [s, s, s]);
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
        canvas.width = canvas.width === 650 ? 512 : 650;
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