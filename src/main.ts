import Renderer from './renderer';
import shader from './basic.wgsl?raw';

// get HTML elements
const canvas: HTMLCanvasElement | null = document.getElementById("canvas") as HTMLCanvasElement;
const uilog: HTMLElement | null = document.getElementById("log");
const scrollable: HTMLElement | null = document.getElementById("log-scroll");
const btn: HTMLElement | null = document.getElementById("btn-frame+");
const btn2: HTMLElement | null = document.getElementById("btn-auto");

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
    renderer.updateClearRGB(30, 10, 60);
    const size = 40;
    // create pipeline
    const pipe1 = renderer.addPipeline2D(shader);
    // declare vertices to draw (in sets of tris)
    const verts: Array<[number, number]> = [
      [size, size], [size, -size], [-size, -size],
      [size, size], [-size, size], [-size, -size],
      [-size, size], [-size, -size], [-size-20, 0],
      [size, size], [size, -size], [size+20, 0],
    ];
    renderer.addObject2D(verts, pipe1);
    const obj2 = renderer.addObject2D(verts, pipe1);
    const obj3 = renderer.addObject2D(verts, pipe1);
    // update properties
    renderer.updateObject2D(obj2, [40, 0]);
    renderer.updateObject2D(obj3, [-40, 0]);
    // render to canvas
    renderer.draw();
    log("Drew to canvas");
  
    // button event listeners
    let rot: number = 0;
    let intervalHolder: ReturnType<typeof setInterval> | null = null;
    function update() {
      // update properties
      rot += 2;
      renderer.updateObject2D(obj2, [40, 0], rot, 1.2 + 0.2 * Math.sin(rot / 100));
      renderer.updateObject2D(obj3, [-40, 0], -rot, 1.2 + 0.2 * Math.cos(rot / 100));
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
  
  } catch (err) {
    console.log(err);
    log(`${err}`);
  }
}

main();