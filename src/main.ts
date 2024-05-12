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
    renderer.updateClearRGB(80, 100, 160);
    const size = 40;
    // create pipeline
    const pipe1 = renderer.addPipeline(shader);
    // declare vertices to draw (in sets of tris)
    const verts: Array<[number, number, number]> = [
      [size, size, 0], [size, -size, 0], [-size, -size, 0],
      [size, size, 0], [-size, size, 0], [-size, -size, 0],
      [-size, size, 0], [-size, -size, 0], [-size-20, 0, 0],
      [size, size, 0], [size, -size, 0], [size+20, 0, 0],
    ];
    // declare uv setup
    const uvs: Array<[number, number]> = [
      [0, 0], [0, 1], [1, 1],
      [0, 0], [1, 0], [1, 1],
      [1, 0], [1, 1], [0, 0],
      [0, 0], [0, 1], [1, 1],
    ]
    const obj1 = renderer.addObject2D(pipe1, verts, uvs);
    const obj2 = renderer.addObject2D(pipe1, verts, uvs);
    const obj3 = renderer.addObject2D(pipe1, verts, uvs);
    // update properties
    renderer.updateObject2D(obj2, [40, 0, 0]);
    renderer.updateObject2D(obj3, [-40, 0, 0]);
    // render to canvas
    renderer.draw();
    log("Drew to canvas");
  
    // button event listeners
    let rot: number = 0;
    let intervalHolder: ReturnType<typeof setInterval> | null = null;
    function update() {
      // update properties
      rot += 2;
      const s1 = 1.2 + 0.2 * Math.sin(rot / 100);
      const s2 = 1.2 + 0.2 * Math.cos(rot / 100);
      renderer.updateObject2D(obj2, [40, 0, 0], [0, 0, 1], rot, [s1, s1, 1]);
      renderer.updateObject2D(obj3, [-40, 0, 0], [0, 0, 1], -rot, [s2, s2, 1]);
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
        renderer.updateObject2D(obj1);
        const s1 = 1.2 + 0.2 * Math.sin(rot / 100);
        const s2 = 1.2 + 0.2 * Math.cos(rot / 100);
        renderer.updateObject2D(obj2, [40, 0, 0], [0, 0, 1], rot, [s1, s1, 1]);
        renderer.updateObject2D(obj3, [-40, 0, 0], [0, 0, 1], -rot, [s2, s2, 1]);
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