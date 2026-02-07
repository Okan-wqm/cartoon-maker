/**
 * ScriptWriter Agent - Senarist Ajan (v2 - Claude API + Template Fallback)
 *
 * Claude API ile dinamik, yaratıcı, her seferinde farklı senaryolar üretir.
 * API key yoksa template-based fallback kullanır.
 *
 * Çıktı: Sahne listesi (her sahne: açıklama, diyaloglar, hareketler, süre)
 */
export class ScriptWriter {
  constructor(config = {}) {
    this.targetAge = config.targetAge || '4-8';
    this.language = config.language || 'tr';
    this.maxDuration = config.maxDuration || 600;
    this.educationalFocus = config.educationalFocus || 'general';
    this.claudeApiKey = config.claudeApiKey || process.env.ANTHROPIC_API_KEY || '';
    this.claudeModel = config.claudeModel || 'claude-sonnet-4-5-20250929';
    this.claudeBaseUrl = config.claudeBaseUrl || 'https://api.anthropic.com/v1';
  }

  /**
   * Tam bir bölüm senaryosu üret
   * Claude API varsa dinamik, yoksa template-based
   */
  async generateEpisode(params) {
    // Claude API varsa dinamik senaryo üret
    if (this.claudeApiKey) {
      try {
        console.log('  🤖 Claude API ile dinamik senaryo üretiliyor...');
        const aiEpisode = await this.generateWithClaude(params);
        if (aiEpisode) return aiEpisode;
      } catch (err) {
        console.log(`  ⚠ Claude API hatası: ${err.message}, template'e düşülüyor...`);
      }
    }

    // Fallback: template-based
    return this.generateFromTemplate(params);
  }

  /**
   * Claude API ile dinamik senaryo üret
   */
  async generateWithClaude(params) {
    const charDescriptions = (params.characters || [])
      .map(c => `- ${c.name} (${c.type}): ${c.personality}, Slogan: "${c.catchphrase}"`)
      .join('\n');

    const systemPrompt = `Sen çocuklar için eğitici çizgi film senaryosu yazan yaratıcı bir yazarsın.

KURALLAR:
- Hedef yaş grubu: ${this.targetAge} yaş
- Dil: Türkçe
- Tüm içerik çocuk dostu olmalı (korku, şiddet, olumsuzluk YOK)
- Her bölüm eğitici bir tema içermeli
- Karakterler tutarlı kişiliklerde olmalı
- Diyaloglar kısa, net, çocuğun anlayacağı seviyede
- Mizah ve sürpriz unsurları kullan
- Her bölüm pozitif bir mesajla bitsin

ÇIKTI FORMATI:
JSON formatında sahne listesi döndür. Her sahne şu yapıda olmalı:
{
  "title": "Bölüm başlığı",
  "theme": "eğitim teması",
  "targetAge": "${this.targetAge}",
  "scenes": [
    {
      "name": "Sahne adı",
      "duration": 15,
      "description": "Sahne açıklaması",
      "background": { "color": "#hex", "type": "park|lake|forest|field|school|beach|home" },
      "events": [
        { "time": 0, "type": "visible", "actorId": "KarakterAdı", "visible": true },
        { "time": 0.5, "type": "animate", "actorId": "KarakterAdı", "preset": "idle|walk|run|jump|wave|nod|celebrate|think|scared" },
        { "time": 1, "type": "talk", "actorId": "KarakterAdı", "text": "Diyalog", "duration": 3 },
        { "time": 4, "type": "expression", "actorId": "KarakterAdı", "expression": "idle|happy|sad|angry|surprised|talking|sleeping|winking" },
        { "time": 5, "type": "move", "actorId": "KarakterAdı", "targetX": 500, "targetY": 400, "duration": 2 },
        { "time": 7, "type": "squash", "actorId": "KarakterAdı", "partName": "body", "amount": 0.15 },
        { "time": 8, "type": "particles", "x": 640, "y": 360, "color": "#FFD700", "count": 15, "speed": 80, "life": 2 }
      ]
    }
  ],
  "totalDuration": 85
}

MEVCUT PRESETLER: idle, walk, run, jump, wave, nod, celebrate, think, scared
MEVCUT EXPRESSION'LAR: idle, happy, sad, angry, surprised, talking, sleeping, winking
MEVCUT BACKGROUND TIPLERI: lake, field, park, school, forest, beach, home

4 sahne oluştur: Açılış (15sn) → Gelişme (25sn) → Eğitici Bölüm (30sn) → Kapanış (15sn)

ÖNEMLİ: Sadece JSON döndür, açıklama veya markdown ekleme.`;

    const userPrompt = `Şu parametrelerle yeni ve yaratıcı bir bölüm senaryosu yaz:

Başlık: ${params.title}
Tema: ${params.theme || 'general'}
Mekan: ${params.setting || 'park'}

Karakterler:
${charDescriptions}

Her seferinde farklı ve sürprizli bir hikaye oluştur. Eğitici unsurları doğal olarak hikayeye entegre et.`;

    const response = await fetch(`${this.claudeBaseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.claudeApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.claudeModel,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Claude API hata ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    // JSON parse et
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Claude API geçerli JSON döndürmedi');
    }

    const episode = JSON.parse(jsonMatch[0]);

    if (!episode.scenes || !Array.isArray(episode.scenes)) {
      throw new Error('Senaryo scenes dizisi içermiyor');
    }

    episode.totalDuration = episode.scenes.reduce((sum, s) => sum + (s.duration || 0), 0);
    episode.characters = params.characters || [];
    episode.generatedBy = 'claude-api';

    console.log(`  ✓ AI senaryo üretildi: ${episode.scenes.length} sahne, ${episode.totalDuration}sn`);
    return episode;
  }

  /**
   * Template-based senaryo üret (fallback)
   */
  generateFromTemplate(params) {
    const episode = {
      title: params.title,
      theme: params.theme || 'general',
      characters: params.characters || [],
      setting: params.setting || 'park',
      targetAge: this.targetAge,
      scenes: [],
      totalDuration: 0,
      generatedBy: 'template',
    };

    episode.scenes = this.buildStoryStructure(params);
    episode.totalDuration = episode.scenes.reduce((sum, s) => sum + s.duration, 0);

    return episode;
  }

  /**
   * 4-perde hikaye yapısı oluştur
   */
  buildStoryStructure(params) {
    const scenes = [];
    const mainChar = params.characters[0]?.name || 'Ökkeş';
    const sideChars = params.characters.slice(1).map(c => c.name);

    scenes.push({
      name: 'Açılış',
      duration: 15,
      description: `${mainChar} ${params.setting} ortamında beliriyor, izleyiciye el sallıyor.`,
      events: [
        { time: 0, type: 'visible', actorId: mainChar, visible: true },
        { time: 0.5, type: 'animate', actorId: mainChar, preset: 'idle' },
        { time: 1, type: 'animate', actorId: mainChar, preset: 'wave', duration: 2 },
        { time: 1, type: 'talk', actorId: mainChar, text: `Merhaba çocuklar! Ben ${mainChar}!`, duration: 3 },
        { time: 5, type: 'talk', actorId: mainChar, text: `Bugün ${params.setting} gidiyoruz!`, duration: 3 },
        { time: 9, type: 'animate', actorId: mainChar, preset: 'walk', duration: 4 },
        { time: 9, type: 'move', actorId: mainChar, targetX: 400, targetY: 400, duration: 4 },
      ],
      background: this.getSettingBackground(params.setting),
    });

    scenes.push({
      name: 'Gelişme',
      duration: 25,
      description: `${mainChar} ${params.setting} ortamında bir macerayla karşılaşıyor.`,
      events: this.generateDevelopmentEvents(mainChar, sideChars, params),
      background: this.getSettingBackground(params.setting),
    });

    scenes.push({
      name: 'Eğitici Bölüm',
      duration: 30,
      description: `${params.theme} teması işleniyor, ${mainChar} bir şey öğreniyor.`,
      events: this.generateEducationalEvents(mainChar, sideChars, params),
      background: this.getSettingBackground(params.setting),
    });

    scenes.push({
      name: 'Kapanış',
      duration: 15,
      description: `${mainChar} öğrendiğini özetliyor, izleyiciye veda ediyor.`,
      events: [
        { time: 0, type: 'animate', actorId: mainChar, preset: 'idle' },
        { time: 1, type: 'expression', actorId: mainChar, expression: 'happy' },
        { time: 1.5, type: 'talk', actorId: mainChar, text: `Bugün çok güzel şeyler öğrendik!`, duration: 3 },
        { time: 5, type: 'talk', actorId: mainChar, text: this.getClosingMessage(params.theme), duration: 4 },
        { time: 10, type: 'animate', actorId: mainChar, preset: 'wave', duration: 3 },
        { time: 10, type: 'talk', actorId: mainChar, text: `Hoşça kalın çocuklar! Tekrar görüşmek üzere!`, duration: 3 },
      ],
      background: this.getSettingBackground(params.setting),
    });

    return scenes;
  }

  generateDevelopmentEvents(mainChar, sideChars, params) {
    const events = [
      { time: 0, type: 'animate', actorId: mainChar, preset: 'walk', duration: 3 },
      { time: 0, type: 'move', actorId: mainChar, targetX: 500, targetY: 380, duration: 3 },
    ];

    if (sideChars.length > 0) {
      events.push(
        { time: 3, type: 'visible', actorId: sideChars[0], visible: true },
        { time: 3.5, type: 'expression', actorId: mainChar, expression: 'surprised' },
        { time: 3.5, type: 'squash', actorId: mainChar, partName: 'body', amount: 0.2 },
        { time: 4, type: 'talk', actorId: mainChar, text: `Oh! Merhaba ${sideChars[0]}!`, duration: 2 },
        { time: 6.5, type: 'talk', actorId: sideChars[0], text: `Merhaba ${mainChar}! Ne yapıyorsun?`, duration: 2.5 },
        { time: 9.5, type: 'expression', actorId: mainChar, expression: 'happy' },
      );
    }

    events.push(
      { time: 12, type: 'talk', actorId: mainChar, text: this.getThemeIntro(params.theme), duration: 3 },
      { time: 16, type: 'animate', actorId: mainChar, preset: 'nod', duration: 1 },
    );

    return events;
  }

  generateEducationalEvents(mainChar, sideChars, params) {
    const events = [];
    const theme = params.theme || 'sayılar';

    switch (theme) {
      case 'sayılar': {
        const numbers = [1, 2, 3, 4, 5];
        let t = 0;
        for (const n of numbers) {
          events.push(
            { time: t, type: 'talk', actorId: mainChar, text: `${n}... Sayalım: ${n}!`, duration: 3 },
            { time: t + 0.5, type: 'squash', actorId: mainChar, partName: 'body', amount: 0.15 },
            { time: t + 1, type: 'animate', actorId: mainChar, preset: 'jump' },
          );
          t += 5;
        }
        break;
      }
      case 'renkler': {
        const colors = [
          { name: 'kırmızı', hex: '#FF0000' },
          { name: 'mavi', hex: '#0000FF' },
          { name: 'yeşil', hex: '#00FF00' },
          { name: 'sarı', hex: '#FFD700' },
        ];
        let t = 0;
        for (const c of colors) {
          events.push(
            { time: t, type: 'talk', actorId: mainChar, text: `Bu renk ${c.name}!`, duration: 3 },
            { time: t + 0.5, type: 'particles', x: 640, y: 360, color: c.hex, count: 15, speed: 80, life: 2 },
          );
          t += 6;
        }
        break;
      }
      case 'paylaşma': {
        events.push(
          { time: 0, type: 'talk', actorId: mainChar, text: `Bende 4 tane elma var!`, duration: 3 },
          { time: 4, type: 'expression', actorId: mainChar, expression: 'happy' },
        );
        if (sideChars.length > 0) {
          events.push(
            { time: 5, type: 'talk', actorId: sideChars[0], text: `Benim hiç elmam yok...`, duration: 2.5 },
            { time: 5, type: 'expression', actorId: sideChars[0], expression: 'sad' },
            { time: 8, type: 'talk', actorId: mainChar, text: `Paylaşalım! Sana 2 tane vereyim!`, duration: 3 },
            { time: 8, type: 'animate', actorId: mainChar, preset: 'walk', duration: 1.5 },
            { time: 12, type: 'expression', actorId: sideChars[0], expression: 'happy' },
            { time: 12, type: 'talk', actorId: sideChars[0], text: `Teşekkür ederim! Paylaşmak çok güzel!`, duration: 3 },
          );
        }
        break;
      }
      default: {
        events.push(
          { time: 0, type: 'talk', actorId: mainChar, text: `Bugün çok eğlenceli bir gün!`, duration: 3 },
          { time: 4, type: 'animate', actorId: mainChar, preset: 'jump' },
        );
      }
    }

    return events;
  }

  getThemeIntro(theme) {
    const intros = {
      'sayılar': 'Bugün birlikte saymayı öğreneceğiz!',
      'renkler': 'Bugün renkleri öğreneceğiz! Hazır mısınız?',
      'paylaşma': 'Bugün paylaşmanın ne kadar güzel olduğunu göreceğiz!',
      'hayvanlar': 'Bugün hayvanları tanıyacağız!',
      'şekiller': 'Bugün şekilleri öğreneceğiz!',
    };
    return intros[theme] || 'Bugün çok güzel şeyler öğreneceğiz!';
  }

  getClosingMessage(theme) {
    const messages = {
      'sayılar': 'Artık 1den 5e kadar sayabiliyoruz! Harika!',
      'renkler': 'Kırmızı, mavi, yeşil, sarı... Ne güzel renkler!',
      'paylaşma': 'Paylaşmak bizi mutlu eder! Unutmayın!',
      'hayvanlar': 'Hayvanlar bizim dostlarımız!',
      'şekiller': 'Daire, kare, üçgen... Her yerde şekiller var!',
    };
    return messages[theme] || 'Bugün harika şeyler öğrendik!';
  }

  getSettingBackground(setting) {
    const backgrounds = {
      'göl kenarı': { color: '#87CEEB', type: 'lake' },
      'futbol sahası': { color: '#228B22', type: 'field' },
      'park': { color: '#90EE90', type: 'park' },
      'okul': { color: '#FFF8DC', type: 'school' },
      'orman': { color: '#2E8B57', type: 'forest' },
      'deniz kenarı': { color: '#00CED1', type: 'beach' },
      'ev': { color: '#FAEBD7', type: 'home' },
    };
    return backgrounds[setting] || { color: '#87CEEB', type: 'generic' };
  }
}
