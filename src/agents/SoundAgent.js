/**
 * SoundAgent - Ses Ajan (v2 - ElevenLabs + Karakter Bazlı Sesler)
 *
 * Her karakter için farklı ElevenLabs sesi kullanır.
 * Her diyalog satırı için ayrı ses dosyası üretir.
 *
 * SES POLİTİKASI: Çocuklara uygun, yumuşak sesler.
 * Korkunç ses efektleri YASAK. Her şey sıcak ve güven verici.
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export class SoundAgent {
  constructor(config = {}) {
    this.language = config.language || 'tr-TR';
    this.outputDir = config.outputDir || './output/audio';
    this.apiKey = config.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY || '';
    this.baseUrl = 'https://api.elevenlabs.io/v1';

    /**
     * Karakter bazlı ses profilleri
     * Her karakter için ElevenLabs voice_id + ses ayarları
     *
     * NOT: voice_id'ler ElevenLabs hesabınızdaki seslerle eşleştirilmeli.
     * Varsayılan olarak placeholder ID'ler kullanılıyor.
     * ElevenLabs'tan ses klonlama veya hazır Türkçe sesler atanabilir.
     */
    this.characterVoices = config.characterVoices || {
      'Ökkeş': {
        voice_id: config.voiceIds?.okkes || 'okkes_voice_placeholder',
        description: 'Sevimli yavru kedi - meraklı, neşeli',
        stability: 0.65,
        similarity_boost: 0.80,
        style: 0.45,
        use_speaker_boost: true,
        model_id: 'eleven_multilingual_v2',
      },
      'Zıpzıp': {
        voice_id: config.voiceIds?.zipzip || 'zipzip_voice_placeholder',
        description: 'Minik kuş - çok enerjik, cıvıl cıvıl',
        stability: 0.55,
        similarity_boost: 0.75,
        style: 0.60,
        use_speaker_boost: true,
        model_id: 'eleven_multilingual_v2',
      },
      'Ponçik': {
        voice_id: config.voiceIds?.poncik || 'poncik_voice_placeholder',
        description: 'Köpek - kalın, sıcak, yavaş',
        stability: 0.80,
        similarity_boost: 0.85,
        style: 0.30,
        use_speaker_boost: true,
        model_id: 'eleven_multilingual_v2',
      },
      'Elif': {
        voice_id: config.voiceIds?.elif || 'elif_voice_placeholder',
        description: 'Küçük kız - tatlı, net, öğretici',
        stability: 0.70,
        similarity_boost: 0.80,
        style: 0.40,
        use_speaker_boost: true,
        model_id: 'eleven_multilingual_v2',
      },
      'Boncuk': {
        voice_id: config.voiceIds?.boncuk || 'boncuk_voice_placeholder',
        description: 'Bilge balık - sakin, derin, gizemli',
        stability: 0.85,
        similarity_boost: 0.90,
        style: 0.25,
        use_speaker_boost: true,
        model_id: 'eleven_multilingual_v2',
      },
      'narrator': {
        voice_id: config.voiceIds?.narrator || 'narrator_voice_placeholder',
        description: 'Anlatıcı - sıcak kadın sesi, masal anlatan teyze',
        stability: 0.75,
        similarity_boost: 0.80,
        style: 0.50,
        use_speaker_boost: true,
        model_id: 'eleven_multilingual_v2',
      },
    };

    // Ses efekt kütüphanesi (güvenli/çocuk dostu)
    this.soundLibrary = {
      footstep_grass: { file: 'footstep_grass.wav', volume: 0.3, category: 'movement' },
      footstep_wood: { file: 'footstep_wood.wav', volume: 0.3, category: 'movement' },
      jump: { file: 'jump_boing.wav', volume: 0.4, category: 'movement' },
      splash_gentle: { file: 'splash_gentle.wav', volume: 0.4, category: 'nature' },
      birds_singing: { file: 'birds.wav', volume: 0.2, category: 'nature', loop: true },
      gentle_wind: { file: 'wind_gentle.wav', volume: 0.15, category: 'nature', loop: true },
      water_stream: { file: 'water_stream.wav', volume: 0.2, category: 'nature', loop: true },
      crickets: { file: 'crickets.wav', volume: 0.15, category: 'nature', loop: true },
      pop: { file: 'pop.wav', volume: 0.4, category: 'ui' },
      sparkle: { file: 'sparkle.wav', volume: 0.3, category: 'ui' },
      success_chime: { file: 'chime_success.wav', volume: 0.5, category: 'ui' },
      whoosh: { file: 'whoosh.wav', volume: 0.3, category: 'movement' },
      happy_ukulele: { file: 'bgm_happy_ukulele.wav', volume: 0.2, category: 'music', loop: true },
      calm_piano: { file: 'bgm_calm_piano.wav', volume: 0.15, category: 'music', loop: true },
      adventure_light: { file: 'bgm_adventure.wav', volume: 0.2, category: 'music', loop: true },
      learning_fun: { file: 'bgm_learning.wav', volume: 0.2, category: 'music', loop: true },
    };

    // YASAK sesler (çocukları ürkütebilecek)
    this.blockedSounds = [
      'explosion', 'scream', 'thunder_loud', 'monster',
      'horror', 'siren', 'gunshot', 'crash_violent',
    ];
  }

  /**
   * Tüm bölüm için ses dosyalarını üret
   * @param {object} episode - Bölüm senaryosu (scenes dizisi)
   * @param {string} episodeId - Bölüm kimliği (dosya adı prefix)
   * @returns {EpisodeSoundResult}
   */
  async generateEpisodeAudio(episode, episodeId = 'ep01') {
    const audioDir = join(this.outputDir, episodeId);
    if (!existsSync(audioDir)) {
      mkdirSync(audioDir, { recursive: true });
    }

    console.log(`\n🔊 Ses üretimi başlıyor: "${episode.title || episodeId}"`);

    const result = {
      episodeId,
      dialogueFiles: [],
      soundPlan: [],
      totalDialogues: 0,
      errors: [],
    };

    let dialogueIndex = 0;

    for (let sceneIdx = 0; sceneIdx < episode.scenes.length; sceneIdx++) {
      const scene = episode.scenes[sceneIdx];
      console.log(`  Sahne ${sceneIdx + 1}: "${scene.name}"`);

      // Ses planı oluştur
      const plan = this.createSoundPlan(scene);
      result.soundPlan.push(plan);

      // Diyalog track'lerini bul ve ses üret
      const dialogueTracks = plan.tracks.filter(t => t.type === 'dialogue');

      for (const track of dialogueTracks) {
        dialogueIndex++;
        const filename = `${episodeId}_s${String(sceneIdx).padStart(2, '0')}_d${String(dialogueIndex).padStart(3, '0')}_${this.sanitizeFilename(track.actorId)}.mp3`;
        const filepath = join(audioDir, filename);

        try {
          const audioData = await this.synthesizeSpeech(track.actorId, track.text);

          if (audioData) {
            writeFileSync(filepath, audioData);
            console.log(`    ✓ [${track.actorId}] "${track.text.substring(0, 40)}..." → ${filename}`);
          } else {
            // API key yoksa veya hata varsa, manifest dosyası oluştur
            this.writeDialogueManifest(filepath, track);
            console.log(`    ⚠ [${track.actorId}] Manifest oluşturuldu (API key gerekli) → ${filename}.json`);
          }

          result.dialogueFiles.push({
            file: filepath,
            actorId: track.actorId,
            text: track.text,
            startTime: track.startTime,
            duration: track.duration,
            sceneIndex: sceneIdx,
            voiceProfile: this.getVoiceProfile(track.actorId),
          });
        } catch (err) {
          result.errors.push({ file: filename, error: err.message });
          console.log(`    ✗ [${track.actorId}] HATA: ${err.message}`);
        }
      }
    }

    result.totalDialogues = dialogueIndex;

    // Ses haritası dosyası yaz (FFmpeg için)
    const audioMapPath = join(audioDir, `${episodeId}_audiomap.json`);
    writeFileSync(audioMapPath, JSON.stringify({
      episodeId,
      dialogues: result.dialogueFiles,
      soundPlans: result.soundPlan,
      generatedAt: new Date().toISOString(),
    }, null, 2));

    console.log(`\n  🔊 Ses üretimi tamamlandı: ${result.totalDialogues} diyalog`);
    if (result.errors.length > 0) {
      console.log(`  ⚠ ${result.errors.length} hata oluştu`);
    }

    return result;
  }

  /**
   * ElevenLabs API ile konuşma sentezle
   * @param {string} actorId - Karakter adı
   * @param {string} text - Konuşma metni
   * @returns {Buffer|null} MP3 audio data
   */
  async synthesizeSpeech(actorId, text) {
    if (!this.apiKey) {
      return null; // API key yoksa null döndür → manifest oluşturulur
    }

    const voice = this.getVoiceProfile(actorId);
    const url = `${this.baseUrl}/text-to-speech/${voice.voice_id}`;

    const body = {
      text: text,
      model_id: voice.model_id,
      voice_settings: {
        stability: voice.stability,
        similarity_boost: voice.similarity_boost,
        style: voice.style,
        use_speaker_boost: voice.use_speaker_boost,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`ElevenLabs API hata ${response.status}: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Karakter için ses profili getir
   */
  getVoiceProfile(actorId) {
    return this.characterVoices[actorId] || this.characterVoices['narrator'];
  }

  /**
   * API key olmadan manifest dosyası yaz (sonradan batch üretim için)
   */
  writeDialogueManifest(filepath, track) {
    const manifest = {
      actorId: track.actorId,
      text: track.text,
      startTime: track.startTime,
      duration: track.duration,
      voice: this.getVoiceProfile(track.actorId),
      ssml: this.generateSSML(track.text, track.actorId),
      generatedAt: new Date().toISOString(),
      status: 'pending_synthesis',
    };
    writeFileSync(filepath + '.json', JSON.stringify(manifest, null, 2));
  }

  /**
   * Sahne için ses planı oluştur
   */
  createSoundPlan(sceneScript) {
    const plan = {
      sceneName: sceneScript.name,
      duration: sceneScript.duration,
      tracks: [],
    };

    plan.tracks.push(this.selectBackgroundMusic(sceneScript));
    plan.tracks.push(...this.selectAmbientSounds(sceneScript));
    plan.tracks.push(...this.generateDialogueTracks(sceneScript));
    plan.tracks.push(...this.generateEffectTracks(sceneScript));

    return plan;
  }

  /**
   * Sahne için arka plan müziği seç
   */
  selectBackgroundMusic(sceneScript) {
    const mood = sceneScript.name?.includes('Eğitici') ? 'learning' :
                 sceneScript.name?.includes('Kapanış') ? 'calm' : 'happy';

    const musicMap = {
      learning: 'learning_fun',
      calm: 'calm_piano',
      happy: 'happy_ukulele',
      adventure: 'adventure_light',
    };

    const musicKey = musicMap[mood] || 'happy_ukulele';
    const music = this.soundLibrary[musicKey];

    return {
      type: 'music',
      sound: musicKey,
      startTime: 0,
      duration: sceneScript.duration,
      volume: music.volume,
      fadeIn: 2,
      fadeOut: 2,
      loop: true,
    };
  }

  /**
   * Ortam sesleri seç
   */
  selectAmbientSounds(sceneScript) {
    const setting = sceneScript.background?.type || 'generic';
    const ambientMap = {
      lake: ['water_stream', 'birds_singing'],
      park: ['birds_singing', 'gentle_wind'],
      field: ['gentle_wind'],
      forest: ['birds_singing', 'gentle_wind', 'crickets'],
      beach: ['water_stream', 'gentle_wind'],
      school: [],
      home: [],
    };

    const sounds = ambientMap[setting] || ['birds_singing'];
    return sounds.map(soundKey => ({
      type: 'ambient',
      sound: soundKey,
      startTime: 0,
      duration: sceneScript.duration,
      volume: this.soundLibrary[soundKey]?.volume || 0.15,
      loop: true,
      fadeIn: 1,
      fadeOut: 1,
    }));
  }

  /**
   * Diyalog ses track'leri üret
   */
  generateDialogueTracks(sceneScript) {
    const tracks = [];
    if (!sceneScript.events) return tracks;

    for (const event of sceneScript.events) {
      if (event.type === 'talk' && event.text) {
        tracks.push({
          type: 'dialogue',
          actorId: event.actorId,
          text: event.text,
          startTime: event.time,
          duration: event.duration || 3,
          voice: this.getVoiceProfile(event.actorId),
        });
      }
    }

    return tracks;
  }

  /**
   * Efekt sesleri üret
   */
  generateEffectTracks(sceneScript) {
    const tracks = [];
    if (!sceneScript.events) return tracks;

    for (const event of sceneScript.events) {
      switch (event.type) {
        case 'move':
          tracks.push({
            type: 'effect',
            sound: 'footstep_grass',
            startTime: event.time,
            duration: event.duration || 1,
            volume: 0.3,
            repeat: Math.ceil((event.duration || 1) * 3),
          });
          break;
        case 'squash':
          tracks.push({
            type: 'effect',
            sound: 'pop',
            startTime: event.time,
            volume: 0.3,
          });
          break;
        case 'animate':
          if (event.preset === 'jump') {
            tracks.push({
              type: 'effect',
              sound: 'jump',
              startTime: event.time,
              volume: 0.4,
            });
          }
          break;
        case 'particles':
          tracks.push({
            type: 'effect',
            sound: 'sparkle',
            startTime: event.time,
            volume: 0.3,
          });
          break;
      }
    }

    return tracks;
  }

  /**
   * SSML (Speech Synthesis Markup Language) oluştur
   */
  generateSSML(text, actorId) {
    const voice = this.getVoiceProfile(actorId);
    const rate = actorId === 'narrator' ? '0.85' : '0.90';
    return `<speak>
  <prosody rate="${rate}">
    <emphasis level="moderate">${this.escapeXml(text)}</emphasis>
  </prosody>
</speak>`;
  }

  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  sanitizeFilename(name) {
    return name
      .replace(/[ıİ]/g, 'i')
      .replace(/[öÖ]/g, 'o')
      .replace(/[üÜ]/g, 'u')
      .replace(/[çÇ]/g, 'c')
      .replace(/[şŞ]/g, 's')
      .replace(/[ğĞ]/g, 'g')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
  }

  isSoundSafe(soundName) {
    return !this.blockedSounds.some(blocked =>
      soundName.toLowerCase().includes(blocked)
    );
  }

  /**
   * ElevenLabs hesabındaki mevcut sesleri listele
   */
  async listAvailableVoices() {
    if (!this.apiKey) {
      console.log('⚠ ElevenLabs API key gerekli. ELEVENLABS_API_KEY env var ayarlayın.');
      return [];
    }

    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: { 'xi-api-key': this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`Sesler alınamadı: ${response.status}`);
    }

    const data = await response.json();
    return data.voices.map(v => ({
      voice_id: v.voice_id,
      name: v.name,
      category: v.category,
      labels: v.labels,
    }));
  }

  /**
   * Karakter-ses eşleştirme tablosu yazdır (setup yardımcısı)
   */
  printVoiceSetup() {
    console.log('\n🎤 Karakter Ses Eşleştirme Tablosu:');
    console.log('─'.repeat(60));
    for (const [name, profile] of Object.entries(this.characterVoices)) {
      const status = profile.voice_id.includes('placeholder') ? '⚠ AYARLANMADI' : '✓ Hazır';
      console.log(`  ${name.padEnd(12)} → ${profile.voice_id.padEnd(30)} ${status}`);
      console.log(`  ${''.padEnd(12)}   ${profile.description}`);
    }
    console.log('─'.repeat(60));
    console.log('  voice_id ayarlamak için: config.voiceIds.okkes = "gerçek_id"');
    console.log('  veya ElevenLabs panelinden ses klonlayın.\n');
  }
}
