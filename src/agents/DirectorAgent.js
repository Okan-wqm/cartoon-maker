/**
 * DirectorAgent - Kurgucu/Yönetmen Ajan
 *
 * Tüm ajanları koordine eder, bölümü baştan sona üretir.
 * Senarist → Sanatçı → Animatör → Ses → Render pipeline.
 *
 * Bu ajan, tüm sistemin "orkestra şefi"dir.
 */
import { ScriptWriter } from './ScriptWriter.js';
import { ArtistAgent } from './ArtistAgent.js';
import { AnimatorAgent } from './AnimatorAgent.js';
import { SoundAgent } from './SoundAgent.js';
import { Renderer } from '../engine/Renderer.js';

export class DirectorAgent {
  constructor(config = {}) {
    this.scriptWriter = new ScriptWriter({
      targetAge: config.targetAge || '4-8',
      language: config.language || 'tr',
    });

    this.artist = new ArtistAgent({
      style: config.artStyle || 'cartoon',
    });

    this.animator = new AnimatorAgent({
      fps: config.fps || 24,
      width: config.width || 1280,
      height: config.height || 720,
    });

    this.sound = new SoundAgent({
      language: config.language || 'tr-TR',
    });

    this.renderer = new Renderer({
      width: config.width || 1280,
      height: config.height || 720,
      fps: config.fps || 24,
      outputDir: config.outputDir || './output/frames',
    });

    this.config = config;
  }

  /**
   * Tam bir bölüm üret (uçtan uca pipeline)
   *
   * @param {object} params
   * @param {string} params.title - "Ökkeş Balık Avında"
   * @param {string} params.theme - "sayılar"
   * @param {object[]} params.characters - Karakter tanımları
   * @param {string} params.setting - "göl kenarı"
   * @returns {EpisodeResult}
   */
  async produceEpisode(params) {
    console.log(`\n🎬 BÖLÜM ÜRETİMİ BAŞLIYOR: "${params.title}"`);
    console.log('='.repeat(60));

    const result = {
      title: params.title,
      stages: {},
      timing: {},
    };

    // ── AŞAMA 1: SENARYO ─────────────────────────────
    console.log('\n📝 Aşama 1: Senaryo yazılıyor...');
    const scriptStart = Date.now();

    const episode = this.scriptWriter.generateEpisode({
      title: params.title,
      theme: params.theme,
      characters: params.characters,
      setting: params.setting,
    });

    result.stages.script = episode;
    result.timing.script = Date.now() - scriptStart;
    console.log(`   ✓ ${episode.scenes.length} sahne, ${episode.totalDuration}sn toplam süre`);

    // ── AŞAMA 2: KARAKTER TASARIMI ───────────────────
    console.log('\n🎨 Aşama 2: Karakterler tasarlanıyor...');
    const artStart = Date.now();

    const characterSheets = new Map();
    for (const charSpec of params.characters) {
      const sheet = this.artist.createCharacter(charSpec);
      characterSheets.set(charSpec.name, sheet);
      console.log(`   ✓ "${charSpec.name}" (${charSpec.type}) karakter sheet'i oluşturuldu`);
    }

    result.stages.characters = [...characterSheets.keys()];
    result.timing.art = Date.now() - artStart;

    // ── AŞAMA 3: ANİMASYON ──────────────────────────
    console.log('\n🎭 Aşama 3: Sahneler animasyona dönüştürülüyor...');
    const animStart = Date.now();

    const scenes = this.animator.buildEpisode(episode, characterSheets);
    result.stages.scenes = scenes.map(s => s.name);
    result.timing.animation = Date.now() - animStart;
    console.log(`   ✓ ${scenes.length} sahne hazır`);

    // ── AŞAMA 4: SES TASARIMI ───────────────────────
    console.log('\n🔊 Aşama 4: Ses planı oluşturuluyor...');
    const soundStart = Date.now();

    const soundPlans = episode.scenes.map(sceneScript =>
      this.sound.createSoundPlan(sceneScript)
    );

    result.stages.sound = soundPlans.map(p => ({
      scene: p.sceneName,
      trackCount: p.tracks.length,
    }));
    result.timing.sound = Date.now() - soundStart;
    console.log(`   ✓ ${soundPlans.reduce((s, p) => s + p.tracks.length, 0)} ses track'i planlandı`);

    // ── AŞAMA 5: RENDER ─────────────────────────────
    console.log('\n🎥 Aşama 5: Frame\'ler render ediliyor...');
    const renderStart = Date.now();

    const allFrames = this.renderer.renderAll(scenes);
    result.stages.render = { totalFrames: allFrames.length };
    result.timing.render = Date.now() - renderStart;

    // ── ÖZET ─────────────────────────────────────────
    const totalTime = Date.now() - scriptStart;
    console.log('\n' + '='.repeat(60));
    console.log(`🎬 BÖLÜM TAMAMLANDI: "${params.title}"`);
    console.log(`   Sahneler: ${scenes.length}`);
    console.log(`   Frame'ler: ${allFrames.length}`);
    console.log(`   Ses Track'leri: ${soundPlans.reduce((s, p) => s + p.tracks.length, 0)}`);
    console.log(`   Toplam süre: ${(totalTime / 1000).toFixed(1)}sn`);
    console.log(`   FFmpeg komutu: ${this.renderer.getFFmpegCommand()}`);

    result.timing.total = totalTime;
    result.framePaths = allFrames;
    result.ffmpegCommand = this.renderer.getFFmpegCommand();

    return result;
  }

  /**
   * Seri üretim: Aynı karakterlerle birden fazla bölüm
   */
  async produceSeries(seriesConfig) {
    console.log(`\n🎬🎬🎬 SERİ ÜRETİMİ: "${seriesConfig.seriesName}"`);
    console.log(`   ${seriesConfig.episodes.length} bölüm planlandı\n`);

    const results = [];

    for (let i = 0; i < seriesConfig.episodes.length; i++) {
      const ep = seriesConfig.episodes[i];
      console.log(`\n${'━'.repeat(60)}`);
      console.log(`   BÖLÜM ${i + 1}/${seriesConfig.episodes.length}`);
      console.log(`${'━'.repeat(60)}`);

      const result = await this.produceEpisode({
        ...ep,
        characters: seriesConfig.characters, // Aynı karakterler!
      });
      results.push(result);
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🎬 SERİ TAMAMLANDI: ${results.length} bölüm üretildi`);
    console.log(`   Toplam frame: ${results.reduce((s, r) => s + r.framePaths.length, 0)}`);

    return results;
  }

  /**
   * Sadece önizleme (tek frame)
   */
  previewScene(params, sceneIndex = 0, timeInScene = 0) {
    const episode = this.scriptWriter.generateEpisode(params);
    const characterSheets = new Map();
    for (const charSpec of params.characters) {
      characterSheets.set(charSpec.name, this.artist.createCharacter(charSpec));
    }
    const scenes = this.animator.buildEpisode(episode, characterSheets);

    if (sceneIndex >= scenes.length) sceneIndex = 0;
    const scene = scenes[sceneIndex];

    // Belirtilen zamana ilerlet
    const dt = 1 / this.renderer.fps;
    const steps = Math.floor(timeInScene * this.renderer.fps);
    for (let i = 0; i < steps; i++) {
      scene.update(dt);
    }

    return this.renderer.renderFrame(scene);
  }
}
