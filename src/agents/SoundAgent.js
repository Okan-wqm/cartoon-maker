/**
 * SoundAgent - Ses Ajan
 *
 * Her sahne için ses tasarımı yapar:
 *   - TTS (Text-to-Speech): Karakter diyalogları
 *   - Ses efektleri: Adım sesi, su sesi, müzik
 *   - Arka plan müziği: Sahne atmosferi
 *
 * SES POLİTİKASI: Çocuklara uygun, yumuşak, hoş bir kadın sesi.
 * Korkunç ses efektleri YASAK. Her şey sıcak ve güven verici.
 */
export class SoundAgent {
  constructor(config = {}) {
    this.language = config.language || 'tr-TR';

    // Ses profili: Çocuk dostu, sıcak kadın sesi
    this.voiceProfile = {
      name: config.voiceName || 'narrator',
      gender: 'female',
      pitch: config.pitch || 1.1,      // Hafif yüksek ton (sıcak)
      rate: config.rate || 0.85,        // Yavaş konuşma (anlaşılır)
      volume: config.volume || 0.8,     // Orta ses (ürkütmeyen)
      style: 'warm-friendly',           // Sıcak ve arkadaşça
      description: 'Çocuklara masal anlatan teyze gibi: sıcak, güven verici, neşeli',
    };

    // Ses efekt kütüphanesi (güvenli/çocuk dostu)
    this.soundLibrary = {
      // Hareket sesleri
      footstep_grass: { file: 'footstep_grass.wav', volume: 0.3, category: 'movement' },
      footstep_wood: { file: 'footstep_wood.wav', volume: 0.3, category: 'movement' },
      jump: { file: 'jump_boing.wav', volume: 0.4, category: 'movement' },
      splash_gentle: { file: 'splash_gentle.wav', volume: 0.4, category: 'nature' },

      // Doğa sesleri
      birds_singing: { file: 'birds.wav', volume: 0.2, category: 'nature', loop: true },
      gentle_wind: { file: 'wind_gentle.wav', volume: 0.15, category: 'nature', loop: true },
      water_stream: { file: 'water_stream.wav', volume: 0.2, category: 'nature', loop: true },
      crickets: { file: 'crickets.wav', volume: 0.15, category: 'nature', loop: true },

      // Etkileşim sesleri
      pop: { file: 'pop.wav', volume: 0.4, category: 'ui' },
      sparkle: { file: 'sparkle.wav', volume: 0.3, category: 'ui' },
      success_chime: { file: 'chime_success.wav', volume: 0.5, category: 'ui' },
      whoosh: { file: 'whoosh.wav', volume: 0.3, category: 'movement' },

      // Müzik
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
   * Sahne için ses planı oluştur
   * @param {object} sceneScript - Sahne senaryosu
   * @returns {SoundPlan}
   */
  createSoundPlan(sceneScript) {
    const plan = {
      sceneName: sceneScript.name,
      duration: sceneScript.duration,
      tracks: [],
    };

    // 1. Arka plan müziği seç
    plan.tracks.push(this.selectBackgroundMusic(sceneScript));

    // 2. Ortam sesleri
    plan.tracks.push(...this.selectAmbientSounds(sceneScript));

    // 3. Diyalog ses kaydı (TTS talimatları)
    plan.tracks.push(...this.generateDialogueTracks(sceneScript));

    // 4. Efekt sesleri (hareket, etkileşim)
    plan.tracks.push(...this.generateEffectTracks(sceneScript));

    return plan;
  }

  /**
   * Sahne için arka plan müziği seç
   */
  selectBackgroundMusic(sceneScript) {
    const setting = sceneScript.background?.type || 'park';
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
   * Diyalog ses kaydı talimatları üret
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
          voice: {
            ...this.voiceProfile,
            // Karakter bazlı ses ayarı yapılabilir
            pitch: this.getCharacterPitch(event.actorId),
          },
          ttsConfig: {
            provider: 'google-cloud-tts', // veya 'elevenlabs', 'azure'
            language: this.language,
            ssml: this.generateSSML(event.text, event.actorId),
          },
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
   * Karakter için ses pitch'i
   */
  getCharacterPitch(actorId) {
    // Her karakter için farklı ama hep hoş sesler
    const pitchMap = {
      // Varsayılan ses profilleri
    };
    return pitchMap[actorId] || this.voiceProfile.pitch;
  }

  /**
   * SSML (Speech Synthesis Markup Language) oluştur
   * Yumuşak, sıcak, çocuk dostu okuma
   */
  generateSSML(text, actorId) {
    return `<speak>
  <prosody rate="${this.voiceProfile.rate}" pitch="+${Math.round((this.voiceProfile.pitch - 1) * 100)}%">
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

  /**
   * Ses güvenlik kontrolü
   */
  isSoundSafe(soundName) {
    return !this.blockedSounds.some(blocked =>
      soundName.toLowerCase().includes(blocked)
    );
  }

  /**
   * TTS provider konfigürasyonu
   */
  getTTSConfig() {
    return {
      providers: {
        'google-cloud-tts': {
          voice: 'tr-TR-Wavenet-E', // Türkçe kadın sesi
          audioEncoding: 'LINEAR16',
          speakingRate: this.voiceProfile.rate,
          pitch: (this.voiceProfile.pitch - 1) * 20,
        },
        'elevenlabs': {
          voice_id: 'custom_warm_turkish_female',
          stability: 0.75,
          similarity_boost: 0.8,
          style: 0.5,
        },
        'azure': {
          voice: 'tr-TR-EmelNeural',
          style: 'cheerful',
          rate: `${Math.round(this.voiceProfile.rate * 100)}%`,
        },
      },
    };
  }
}
