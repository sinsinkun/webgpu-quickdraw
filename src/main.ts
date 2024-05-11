import { Renderer } from './renderer';
import shader from './basic.wgsl?raw';

// get HTML elements
const canvas: HTMLCanvasElement | null = document.getElementById("canvas") as HTMLCanvasElement;
const uilog: HTMLElement | null = document.getElementById("log");
const scrollable: HTMLElement | null = document.getElementById("log-scroll");
// const btn: HTMLElement | null = document.getElementById("btn-frame+");
// const btn2: HTMLElement | null = document.getElementById("btn-auto");

// util function to print to UI
function log(msg: string): void {
  if (uilog) uilog.innerHTML += `<li>${(new Date()).toLocaleTimeString()}: ${msg}</li>`;
  if (scrollable) scrollable.scrollTo(0, scrollable.scrollHeight);
}

try {

  log("Hello world");
  // initialize renderer
  const renderer = new Renderer;
  if (canvas) await renderer.init(canvas);
  // change background color
  renderer.updateClearRGB(30, 10, 60);
  const size = 40;
  // declare vertices to draw (in sets of tris)
  const verts: Array<[number, number]> = [
    [size, size], [size, -size], [-size, -size],
    [size, size], [-size, size], [-size, -size],
    [-size, size], [-size, -size], [-size-20, 0],
    [size, size], [size, -size], [size+20, 0],
  ];
  renderer.addObject2D(0, "rect", verts, shader);
  renderer.addObject2D(1, "rect2", verts, shader);
  renderer.addObject2D(2, "rect2", verts, shader);
  // update properties
  renderer.updateObject2D(1, [150, 80], 30);
  renderer.updateObject2D(2, [-150, -80], -20);
  // render to canvas
  renderer.draw();
  log("Drew to canvas");

} catch (err) {
  console.log(err);
  log(`${err}`);
}