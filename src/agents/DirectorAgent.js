/**
 * DirectorAgent - Kurgucu/Yönetmen Ajan (v2)
 *
 * Tüm ajanları koordine eder, bölümü baştan sona üretir.
 * Yeni pipeline: Senaryo → Sprite → Karakter → Animasyon → Ses → Render → Video
 *
 * Bu ajan, tüm sistemin "orkestra şefi"dir.
 */
import { ScriptWriter } from './ScriptWriter.js';
import { ArtistAgent } from './ArtistAgent.js';
import { AnimatorAgent } from './AnimatorAgent.js';
import { SoundAgent } from './SoundAgent.js';
import { FFmpegAgent } from './FFmpegAgent.js';
import { SpriteGenerator } from './SpriteGenerator.js';
import { Renderer } from '../engine/Renderer.js';

export class DirectorAgent {
  constructor(config = {}) {
    this.scriptWriter = new ScriptWriter({
      targetAge: config.targetAge || '4-8',
      language: config.language || 'tr',
      claudeApiKey: config.claudeApiKey,
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
      elevenLabsApiKey: config.elevenLabsApiKey,
      voiceIds: config.voiceIds,
      outputDir: config.outputDir ? `${config.outputDir}/audio` : './output/audio',
    });

    this.spriteGen = new SpriteGenerator({
      outputDir: config.outputDir ? `${config.outputDir}/sprites` : './output/sprites',
      stabilityApiKey: config.stabilityApiKey,
      provider: config.spriteProvider || 'stability',
    });

    this.ffmpeg = new FFmpegAgent({
      fps: config.fps || 24,
      width: config.width || 1280,
      height: config.height || 720,
      outputDir: config.outputDir || './output',
    });

    this.renderer = new Renderer({
      width: config.width || 1280,
      height: config.height || 720,
      fps: config.fps || 24,
      outputDir: config.outputDir ? `${config.outputDir}/frames` : './output/frames',
    });

    this.config = config;
  }

  /**
   * Tam bir bölüm üret (uçtan uca pipeline v2)
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

    const episodeId = this.sanitizeId(params.title);
    const result = {
      title: params.title,
      episodeId,
      stages: {},
      timing: {},
    };

    // ── AŞAMA 1: SENARYO ─────────────────────────────
    console.log('\n📝 Aşama 1: Senaryo yazılıyor...');
    const scriptStart = Date.now();

    const episode = await this.scriptWriter.generateEpisode({
      title: params.title,
      theme: params.theme,
      characters: params.characters,
      setting: params.setting,
    });

    result.stages.script = episode;
    result.timing.script = Date.now() - scriptStart;
    console.log(`   ✓ ${episode.scenes.length} sahne, ${episode.totalDuration}sn toplam süre`);
    console.log(`   ✓ Üretim yöntemi: ${episode.generatedBy || 'template'}`);

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

    // ── AŞAMA 2b: AI SPRITE ÜRETİMİ (opsiyonel) ────
    if (this.config.generateSprites) {
      console.log('\n🖼️  Aşama 2b: AI sprite üretimi...');
      const spriteStart = Date.now();

      for (const charSpec of params.characters) {
        try {
          const spriteResult = await this.spriteGen.generateCharacterSprites(charSpec);
          result.stages.sprites = result.stages.sprites || {};
          result.stages.sprites[charSpec.name] = spriteResult;
        } catch (err) {
          console.log(`   ⚠ ${charSpec.name} sprite üretimi atlandı: ${err.message}`);
        }
      }

      result.timing.sprites = Date.now() - spriteStart;
    }

    // ── AŞAMA 3: ANİMASYON ──────────────────────────
    console.log('\n🎭 Aşama 3: Sahneler animasyona dönüştürülüyor...');
    const animStart = Date.now();

    const scenes = this.animator.buildEpisode(episode, characterSheets);
    result.stages.scenes = scenes.map(s => s.name);
    result.timing.animation = Date.now() - animStart;
    console.log(`   ✓ ${scenes.length} sahne hazır`);

    // ── AŞAMA 4: SES ÜRETİMİ ────────────────────────
    console.log('\n🔊 Aşama 4: Ses üretimi...');
    const soundStart = Date.now();

    let soundResult;
    try {
      soundResult = await this.sound.generateEpisodeAudio(episode, episodeId);
    } catch (err) {
      console.log(`   ⚠ Ses üretimi hatası: ${err.message}`);
      // Ses planı yine de oluştur
      soundResult = {
        soundPlan: episode.scenes.map(s => this.sound.createSoundPlan(s)),
        dialogueFiles: [],
        totalDialogues: 0,
        errors: [{ error: err.message }],
      };
    }

    result.stages.sound = {
      totalDialogues: soundResult.totalDialogues,
      trackCount: soundResult.soundPlan.reduce((s, p) => s + p.tracks.length, 0),
      errors: soundResult.errors.length,
    };
    result.timing.sound = Date.now() - soundStart;
    console.log(`   ✓ ${soundResult.totalDialogues} diyalog, ${result.stages.sound.trackCount} ses track'i`);

    // ── AŞAMA 5: RENDER ─────────────────────────────
    console.log('\n🎥 Aşama 5: Frame\'ler render ediliyor...');
    const renderStart = Date.now();

    const allFrames = this.renderer.renderAll(scenes);
    result.stages.render = { totalFrames: allFrames.length };
    result.timing.render = Date.now() - renderStart;

    // ── AŞAMA 6: VIDEO ÜRETİMİ ─────────────────────
    console.log('\n🎬 Aşama 6: Video oluşturuluyor...');
    const videoStart = Date.now();

    const videoResult = await this.ffmpeg.produceVideo({
      episodeId,
      framePaths: allFrames,
      soundResult,
    });

    result.stages.video = {
      success: videoResult.success,
      outputFile: videoResult.outputFile,
      scriptFile: videoResult.scriptFile,
    };
    result.timing.video = Date.now() - videoStart;

    // ── ÖZET ─────────────────────────────────────────
    const totalTime = Date.now() - scriptStart;
    console.log('\n' + '='.repeat(60));
    console.log(`🎬 BÖLÜM TAMAMLANDI: "${params.title}"`);
    console.log(`   Senaryo: ${episode.generatedBy || 'template'}`);
    console.log(`   Sahneler: ${scenes.length}`);
    console.log(`   Frame'ler: ${allFrames.length}`);
    console.log(`   Diyaloglar: ${soundResult.totalDialogues}`);
    console.log(`   Video: ${videoResult.success ? videoResult.outputFile : 'FFmpeg gerekli'}`);
    console.log(`   Toplam süre: ${(totalTime / 1000).toFixed(1)}sn`);

    result.timing.total = totalTime;
    result.framePaths = allFrames;
    result.videoResult = videoResult;

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
        characters: seriesConfig.characters,
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
    const episode = this.scriptWriter.generateFromTemplate(params);
    const characterSheets = new Map();
    for (const charSpec of params.characters) {
      characterSheets.set(charSpec.name, this.artist.createCharacter(charSpec));
    }
    const scenes = this.animator.buildEpisode(episode, characterSheets);

    if (sceneIndex >= scenes.length) sceneIndex = 0;
    const scene = scenes[sceneIndex];

    const dt = 1 / this.renderer.fps;
    const steps = Math.floor(timeInScene * this.renderer.fps);
    for (let i = 0; i < steps; i++) {
      scene.update(dt);
    }

    return this.renderer.renderFrame(scene);
  }

  sanitizeId(title) {
    return title
      .replace(/[ıİ]/g, 'i')
      .replace(/[öÖ]/g, 'o')
      .replace(/[üÜ]/g, 'u')
      .replace(/[çÇ]/g, 'c')
      .replace(/[şŞ]/g, 's')
      .replace(/[ğĞ]/g, 'g')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
  }
}
