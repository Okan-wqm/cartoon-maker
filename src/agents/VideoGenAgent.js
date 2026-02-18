/**
 * VideoGenAgent - AI Video Uretim Entegrasyonu
 *
 * Hibrit yaklasim: AI video + puppet animasyon
 *
 * 3 mod:
 *   1. backgrounds  → Sadece arka plan sahneleri AI ile uret
 *   2. full_scene   → Tum sahneyi AI ile uret (tutarlilik riski)
 *   3. reference    → Karakter referans gorselleri uret (SpriteGenerator icin)
 *
 * Desteklenen providerlar:
 *   - Google Veo 2 (en yuksek kalite)
 *   - Runway Gen-3 Alpha Turbo
 *   - Kling 1.6
 *   - Pika 2.0
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export class VideoGenAgent {
  constructor(config = {}) {
    this.provider = config.provider || 'runway'; // 'veo' | 'runway' | 'kling' | 'pika'
    this.outputDir = config.outputDir || './output/ai_video';
    this.mode = config.mode || 'backgrounds'; // 'backgrounds' | 'full_scene' | 'reference'

    // API anahtarlari
    this.apiKeys = {
      runway: config.runwayApiKey || process.env.RUNWAY_API_KEY || '',
      kling: config.klingApiKey || process.env.KLING_API_KEY || '',
      pika: config.pikaApiKey || process.env.PIKA_API_KEY || '',
      veo: config.veoApiKey || process.env.VEO_API_KEY || '',
    };

    // Runway Gen-3 ayarlari
    this.runwayConfig = {
      baseUrl: 'https://api.dev.runwayml.com/v1',
      model: 'gen3a_turbo',
      duration: 5, // saniye
      ratio: '1280:720',
    };

    // Karakter tutarliligi icin referans prompt sablonu
    this.characterPromptTemplate = config.characterPromptTemplate || {
      style: 'cute cartoon animation style, children show, bright colors, simple shapes',
      consistency: 'consistent character design, same character throughout',
      safety: 'child-friendly, no violence, no scary elements, educational',
    };
  }

  /**
   * Sahne icin AI arka plan videosu uret
   * Karakterler hala puppet animasyon ile eklenir
   *
   * @param {object} sceneScript - Sahne senaryosu
   * @returns {BackgroundVideo}
   */
  async generateBackground(sceneScript) {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }

    const setting = sceneScript.background?.type || 'park';
    const prompt = this.buildBackgroundPrompt(setting, sceneScript);

    console.log(`  🎬 AI arka plan: "${setting}" üretiliyor...`);

    const videoData = await this.generateVideo(prompt);

    if (videoData) {
      const filepath = join(this.outputDir, `bg_${setting}_${Date.now()}.mp4`);
      writeFileSync(filepath, videoData);
      console.log(`    ✓ ${filepath}`);
      return { file: filepath, setting, duration: this.runwayConfig.duration };
    }

    // API yoksa prompt manifest yaz
    const manifestPath = join(this.outputDir, `bg_${setting}_prompt.json`);
    writeFileSync(manifestPath, JSON.stringify({
      setting,
      prompt,
      provider: this.provider,
      mode: 'background',
      duration: this.runwayConfig.duration,
      status: 'pending',
      generatedAt: new Date().toISOString(),
    }, null, 2));

    console.log(`    ⚠ Manifest oluşturuldu: ${manifestPath}`);
    return { manifest: manifestPath, setting };
  }

  /**
   * Tam sahne videosu uret (karakter dahil)
   * UYARI: Karakter tutarliligi garanti edilemez!
   */
  async generateFullScene(sceneScript, characters) {
    const charNames = characters.map(c => c.name).join(', ');
    const charDesc = characters.map(c => this.buildCharacterDescription(c)).join('. ');

    const prompt = [
      this.characterPromptTemplate.style,
      `Characters: ${charDesc}`,
      `Scene: ${sceneScript.description || sceneScript.name}`,
      this.characterPromptTemplate.consistency,
      this.characterPromptTemplate.safety,
    ].join('. ');

    console.log(`  🎬 AI tam sahne: "${sceneScript.name}" üretiliyor...`);
    console.log(`    ⚠ DİKKAT: Karakter tutarlılığı garanti edilemez!`);

    const videoData = await this.generateVideo(prompt);

    if (videoData) {
      const filepath = join(this.outputDir, `scene_${this.sanitize(sceneScript.name)}.mp4`);
      writeFileSync(filepath, videoData);
      return { file: filepath, prompt };
    }

    const manifestPath = join(this.outputDir, `scene_${this.sanitize(sceneScript.name)}_prompt.json`);
    writeFileSync(manifestPath, JSON.stringify({
      scene: sceneScript.name,
      prompt,
      characters: characters.map(c => c.name),
      provider: this.provider,
      mode: 'full_scene',
      warning: 'Karakter tutarlılığı garanti edilemez',
      status: 'pending',
      generatedAt: new Date().toISOString(),
    }, null, 2));

    return { manifest: manifestPath };
  }

  /**
   * Arka plan prompt olustur (karakter yok, sadece mekan)
   */
  buildBackgroundPrompt(setting, sceneScript) {
    const settingPrompts = {
      lake: 'beautiful calm lake with green grass shore, gentle ripples on water, blue sky with fluffy clouds, sunny day, trees in background',
      park: 'colorful children park with trees, flowers, playground in background, sunny cheerful day, blue sky',
      field: 'wide green grass field, wildflowers, blue sky, gentle breeze animation, sunshine',
      forest: 'friendly forest scene, tall green trees, sunlight filtering through leaves, flowers on ground, butterflies',
      beach: 'tropical beach scene, gentle waves, golden sand, palm trees, seashells, bright sunny day',
      school: 'colorful kindergarten classroom, alphabet on wall, small desks, bright colors, cheerful atmosphere',
      home: 'cozy living room, warm colors, sofa, bookshelf, window with sunshine, toy basket',
    };

    const settingDesc = settingPrompts[setting] || settingPrompts.park;

    return [
      'animated background scene for children cartoon',
      settingDesc,
      'no characters, empty scene, panoramic slow camera pan',
      this.characterPromptTemplate.style,
      'looping animation, seamless, 4K quality',
      this.characterPromptTemplate.safety,
    ].join(', ');
  }

  /**
   * Karakter aciklama metni olustur (tutarlilik icin)
   */
  buildCharacterDescription(charSpec) {
    const typeDesc = {
      cat: 'cute cartoon cat',
      dog: 'friendly cartoon dog',
      bird: 'small cheerful cartoon bird',
      fish: 'wise cartoon fish',
      human_child: 'cute cartoon little girl',
    };

    const desc = typeDesc[charSpec.type] || 'cute cartoon character';
    const color = charSpec.bodyColor ? `${this.colorName(charSpec.bodyColor)} colored` : '';

    return `${charSpec.name} is a ${color} ${desc}, ${charSpec.personality || 'friendly'}`;
  }

  /**
   * Video uret (provider routing)
   */
  async generateVideo(prompt) {
    const apiKey = this.apiKeys[this.provider];
    if (!apiKey) return null;

    switch (this.provider) {
      case 'runway': return this.runwayGenerate(prompt, apiKey);
      case 'kling': return this.klingGenerate(prompt, apiKey);
      case 'pika': return this.pikaGenerate(prompt, apiKey);
      case 'veo': return this.veoGenerate(prompt, apiKey);
      default: return null;
    }
  }

  /**
   * Runway Gen-3 Alpha Turbo
   */
  async runwayGenerate(prompt, apiKey) {
    // Adim 1: Task olustur
    const taskResponse = await fetch(`${this.runwayConfig.baseUrl}/image_to_video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify({
        model: this.runwayConfig.model,
        promptText: prompt,
        duration: this.runwayConfig.duration,
        ratio: this.runwayConfig.ratio,
        watermark: false,
      }),
    });

    if (!taskResponse.ok) {
      const err = await taskResponse.text().catch(() => '');
      throw new Error(`Runway API hata ${taskResponse.status}: ${err}`);
    }

    const task = await taskResponse.json();
    const taskId = task.id;
    console.log(`    Runway task: ${taskId}, bekleniyor...`);

    // Adim 2: Sonucu bekle (polling)
    for (let i = 0; i < 60; i++) {
      await this.sleep(5000);
      const statusResponse = await fetch(`${this.runwayConfig.baseUrl}/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'X-Runway-Version': '2024-11-06' },
      });
      const status = await statusResponse.json();

      if (status.status === 'SUCCEEDED' && status.output?.[0]) {
        const videoUrl = status.output[0];
        const videoResponse = await fetch(videoUrl);
        const buffer = await videoResponse.arrayBuffer();
        return Buffer.from(buffer);
      }
      if (status.status === 'FAILED') {
        throw new Error(`Runway task basarisiz: ${status.failure || 'bilinmeyen hata'}`);
      }
    }
    throw new Error('Runway zaman asimi (5dk)');
  }

  /**
   * Kling API (basitleştirilmiş)
   */
  async klingGenerate(prompt, apiKey) {
    const response = await fetch('https://api.klingai.com/v1/videos/text2video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: 'scary, dark, violent, realistic, adult',
        cfg_scale: 0.5,
        mode: 'std',
        duration: '5',
        aspect_ratio: '16:9',
      }),
    });

    if (!response.ok) throw new Error(`Kling API hata ${response.status}`);
    const data = await response.json();
    console.log(`    Kling task: ${data.data?.task_id}, bekleniyor...`);
    // Polling icin task_id kullanilir
    return null; // Async - sonuc ayri alinir
  }

  /**
   * Pika API (basitleştirilmiş)
   */
  async pikaGenerate(prompt, apiKey) {
    const response = await fetch('https://api.pika.art/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: 'scary, dark, violent',
        style: 'animate',
        aspect_ratio: '16:9',
        fps: 24,
      }),
    });

    if (!response.ok) throw new Error(`Pika API hata ${response.status}`);
    const data = await response.json();
    console.log(`    Pika generation started: ${data.id}`);
    return null;
  }

  /**
   * Google Veo 2 (Vertex AI uzerinden)
   */
  async veoGenerate(prompt, apiKey) {
    // Veo 2 Vertex AI endpoint
    const projectId = process.env.GCP_PROJECT_ID || 'my-project';
    const location = 'us-central1';
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/veo-002:predictLongRunning`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        instances: [{
          prompt,
          video_length: 5,
          resolution: '720p',
          aspect_ratio: '16:9',
          person_generation: 'dont_allow',
          safety_filter_level: 'block_most',
        }],
      }),
    });

    if (!response.ok) throw new Error(`Veo API hata ${response.status}`);
    const data = await response.json();
    console.log(`    Veo operation: ${data.name}, bekleniyor...`);
    return null; // Long-running operation
  }

  colorName(hex) {
    const m = { '#FF8C42': 'orange', '#FFD700': 'golden', '#C8A87C': 'brown', '#4A90D9': 'blue', '#FFD5B8': 'peach' };
    return m[hex] || 'colorful';
  }

  sanitize(s) {
    return s.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
