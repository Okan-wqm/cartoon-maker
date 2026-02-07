/**
 * Demo: "Ökkeş Balık Avında" bölümünü üret
 *
 * Kullanım: node src/demo.js
 */
import { DirectorAgent } from './agents/DirectorAgent.js';
import { EpisodeTemplates } from './characters/okkes-universe.js';
import { writeFileSync } from 'fs';

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     🐱 CARTOON MAKER - Ökkeş Çizgi Film Motoru     ║');
  console.log('║     Puppet Animation + AI Agent Pipeline            ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  // Yönetmen ajanı başlat
  const director = new DirectorAgent({
    targetAge: '4-8',
    language: 'tr',
    fps: 24,
    width: 1280,
    height: 720,
    outputDir: './output/frames',
  });

  // ── TEK BÖLÜM DEMO ──────────────────────────
  const template = EpisodeTemplates['Ökkeş Balık Avında'];

  console.log(`\nBölüm: ${template.title}`);
  console.log(`Tema: ${template.theme}`);
  console.log(`Mekan: ${template.setting}`);
  console.log(`Karakterler: ${template.characters.map(c => c.name).join(', ')}`);

  const result = await director.produceEpisode(template);

  // Sonuç özetini kaydet
  const summary = {
    title: result.title,
    scenes: result.stages.scenes,
    characters: result.stages.characters,
    totalFrames: result.stages.render.totalFrames,
    soundTracks: result.stages.sound,
    timing: result.timing,
    ffmpegCommand: result.ffmpegCommand,
  };

  writeFileSync('./output/episode-summary.json', JSON.stringify(summary, null, 2));
  console.log('\nÖzet kaydedildi: ./output/episode-summary.json');

  // ── ÖNİZLEME ──────────────────────────────────
  console.log('\nÖnizleme frame\'leri oluşturuluyor...');

  for (let i = 0; i < 4; i++) {
    const previewBuffer = director.previewScene(template, i, 2);
    writeFileSync(`./output/preview_scene${i}.png`, previewBuffer);
    console.log(`  ✓ Sahne ${i + 1} önizleme: ./output/preview_scene${i}.png`);
  }

  console.log('\n✅ Demo tamamlandı!');
  console.log(`\nVideo oluşturmak için:\n  ${result.ffmpegCommand}`);
}

main().catch(console.error);
