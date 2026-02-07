#!/usr/bin/env node
/**
 * produce.js - Tek komutla YouTube-ready cizgi film uret (v2)
 *
 * Kullanim:
 *   node src/produce.js                          # Varsayilan: Okkes Balik Avinda
 *   node src/produce.js "Ökkeş Maçta"            # Belirli bolum
 *   node src/produce.js --all                     # Tum bolumleri uret
 *   node src/produce.js --sprites                 # AI sprite uretimi ile
 *
 * Ortam Degiskenleri:
 *   ELEVENLABS_API_KEY    → ElevenLabs TTS (karakter sesleri)
 *   ANTHROPIC_API_KEY     → Claude API (dinamik senaryo)
 *   STABILITY_API_KEY     → Stable Diffusion (AI sprite)
 *
 * Cikti:
 *   output/
 *     frames/          - PNG frame'ler
 *     audio/           - Karakter ses dosyalari (ElevenLabs)
 *     sprites/         - AI uretilmis spritelar
 *     preview_*.png    - Sahne onizlemeleri
 *     metadata.json    - YouTube baslik, aciklama, etiketler
 *     thumbnail.png    - YouTube thumbnail (1280x720)
 *     *.mp4            - Final video (FFmpeg varsa)
 *     *_build.sh       - Video build scripti (FFmpeg yoksa)
 */
import { DirectorAgent } from './agents/DirectorAgent.js';
import { EpisodeTemplates, getAllCharacters } from './characters/okkes-universe.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { createCanvas } from '@napi-rs/canvas';

// ── YOUTUBE METADATA URETICI ─────────────────────────

function generateYouTubeMetadata(episode, template) {
  const charNames = template.characters.map(c => c.name).join(', ');
  const themeDescriptions = {
    'sayılar': 'sayı saymayı',
    'renkler': 'renkleri tanımayı',
    'paylaşma': 'paylaşmanın güzelliğini',
    'hayvanlar': 'hayvanları tanımayı',
    'şekiller': 'geometrik şekilleri',
  };
  const themeDesc = themeDescriptions[template.theme] || 'eğlenceli bilgiler';

  const title = `${template.title} | Ökkeş ile Öğreniyorum | Eğitici Çizgi Film`;

  const description = `🐱 ${template.title}

${template.description}

Bu bölümde ${charNames} ile birlikte ${themeDesc} öğreniyoruz!

👨‍👩‍👧‍👦 Ebeveynler İçin:
Bu bölüm ${episode.targetAge || '4-8'} yaş grubu çocuklar için tasarlanmıştır.
Eğitim teması: ${template.theme.charAt(0).toUpperCase() + template.theme.slice(1)}
Tüm içerik çocuk dostu ve pedagojik olarak uygun hazırlanmıştır.
Korkunç ses efekti veya görüntü içermez.

🎓 Bu Bölümde Ne Öğreniyoruz?
${getBulletPoints(template.theme)}

🐱 Karakterler:
${template.characters.map(c => `• ${c.name} - ${getCharDesc(c)}`).join('\n')}

📺 Ökkeş ile Öğreniyorum serisi, çocukların eğlenerek öğrenmesini sağlayan
Türkçe eğitici çizgi film serisidir.

#ÖkkeşileÖğreniyorum #EğiticiÇizgiFilm #Çocuklarİçin #Türkçe #Eğitim`;

  const tags = [
    'çocuk çizgi film',
    'eğitici çizgi film',
    'türkçe çizgi film',
    'okul öncesi',
    'ökkeş',
    template.theme,
    'çocuklar için eğitim',
    '4-8 yaş',
    'animasyon',
    'puppet animasyon',
    ...template.characters.map(c => c.name.toLowerCase()),
    'öğreniyorum',
    'çocuk eğitimi',
    'kreş',
    'anaokulu',
  ];

  return {
    title,
    description,
    tags,
    category: 'Education',
    language: 'tr',
    privacyStatus: 'public',
    madeForKids: true,
    thumbnail: 'thumbnail.png',
  };
}

function getBulletPoints(theme) {
  const points = {
    'sayılar': '• 1\'den 5\'e kadar sayma\n• Sayıları tanıma\n• Sayı sıralaması',
    'renkler': '• Temel renkleri tanıma (kırmızı, mavi, yeşil, sarı)\n• Renkleri doğada bulma\n• Renk eşleştirme',
    'paylaşma': '• Paylaşmanın önemi\n• Arkadaşlık ve yardımlaşma\n• Eşit bölüşme kavramı',
    'hayvanlar': '• Farklı hayvan türlerini tanıma\n• Hayvan sesleri\n• Doğada yaşam',
    'şekiller': '• Daire, kare, üçgen tanıma\n• Şekilleri günlük hayatta bulma\n• Geometri temelleri',
  };
  return points[theme] || '• Eğlenceli bilgiler\n• Sosyal beceriler\n• Doğayı keşfetme';
}

function getCharDesc(c) {
  const descs = {
    'cat': 'Meraklı ve cesur turuncu kedi',
    'bird': 'Neşeli ve enerjik sarı kuş',
    'dog': 'Sadık ve yardımsever köpek',
    'human_child': 'Akıllı ve şefkatli küçük kız',
    'fish': 'Bilge ve sakin mavi balık',
  };
  return descs[c.type] || c.personality || 'Sevimli karakter';
}

// ── THUMBNAIL URETICI ────────────────────────────────

function generateThumbnail(director, template, outputPath) {
  const canvas = createCanvas(1280, 720);
  const ctx = canvas.getContext('2d');

  // Parlak gradient arka plan
  const grad = ctx.createLinearGradient(0, 0, 1280, 720);
  grad.addColorStop(0, '#FFD700');
  grad.addColorStop(0.5, '#FF8C42');
  grad.addColorStop(1, '#FF6B81');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1280, 720);

  // Beyaz cerceve
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, 1240, 680);

  // Baslik
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 64px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillText(template.title, 640, 120);

  // Alt baslik
  ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#FFF';
  ctx.fillText('Ökkeş ile Öğreniyorum', 640, 170);

  // Karakterleri ciz (onizleme frameden al)
  const previewBuffer = director.previewScene(template, 0, 3);

  // Tema etiketi
  const themeLabel = template.theme.charAt(0).toUpperCase() + template.theme.slice(1);
  ctx.fillStyle = '#FF0000';
  ctx.beginPath();
  ctx.roundRect(480, 640, 320, 50, 25);
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`🎓 ${themeLabel}`, 640, 673);

  // Yas grubu
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(1060, 30, 180, 40, 20);
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
  ctx.fillText('4-8 Yaş', 1150, 57);

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(outputPath, buffer);
  return outputPath;
}

// ── ANA URETIM ───────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const produceAll = args.includes('--all');
  const generateSprites = args.includes('--sprites');
  const episodeName = args.find(a => !a.startsWith('--')) || 'Ökkeş Balık Avında';

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  🐱 CARTOON MAKER v2 - AI-Powered Çizgi Film Üretici   ║');
  console.log('╠══════════════════════════════════════════════════════════╣');

  // API durumlarını göster
  const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;
  const hasStability = !!process.env.STABILITY_API_KEY;

  console.log(`║  ElevenLabs TTS:    ${hasElevenLabs ? '✓ Aktif' : '⚠ API key yok (manifest mode)'}  `);
  console.log(`║  Claude Senaryo:    ${hasClaude ? '✓ Aktif' : '⚠ API key yok (template mode)'}  `);
  console.log(`║  Stable Diffusion:  ${hasStability ? '✓ Aktif' : '⚠ API key yok (programatik)'}  `);
  console.log('╚══════════════════════════════════════════════════════════╝');

  const director = new DirectorAgent({
    targetAge: '4-8',
    language: 'tr',
    fps: 24,
    width: 1280,
    height: 720,
    outputDir: './output',
    generateSprites: generateSprites,
    // API key'ler env var'lardan otomatik alınır
  });

  if (!existsSync('./output')) mkdirSync('./output', { recursive: true });

  const templates = produceAll
    ? Object.values(EpisodeTemplates)
    : [EpisodeTemplates[episodeName] || Object.values(EpisodeTemplates)[0]];

  for (const template of templates) {
    console.log(`\n${'═'.repeat(60)}`);

    // 1. Bolumu uret (yeni async pipeline)
    const result = await director.produceEpisode(template);

    // 2. YouTube metadata
    console.log('\n📋 YouTube metadata oluşturuluyor...');
    const metadata = generateYouTubeMetadata(result.stages.script, template);
    writeFileSync('./output/metadata.json', JSON.stringify(metadata, null, 2));
    console.log(`   ✓ Başlık: ${metadata.title}`);
    console.log(`   ✓ ${metadata.tags.length} etiket`);
    console.log(`   ✓ Çocuklara uygun: Evet`);

    // 3. Thumbnail
    console.log('\n🖼️  Thumbnail oluşturuluyor...');
    generateThumbnail(director, template, './output/thumbnail.png');
    console.log('   ✓ thumbnail.png (1280x720)');

    // 4. Onizlemeler
    console.log('\n📸 Sahne önizlemeleri...');
    const sceneCount = result.stages.scenes.length;
    for (let i = 0; i < sceneCount; i++) {
      const buf = director.previewScene(template, i, 3);
      writeFileSync(`./output/preview_scene${i}.png`, buf);
    }
    console.log(`   ✓ ${sceneCount} sahne önizlemesi`);

    // 5. Ozet
    console.log(`\n${'─'.repeat(60)}`);
    console.log('📋 YOUTUBE YÜKLEME BİLGİLERİ:');
    console.log(`─`.repeat(60));
    console.log(`\nBaşlık:\n  ${metadata.title}`);
    console.log(`\nAçıklama (ilk 3 satır):`);
    metadata.description.split('\n').slice(0, 3).forEach(l => console.log(`  ${l}`));
    console.log(`\nEtiketler:\n  ${metadata.tags.slice(0, 8).join(', ')}...`);
    console.log(`\nKategori: ${metadata.category}`);
    console.log(`Çocuklara uygun: ${metadata.madeForKids ? 'Evet' : 'Hayır'}`);

    // Video durumu
    if (result.videoResult?.success) {
      console.log(`\n🎬 Video hazır: ${result.videoResult.outputFile}`);
    } else if (result.videoResult?.scriptFile) {
      console.log(`\nVideo oluşturmak için:`);
      console.log(`  bash ${result.videoResult.scriptFile}`);
    }

    // Ses durumu
    if (result.stages.sound?.totalDialogues > 0) {
      console.log(`\n🔊 Ses: ${result.stages.sound.totalDialogues} diyalog`);
      if (!hasElevenLabs) {
        console.log('  ⚠ ElevenLabs API key ayarlayarak gerçek ses üretebilirsiniz:');
        console.log('    export ELEVENLABS_API_KEY="your-key-here"');
      }
    }

    console.log(`\nDosyalar:`);
    console.log(`  output/metadata.json    - YouTube başlık ve açıklama`);
    console.log(`  output/thumbnail.png    - YouTube thumbnail`);
    console.log(`  output/frames/          - ${result.framePaths.length} PNG frame`);
    if (result.stages.sound?.totalDialogues > 0) {
      console.log(`  output/audio/           - Ses dosyaları ve manifest`);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('✅ Üretim tamamlandı!');

  if (!hasElevenLabs || !hasClaude || !hasStability) {
    console.log('\n💡 İPUCU: Tam AI deneyimi için ortam değişkenlerini ayarlayın:');
    if (!hasClaude) console.log('  export ANTHROPIC_API_KEY="..."   → Yaratıcı AI senaryolar');
    if (!hasElevenLabs) console.log('  export ELEVENLABS_API_KEY="..."  → Karakter seslendirme');
    if (!hasStability) console.log('  export STABILITY_API_KEY="..."   → AI karakter sprite\'ları');
  }
}

main().catch(console.error);
