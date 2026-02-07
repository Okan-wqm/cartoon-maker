/**
 * FFmpegAgent - Video Üretim Otomasyonu
 *
 * Frame PNG'lerden → MP4 video üretir.
 * Diyalog ses dosyalarını zaman damgasıyla birleştirir.
 * Arka plan müziği ekler.
 *
 * FFmpeg komutlarını oluşturur ve (varsa) çalıştırır.
 */
import { execSync, exec } from 'child_process';
import { writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

export class FFmpegAgent {
  constructor(config = {}) {
    this.fps = config.fps || 24;
    this.width = config.width || 1280;
    this.height = config.height || 720;
    this.outputDir = config.outputDir || './output';
    this.ffmpegAvailable = this.checkFFmpeg();
  }

  /**
   * FFmpeg'in kurulu olup olmadığını kontrol et
   */
  checkFFmpeg() {
    try {
      execSync('ffmpeg -version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Tam bir bölüm videosu üret (frame + ses → MP4)
   *
   * @param {object} params
   * @param {string} params.episodeId - Bölüm ID'si (ör: 'ep01')
   * @param {string} params.framesDir - Frame PNG'lerin dizini
   * @param {string} params.framePrefix - Frame dosya adı prefix'i (ör: 'scene00')
   * @param {string[]} params.framePaths - Tüm frame dosya yolları
   * @param {object} params.soundResult - SoundAgent.generateEpisodeAudio() sonucu
   * @param {string} params.outputFile - Çıktı dosya adı
   * @returns {VideoResult}
   */
  async produceVideo(params) {
    const {
      episodeId = 'ep01',
      framePaths = [],
      soundResult = null,
      outputFile = null,
    } = params;

    const framesDir = params.framesDir || join(this.outputDir, 'frames');
    const videoOutput = outputFile || join(this.outputDir, `${episodeId}.mp4`);

    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }

    console.log(`\n🎬 Video üretimi başlıyor: ${episodeId}`);

    const result = {
      episodeId,
      steps: [],
      commands: [],
      outputFile: videoOutput,
      success: false,
    };

    // Adım 1: Frame'lerden sessiz video oluştur
    const silentVideo = join(this.outputDir, `${episodeId}_silent.mp4`);
    const step1 = this.buildFramesToVideoCommand(framesDir, silentVideo, framePaths);
    result.commands.push({ step: 'frames_to_video', command: step1 });
    result.steps.push('frames_to_video');

    // Adım 2: Diyalog ses dosyalarını birleştir (timeline'a göre)
    let audioMixFile = null;
    if (soundResult?.dialogueFiles?.length > 0) {
      audioMixFile = join(this.outputDir, `${episodeId}_dialogue_mix.wav`);
      const step2 = this.buildDialogueMixCommand(soundResult, audioMixFile);
      result.commands.push({ step: 'mix_dialogues', command: step2 });
      result.steps.push('mix_dialogues');
    }

    // Adım 3: Video + ses birleştir
    if (audioMixFile) {
      const step3 = this.buildMergeCommand(silentVideo, audioMixFile, videoOutput);
      result.commands.push({ step: 'merge_audio_video', command: step3 });
      result.steps.push('merge_audio_video');
    } else {
      // Ses yoksa sessiz videoyu kopyala
      result.commands.push({
        step: 'copy_silent',
        command: `cp "${silentVideo}" "${videoOutput}"`,
      });
      result.steps.push('copy_silent');
    }

    // Adım 4: Temizlik (ara dosyaları sil)
    result.commands.push({
      step: 'cleanup',
      command: `rm -f "${silentVideo}" "${audioMixFile || ''}"`,
    });

    // Komut betiği oluştur
    const scriptPath = join(this.outputDir, `${episodeId}_build.sh`);
    this.writeShellScript(scriptPath, result.commands);
    result.scriptFile = scriptPath;

    // FFmpeg varsa çalıştır
    if (this.ffmpegAvailable) {
      console.log('  FFmpeg bulundu, video oluşturuluyor...');
      try {
        for (const cmd of result.commands) {
          if (!cmd.command) continue;
          console.log(`  [${cmd.step}] çalışıyor...`);
          execSync(cmd.command, { stdio: 'pipe', timeout: 300000 });
          console.log(`  ✓ ${cmd.step} tamamlandı`);
        }
        result.success = true;
        console.log(`\n  🎬 Video hazır: ${videoOutput}`);
      } catch (err) {
        console.log(`  ✗ FFmpeg hatası: ${err.message}`);
        result.error = err.message;
      }
    } else {
      console.log('\n  ⚠ FFmpeg kurulu değil. Komutlar kaydedildi:');
      console.log(`    ${scriptPath}`);
      console.log('  FFmpeg kurduktan sonra şu komutu çalıştırın:');
      console.log(`    bash ${scriptPath}\n`);
    }

    return result;
  }

  /**
   * Frame PNG'lerden sessiz MP4 video oluştur
   */
  buildFramesToVideoCommand(framesDir, outputFile, framePaths = []) {
    // Frame pattern'i tespit et
    let inputPattern;
    if (framePaths.length > 0) {
      // Concat demuxer kullan (farklı prefix'li frame'ler için)
      const concatFile = join(this.outputDir, 'frames_concat.txt');
      const lines = framePaths.map(fp => `file '${fp}'`);
      // Her frame'in süresi 1/fps saniye
      const duration = `duration ${(1 / this.fps).toFixed(6)}`;
      const concatContent = framePaths
        .map(fp => `file '${fp}'\n${duration}`)
        .join('\n');
      writeFileSync(concatFile, concatContent);

      return [
        'ffmpeg -y',
        `-f concat -safe 0 -i "${concatFile}"`,
        '-c:v libx264',
        '-pix_fmt yuv420p',
        `-r ${this.fps}`,
        `-s ${this.width}x${this.height}`,
        '-preset medium',
        '-crf 18',
        `"${outputFile}"`,
      ].join(' ');
    }

    // Basit pattern-based (tek prefix)
    return [
      'ffmpeg -y',
      `-framerate ${this.fps}`,
      `-i "${framesDir}/scene%02d_%05d.png"`,
      '-c:v libx264',
      '-pix_fmt yuv420p',
      `-s ${this.width}x${this.height}`,
      '-preset medium',
      '-crf 18',
      `"${outputFile}"`,
    ].join(' ');
  }

  /**
   * Diyalog ses dosyalarını timeline'a göre birleştir
   * FFmpeg complex filter ile her diyaloğu doğru zamanda yerleştirir
   */
  buildDialogueMixCommand(soundResult, outputFile) {
    const dialogues = soundResult.dialogueFiles || [];
    if (dialogues.length === 0) return null;

    // Toplam süreyi hesapla (tüm sahne sürelerinden)
    let totalDuration = 0;
    for (const plan of (soundResult.soundPlan || [])) {
      totalDuration += plan.duration || 0;
    }

    // Sahne başlangıç zamanlarını hesapla
    const sceneStartTimes = [];
    let cumulative = 0;
    for (const plan of (soundResult.soundPlan || [])) {
      sceneStartTimes.push(cumulative);
      cumulative += plan.duration || 0;
    }

    // Her diyalog için mutlak zaman hesapla
    const inputs = [];
    const filterParts = [];

    for (let i = 0; i < dialogues.length; i++) {
      const d = dialogues[i];
      const sceneStart = sceneStartTimes[d.sceneIndex] || 0;
      const absoluteTime = sceneStart + d.startTime;

      // Dosya mevcut mu kontrol
      if (!existsSync(d.file)) continue;

      inputs.push(`-i "${d.file}"`);
      filterParts.push(`[${i}]adelay=${Math.round(absoluteTime * 1000)}|${Math.round(absoluteTime * 1000)}[d${i}]`);
    }

    if (inputs.length === 0) return null;

    const mixInputs = filterParts.map((_, i) => `[d${i}]`).join('');
    const filterComplex = filterParts.join(';') + `;${mixInputs}amix=inputs=${inputs.length}:duration=longest[out]`;

    return [
      'ffmpeg -y',
      ...inputs,
      `-filter_complex "${filterComplex}"`,
      '-map "[out]"',
      '-ac 2 -ar 44100',
      `"${outputFile}"`,
    ].join(' ');
  }

  /**
   * Video ve ses dosyasını birleştir
   */
  buildMergeCommand(videoFile, audioFile, outputFile) {
    return [
      'ffmpeg -y',
      `-i "${videoFile}"`,
      `-i "${audioFile}"`,
      '-c:v copy',
      '-c:a aac -b:a 192k',
      '-shortest',
      `"${outputFile}"`,
    ].join(' ');
  }

  /**
   * Tüm komutları shell betiği olarak kaydet
   */
  writeShellScript(scriptPath, commands) {
    const lines = [
      '#!/bin/bash',
      '# Cartoon Maker - Video Build Script',
      `# Oluşturulma: ${new Date().toISOString()}`,
      '',
      'set -e',
      '',
    ];

    for (const cmd of commands) {
      lines.push(`echo "▶ ${cmd.step}..."`);
      if (cmd.command) {
        lines.push(cmd.command);
      }
      lines.push(`echo "✓ ${cmd.step} tamamlandı"`);
      lines.push('');
    }

    lines.push('echo "🎬 Video üretimi tamamlandı!"');

    writeFileSync(scriptPath, lines.join('\n'));
    try {
      execSync(`chmod +x "${scriptPath}"`, { stdio: 'ignore' });
    } catch {
      // chmod başarısız olsa da script dosyası yazıldı
    }
  }

  /**
   * Hızlı video üret (sadece frame'lerden, ses olmadan)
   */
  quickVideo(framesDir, outputFile) {
    const command = this.buildFramesToVideoCommand(framesDir, outputFile);

    if (this.ffmpegAvailable) {
      try {
        execSync(command, { stdio: 'pipe', timeout: 300000 });
        return { success: true, outputFile, command };
      } catch (err) {
        return { success: false, error: err.message, command };
      }
    }

    return { success: false, error: 'FFmpeg kurulu değil', command };
  }

  /**
   * Video bilgilerini al (süre, boyut, format)
   */
  getVideoInfo(videoFile) {
    if (!this.ffmpegAvailable) return null;

    try {
      const probe = execSync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${videoFile}"`,
        { encoding: 'utf-8', timeout: 30000 }
      );
      return JSON.parse(probe);
    } catch {
      return null;
    }
  }
}
