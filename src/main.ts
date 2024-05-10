import { Renderer, vec2 } from './renderer';
import type { Vec2 } from './renderer';
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
  const renderer = new Renderer;
  if (canvas) await renderer.init(canvas);
  renderer.updateClearRGB(30, 10, 60);
  const verts: Array<Vec2> = [
    vec2.create(120, 120),vec2.create(120, -120),vec2.create(-120, -120),
    vec2.create(120, 120),vec2.create(-120, 120),vec2.create(-120, -120),
  ];
  renderer.createPipeline2D(verts, shader);
  renderer.draw();
  log("Drew to canvas");

} catch (err) {
  console.log(err);
  log(`${err}`);
}