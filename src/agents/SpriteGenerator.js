/**
 * SpriteGenerator - Stable Diffusion ile AI Karakter Sprite Üretimi
 *
 * Programatik çizim yerine gerçek karakter görselleri üretir.
 * Stable Diffusion API (AUTOMATIC1111 / ComfyUI / Stability AI) ile çalışır.
 *
 * Üretim akışı:
 *   1. Karakter tanımından prompt oluştur
 *   2. Vücut parçalarını ayrı ayrı üret (head, body, arms, legs, tail)
 *   3. Tutarlılık için aynı seed + LoRA kullan
 *   4. PNG sprite olarak kaydet
 *   5. CharacterSheet'e sprite olarak yükle
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

export class SpriteGenerator {
  constructor(config = {}) {
    this.outputDir = config.outputDir || './output/sprites';
    this.provider = config.provider || 'stability'; // 'stability' | 'automatic1111' | 'comfyui'

    // Stability AI API
    this.stabilityApiKey = config.stabilityApiKey || process.env.STABILITY_API_KEY || '';
    this.stabilityBaseUrl = 'https://api.stability.ai/v1';

    // AUTOMATIC1111 WebUI (lokal)
    this.a1111BaseUrl = config.a1111BaseUrl || process.env.A1111_URL || 'http://127.0.0.1:7860';

    // ComfyUI (lokal)
    this.comfyBaseUrl = config.comfyBaseUrl || process.env.COMFYUI_URL || 'http://127.0.0.1:8188';

    // Ortak ayarlar
    this.defaultSeed = config.seed || 42; // Tutarlılık için sabit seed
    this.width = config.width || 512;
    this.height = config.height || 512;
    this.steps = config.steps || 30;
    this.cfgScale = config.cfgScale || 7;
    this.negativePrompt = config.negativePrompt ||
      'scary, horror, violent, blood, realistic, photorealistic, dark, ' +
      'nsfw, adult, weapon, gore, deformed, ugly, bad anatomy, bad proportions';

    // Stil preset
    this.stylePreset = config.stylePreset || 'cartoon-kids';
    this.stylePrompts = {
      'cartoon-kids': 'cute chibi kawaii cartoon style, children illustration, bright colors, round shapes, soft shading, white background, vector art, clean lines',
      'anime-kids': 'cute anime chibi style, children anime, pastel colors, big eyes, white background, clean illustration',
      'storybook': 'watercolor storybook illustration style, soft colors, gentle shading, children book art, white background',
    };
  }

  /**
   * Tam karakter sprite seti üret
   * @param {object} charSpec - Karakter tanımı (okkes-universe.js formatında)
   * @returns {SpriteSet}
   */
  async generateCharacterSprites(charSpec) {
    const charDir = join(this.outputDir, this.sanitizeName(charSpec.name));
    if (!existsSync(charDir)) {
      mkdirSync(charDir, { recursive: true });
    }

    console.log(`\n🎨 Sprite üretimi: ${charSpec.name} (${charSpec.type})`);

    const result = {
      character: charSpec.name,
      type: charSpec.type,
      sprites: {},
      seed: this.defaultSeed,
      errors: [],
    };

    // Karakter tipi bazlı vücut parçaları
    const parts = this.getCharacterParts(charSpec.type);

    for (const part of parts) {
      try {
        const prompt = this.buildPartPrompt(charSpec, part);
        console.log(`  [${part.name}] üretiliyor...`);

        const imageData = await this.generateImage(prompt, {
          seed: this.defaultSeed + part.seedOffset,
          width: part.width || this.width,
          height: part.height || this.height,
        });

        if (imageData) {
          const filepath = join(charDir, `${part.name}.png`);
          writeFileSync(filepath, imageData);
          result.sprites[part.name] = {
            file: filepath,
            width: part.width || this.width,
            height: part.height || this.height,
            anchor: part.anchor,
            offset: part.offset,
            zIndex: part.zIndex,
          };
          console.log(`    ✓ ${part.name}.png`);
        } else {
          this.writeSpriteManifest(charDir, charSpec, part, prompt);
          console.log(`    ⚠ ${part.name} manifest oluşturuldu (API key gerekli)`);
        }
      } catch (err) {
        result.errors.push({ part: part.name, error: err.message });
        console.log(`    ✗ ${part.name} HATA: ${err.message}`);
      }
    }

    // Ekstra: Yüz ifadeleri üret
    console.log(`  Yüz ifadeleri üretiliyor...`);
    const expressions = ['happy', 'sad', 'surprised', 'angry', 'sleeping', 'winking'];
    for (const expr of expressions) {
      try {
        const prompt = this.buildExpressionPrompt(charSpec, expr);
        const imageData = await this.generateImage(prompt, {
          seed: this.defaultSeed + expressions.indexOf(expr) + 100,
          width: 256,
          height: 256,
        });

        if (imageData) {
          const filepath = join(charDir, `expression_${expr}.png`);
          writeFileSync(filepath, imageData);
          result.sprites[`expression_${expr}`] = { file: filepath, width: 256, height: 256 };
          console.log(`    ✓ expression_${expr}.png`);
        } else {
          this.writeSpriteManifest(charDir, charSpec, { name: `expression_${expr}` }, prompt);
        }
      } catch (err) {
        result.errors.push({ part: `expression_${expr}`, error: err.message });
      }
    }

    // Sprite haritası kaydet
    const manifestPath = join(charDir, 'sprite_manifest.json');
    writeFileSync(manifestPath, JSON.stringify({
      character: charSpec.name,
      type: charSpec.type,
      sprites: result.sprites,
      seed: this.defaultSeed,
      style: this.stylePreset,
      generatedAt: new Date().toISOString(),
    }, null, 2));

    console.log(`  🎨 ${charSpec.name} sprite seti tamamlandı: ${Object.keys(result.sprites).length} parça`);
    return result;
  }

  /**
   * Karakter tipine göre vücut parçaları
   */
  getCharacterParts(type) {
    const baseParts = {
      cat: [
        { name: 'body', seedOffset: 0, anchor: { x: 50, y: 60 }, offset: { x: 0, y: 0 }, zIndex: 2, width: 300, height: 300 },
        { name: 'head', seedOffset: 1, anchor: { x: 50, y: 80 }, offset: { x: 0, y: -100 }, zIndex: 5, width: 256, height: 256 },
        { name: 'tail', seedOffset: 2, anchor: { x: 0, y: 50 }, offset: { x: -60, y: 20 }, zIndex: 1, width: 200, height: 150 },
        { name: 'left_arm', seedOffset: 3, anchor: { x: 80, y: 10 }, offset: { x: -45, y: -20 }, zIndex: 3, width: 128, height: 200 },
        { name: 'right_arm', seedOffset: 4, anchor: { x: 20, y: 10 }, offset: { x: 45, y: -20 }, zIndex: 3, width: 128, height: 200 },
        { name: 'left_leg', seedOffset: 5, anchor: { x: 50, y: 0 }, offset: { x: -25, y: 50 }, zIndex: 1, width: 100, height: 150 },
        { name: 'right_leg', seedOffset: 6, anchor: { x: 50, y: 0 }, offset: { x: 25, y: 50 }, zIndex: 1, width: 100, height: 150 },
      ],
      dog: [
        { name: 'body', seedOffset: 0, anchor: { x: 50, y: 60 }, offset: { x: 0, y: 0 }, zIndex: 2, width: 350, height: 300 },
        { name: 'head', seedOffset: 1, anchor: { x: 50, y: 80 }, offset: { x: 0, y: -110 }, zIndex: 5, width: 280, height: 280 },
        { name: 'tail', seedOffset: 2, anchor: { x: 0, y: 50 }, offset: { x: -70, y: 10 }, zIndex: 1, width: 180, height: 120 },
        { name: 'left_arm', seedOffset: 3, anchor: { x: 80, y: 10 }, offset: { x: -50, y: -15 }, zIndex: 3, width: 128, height: 200 },
        { name: 'right_arm', seedOffset: 4, anchor: { x: 20, y: 10 }, offset: { x: 50, y: -15 }, zIndex: 3, width: 128, height: 200 },
        { name: 'left_leg', seedOffset: 5, anchor: { x: 50, y: 0 }, offset: { x: -30, y: 55 }, zIndex: 1, width: 110, height: 160 },
        { name: 'right_leg', seedOffset: 6, anchor: { x: 50, y: 0 }, offset: { x: 30, y: 55 }, zIndex: 1, width: 110, height: 160 },
      ],
      bird: [
        { name: 'body', seedOffset: 0, anchor: { x: 50, y: 50 }, offset: { x: 0, y: 0 }, zIndex: 2, width: 200, height: 200 },
        { name: 'head', seedOffset: 1, anchor: { x: 50, y: 90 }, offset: { x: 0, y: -70 }, zIndex: 5, width: 180, height: 180 },
        { name: 'left_wing', seedOffset: 3, anchor: { x: 90, y: 30 }, offset: { x: -50, y: -10 }, zIndex: 3, width: 150, height: 120 },
        { name: 'right_wing', seedOffset: 4, anchor: { x: 10, y: 30 }, offset: { x: 50, y: -10 }, zIndex: 3, width: 150, height: 120 },
        { name: 'tail_feathers', seedOffset: 2, anchor: { x: 50, y: 10 }, offset: { x: 0, y: 40 }, zIndex: 1, width: 120, height: 100 },
      ],
      fish: [
        { name: 'body', seedOffset: 0, anchor: { x: 50, y: 50 }, offset: { x: 0, y: 0 }, zIndex: 2, width: 300, height: 200 },
        { name: 'head', seedOffset: 1, anchor: { x: 50, y: 50 }, offset: { x: 60, y: -20 }, zIndex: 5, width: 180, height: 180 },
        { name: 'tail_fin', seedOffset: 2, anchor: { x: 90, y: 50 }, offset: { x: -80, y: 0 }, zIndex: 1, width: 150, height: 120 },
        { name: 'top_fin', seedOffset: 3, anchor: { x: 50, y: 90 }, offset: { x: 0, y: -50 }, zIndex: 4, width: 120, height: 80 },
      ],
      human_child: [
        { name: 'body', seedOffset: 0, anchor: { x: 50, y: 30 }, offset: { x: 0, y: 0 }, zIndex: 2, width: 250, height: 300 },
        { name: 'head', seedOffset: 1, anchor: { x: 50, y: 90 }, offset: { x: 0, y: -120 }, zIndex: 5, width: 220, height: 220 },
        { name: 'hair', seedOffset: 7, anchor: { x: 50, y: 80 }, offset: { x: 0, y: -140 }, zIndex: 6, width: 240, height: 160 },
        { name: 'left_arm', seedOffset: 3, anchor: { x: 90, y: 10 }, offset: { x: -55, y: -30 }, zIndex: 3, width: 100, height: 200 },
        { name: 'right_arm', seedOffset: 4, anchor: { x: 10, y: 10 }, offset: { x: 55, y: -30 }, zIndex: 3, width: 100, height: 200 },
        { name: 'left_leg', seedOffset: 5, anchor: { x: 50, y: 0 }, offset: { x: -25, y: 60 }, zIndex: 1, width: 90, height: 180 },
        { name: 'right_leg', seedOffset: 6, anchor: { x: 50, y: 0 }, offset: { x: 25, y: 60 }, zIndex: 1, width: 90, height: 180 },
      ],
    };

    return baseParts[type] || baseParts.cat;
  }

  /**
   * Vücut parçası için prompt oluştur
   */
  buildPartPrompt(charSpec, part) {
    const style = this.stylePrompts[this.stylePreset] || this.stylePrompts['cartoon-kids'];
    const colorDesc = this.getColorDescription(charSpec);

    const partDescriptions = {
      body: `${charSpec.type} character body torso, ${colorDesc}, front view, isolated body part`,
      head: `${charSpec.type} character face head, ${colorDesc}, front view, cute expression, big eyes, isolated head`,
      tail: `${charSpec.type} tail, ${colorDesc}, side view, isolated body part`,
      left_arm: `${charSpec.type} arm paw, ${colorDesc}, front view, isolated limb`,
      right_arm: `${charSpec.type} arm paw, ${colorDesc}, front view, isolated limb`,
      left_leg: `${charSpec.type} leg paw, ${colorDesc}, front view, isolated limb`,
      right_leg: `${charSpec.type} leg paw, ${colorDesc}, front view, isolated limb`,
      left_wing: `${charSpec.type} wing, ${charSpec.wingColor || colorDesc}, spread wing, side view, isolated`,
      right_wing: `${charSpec.type} wing, ${charSpec.wingColor || colorDesc}, spread wing, mirrored, side view, isolated`,
      tail_feathers: `${charSpec.type} tail feathers, colorful, isolated body part`,
      tail_fin: `fish tail fin, ${charSpec.tailColor || colorDesc}, isolated body part`,
      top_fin: `fish dorsal fin, ${charSpec.finColor || colorDesc}, isolated body part`,
      hair: `child hairstyle, ${charSpec.hairColor || 'brown'} hair, front view, isolated`,
    };

    const partDesc = partDescriptions[part.name] || `${charSpec.type} ${part.name}, ${colorDesc}`;
    return `${partDesc}, ${style}, transparent background, PNG, sprite sheet part, game asset`;
  }

  /**
   * Yüz ifadesi prompt oluştur
   */
  buildExpressionPrompt(charSpec, expression) {
    const style = this.stylePrompts[this.stylePreset] || this.stylePrompts['cartoon-kids'];
    const colorDesc = this.getColorDescription(charSpec);

    const expressionDesc = {
      happy: 'big smile, happy eyes, joyful',
      sad: 'droopy eyes, small frown, tearful',
      surprised: 'wide open eyes, open mouth, shocked',
      angry: 'furrowed brows, pout, upset but cute',
      sleeping: 'closed eyes, peaceful, zzz, sleeping',
      winking: 'one eye closed, playful smile, winking',
    };

    return `${charSpec.type} character face, ${colorDesc}, ${expressionDesc[expression] || 'neutral'}, ` +
           `front view, ${style}, transparent background, PNG, expression sprite`;
  }

  /**
   * Karakter renk açıklaması
   */
  getColorDescription(charSpec) {
    const parts = [];
    if (charSpec.bodyColor) parts.push(`${this.colorToName(charSpec.bodyColor)} body`);
    if (charSpec.bellyColor) parts.push(`${this.colorToName(charSpec.bellyColor)} belly`);
    if (charSpec.eyeColor) parts.push(`${this.colorToName(charSpec.eyeColor)} eyes`);
    if (charSpec.stripeColor) parts.push(`${this.colorToName(charSpec.stripeColor)} stripes`);
    return parts.join(', ') || 'colorful';
  }

  colorToName(hex) {
    const colors = {
      '#FF8C42': 'orange', '#FFD4A8': 'light peach', '#2ECC40': 'green',
      '#FF6B81': 'pink', '#E06030': 'dark orange', '#FFD700': 'golden yellow',
      '#FFF8DC': 'cream', '#FF6347': 'tomato red', '#FFA500': 'orange',
      '#C8A87C': 'tan brown', '#F5E6D3': 'light cream', '#4A3728': 'dark brown',
      '#333333': 'black', '#8B6914': 'golden brown', '#FFD5B8': 'peach skin',
      '#4A2F1B': 'dark brown', '#E91E63': 'pink', '#7B1FA2': 'purple',
      '#8B4513': 'brown', '#4A90D9': 'blue', '#A8D8EA': 'light blue',
      '#2E6CB5': 'navy blue', '#3578C4': 'medium blue',
    };
    return colors[hex] || hex;
  }

  /**
   * Görsel üret (provider'a göre route et)
   */
  async generateImage(prompt, options = {}) {
    switch (this.provider) {
      case 'stability':
        return this.generateWithStability(prompt, options);
      case 'automatic1111':
        return this.generateWithA1111(prompt, options);
      case 'comfyui':
        return this.generateWithComfyUI(prompt, options);
      default:
        return null;
    }
  }

  /**
   * Stability AI API ile üret
   */
  async generateWithStability(prompt, options) {
    if (!this.stabilityApiKey) return null;

    const response = await fetch(`${this.stabilityBaseUrl}/generation/stable-diffusion-xl-1024-v1-0/text-to-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.stabilityApiKey}`,
      },
      body: JSON.stringify({
        text_prompts: [
          { text: prompt, weight: 1 },
          { text: this.negativePrompt, weight: -1 },
        ],
        cfg_scale: options.cfgScale || this.cfgScale,
        width: options.width || this.width,
        height: options.height || this.height,
        steps: options.steps || this.steps,
        seed: options.seed ?? this.defaultSeed,
        samples: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Stability API hata ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (data.artifacts?.[0]?.base64) {
      return Buffer.from(data.artifacts[0].base64, 'base64');
    }

    throw new Error('Stability API görsel döndürmedi');
  }

  /**
   * AUTOMATIC1111 WebUI API ile üret (lokal)
   */
  async generateWithA1111(prompt, options) {
    const response = await fetch(`${this.a1111BaseUrl}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        negative_prompt: this.negativePrompt,
        width: options.width || this.width,
        height: options.height || this.height,
        steps: options.steps || this.steps,
        cfg_scale: options.cfgScale || this.cfgScale,
        seed: options.seed ?? this.defaultSeed,
        sampler_name: 'DPM++ 2M Karras',
        batch_size: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`AUTOMATIC1111 hata ${response.status}`);
    }

    const data = await response.json();
    if (data.images?.[0]) {
      return Buffer.from(data.images[0], 'base64');
    }

    throw new Error('AUTOMATIC1111 görsel döndürmedi');
  }

  /**
   * ComfyUI API ile üret (lokal)
   */
  async generateWithComfyUI(prompt, options) {
    // ComfyUI workflow-based API - basitleştirilmiş versiyon
    const workflow = {
      prompt: {
        '1': {
          class_type: 'CheckpointLoaderSimple',
          inputs: { ckpt_name: 'sd_xl_base_1.0.safetensors' },
        },
        '2': {
          class_type: 'CLIPTextEncode',
          inputs: { text: prompt, clip: ['1', 1] },
        },
        '3': {
          class_type: 'CLIPTextEncode',
          inputs: { text: this.negativePrompt, clip: ['1', 1] },
        },
        '4': {
          class_type: 'KSampler',
          inputs: {
            seed: options.seed ?? this.defaultSeed,
            steps: options.steps || this.steps,
            cfg: options.cfgScale || this.cfgScale,
            sampler_name: 'dpmpp_2m',
            scheduler: 'karras',
            model: ['1', 0],
            positive: ['2', 0],
            negative: ['3', 0],
            latent_image: ['5', 0],
          },
        },
        '5': {
          class_type: 'EmptyLatentImage',
          inputs: {
            width: options.width || this.width,
            height: options.height || this.height,
            batch_size: 1,
          },
        },
        '6': {
          class_type: 'VAEDecode',
          inputs: { samples: ['4', 0], vae: ['1', 2] },
        },
        '7': {
          class_type: 'SaveImage',
          inputs: { images: ['6', 0], filename_prefix: 'cartoon_sprite' },
        },
      },
    };

    const response = await fetch(`${this.comfyBaseUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow),
    });

    if (!response.ok) {
      throw new Error(`ComfyUI hata ${response.status}`);
    }

    // ComfyUI asenkron çalışır - prompt_id döndürür
    const data = await response.json();
    console.log(`    ComfyUI prompt gönderildi: ${data.prompt_id}`);
    console.log(`    Sonucu ComfyUI arayüzünden kontrol edin.`);
    return null; // ComfyUI sonuçları ayrı alınır
  }

  /**
   * API key olmadan manifest yaz
   */
  writeSpriteManifest(dir, charSpec, part, prompt) {
    const manifestPath = join(dir, `${part.name}_prompt.json`);
    writeFileSync(manifestPath, JSON.stringify({
      character: charSpec.name,
      part: part.name,
      prompt,
      negativePrompt: this.negativePrompt,
      seed: this.defaultSeed + (part.seedOffset || 0),
      width: part.width || this.width,
      height: part.height || this.height,
      steps: this.steps,
      cfgScale: this.cfgScale,
      style: this.stylePreset,
      status: 'pending_generation',
      generatedAt: new Date().toISOString(),
    }, null, 2));
  }

  sanitizeName(name) {
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

  /**
   * Mevcut sprite'ları CharacterSheet'e yükle
   */
  loadSpritesIntoSheet(charSpec, characterSheet, spritesDir) {
    const manifestPath = join(spritesDir, 'sprite_manifest.json');
    if (!existsSync(manifestPath)) {
      console.log(`  ⚠ Sprite manifest bulunamadı: ${manifestPath}`);
      return false;
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    for (const [partName, spriteInfo] of Object.entries(manifest.sprites)) {
      if (partName.startsWith('expression_')) continue; // İfadeler ayrı

      if (existsSync(spriteInfo.file)) {
        const part = characterSheet.parts.get(partName);
        if (part) {
          part.sprite = {
            file: spriteInfo.file,
            // Gerçek image loading @napi-rs/canvas ile yapılmalı
            width: spriteInfo.width,
            height: spriteInfo.height,
          };
          console.log(`  ✓ ${partName} sprite yüklendi`);
        }
      }
    }

    return true;
  }
}
