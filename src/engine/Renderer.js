/**
 * Renderer - Sahneleri frame-by-frame render eder.
 *
 * Canvas → PNG frame'ler → video çıktısı pipeline.
 * node-canvas kullanarak server-side render yapar.
 */
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export class Renderer {
  /**
   * @param {object} config
   * @param {number} config.width - Video genişlik (px)
   * @param {number} config.height - Video yükseklik (px)
   * @param {number} config.fps - Frame per second
   * @param {string} config.outputDir - Frame çıktı dizini
   */
  constructor(config = {}) {
    this.width = config.width || 1280;
    this.height = config.height || 720;
    this.fps = config.fps || 24;
    this.outputDir = config.outputDir || './output/frames';

    this.canvas = createCanvas(this.width, this.height);
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Tek bir sahneyi frame-by-frame render et
   * @param {import('./Scene.js').Scene} scene
   * @param {string} prefix - Dosya adı prefix'i
   * @returns {string[]} Frame dosya yolları
   */
  renderScene(scene, prefix = 'frame') {
    const dir = this.outputDir;
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    scene.resetScene();
    const dt = 1 / this.fps;
    const totalFrames = Math.ceil(scene.duration * this.fps);
    const framePaths = [];

    console.log(`Rendering "${scene.name}": ${totalFrames} frames @ ${this.fps}fps`);

    for (let i = 0; i < totalFrames; i++) {
      // Canvas temizle
      this.ctx.clearRect(0, 0, this.width, this.height);

      // Sahneyi çiz
      scene.render(this.ctx, this.width, this.height);

      // Frame kaydet
      const filename = `${prefix}_${String(i).padStart(5, '0')}.png`;
      const filepath = join(dir, filename);
      const buffer = this.canvas.toBuffer('image/png');
      writeFileSync(filepath, buffer);
      framePaths.push(filepath);

      // Sahneyi ilerlet
      scene.update(dt);

      if ((i + 1) % this.fps === 0) {
        console.log(`  ${Math.round((i + 1) / totalFrames * 100)}% (${i + 1}/${totalFrames})`);
      }
    }

    console.log(`  Done! ${totalFrames} frames saved to ${dir}`);
    return framePaths;
  }

  /**
   * Birden fazla sahneyi sırayla render et
   * @param {import('./Scene.js').Scene[]} scenes
   * @returns {string[]} Tüm frame dosya yolları
   */
  renderAll(scenes) {
    const allFrames = [];
    let sceneIndex = 0;

    for (const scene of scenes) {
      const prefix = `scene${String(sceneIndex).padStart(2, '0')}`;
      const frames = this.renderScene(scene, prefix);
      allFrames.push(...frames);
      sceneIndex++;
    }

    console.log(`\nTotal: ${allFrames.length} frames across ${scenes.length} scenes`);
    return allFrames;
  }

  /**
   * Tek bir kareyi render et ve buffer döndür (önizleme için)
   * @param {import('./Scene.js').Scene} scene
   * @returns {Buffer}
   */
  renderFrame(scene) {
    this.ctx.clearRect(0, 0, this.width, this.height);
    scene.render(this.ctx, this.width, this.height);
    return this.canvas.toBuffer('image/png');
  }

  /**
   * FFmpeg komutu oluştur (frame'lerden video yapmak için)
   */
  getFFmpegCommand(prefix = 'frame', outputFile = 'output.mp4') {
    return [
      'ffmpeg',
      `-framerate ${this.fps}`,
      `-i ${this.outputDir}/${prefix}_%05d.png`,
      '-c:v libx264',
      '-pix_fmt yuv420p',
      `-s ${this.width}x${this.height}`,
      outputFile,
    ].join(' ');
  }
}
