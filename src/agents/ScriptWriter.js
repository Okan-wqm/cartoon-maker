/**
 * ScriptWriter Agent - Senarist Ajan
 *
 * Bir konu/tema alır, çocuklara uygun eğitici senaryo üretir.
 * Çıktı: Sahne listesi (her sahne: açıklama, diyaloglar, hareketler, süre)
 *
 * AI entegrasyonu: Claude/GPT API ile senaryo üretimi yapılabilir.
 * Şimdilik template-based + parametrik sistem.
 */
export class ScriptWriter {
  constructor(config = {}) {
    this.targetAge = config.targetAge || '4-8'; // Hedef yaş grubu
    this.language = config.language || 'tr';     // Dil
    this.maxDuration = config.maxDuration || 600; // Maks süre (saniye, 10dk)
    this.educationalFocus = config.educationalFocus || 'general';
  }

  /**
   * Tam bir bölüm senaryosu üret
   * @param {object} params
   * @param {string} params.title - Bölüm başlığı (ör: "Ökkeş Balık Avında")
   * @param {string} params.theme - Eğitim teması (ör: "sayılar", "renkler", "paylaşma")
   * @param {object[]} params.characters - Kullanılacak karakterler
   * @param {string} params.setting - Mekan (ör: "göl kenarı", "futbol sahası")
   * @returns {Episode}
   */
  generateEpisode(params) {
    const episode = {
      title: params.title,
      theme: params.theme || 'general',
      characters: params.characters || [],
      setting: params.setting || 'park',
      targetAge: this.targetAge,
      scenes: [],
      totalDuration: 0,
    };

    // Temel hikaye yapısı: Giriş → Gelişme → Eğitici Bölüm → Sonuç
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

    // PERDE 1: AÇILIŞ (tanıtım, ortam, selamlama)
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

    // PERDE 2: GELİŞME (problem/macera başlar)
    scenes.push({
      name: 'Gelişme',
      duration: 25,
      description: `${mainChar} ${params.setting} ortamında bir macerayla karşılaşıyor.`,
      events: this.generateDevelopmentEvents(mainChar, sideChars, params),
      background: this.getSettingBackground(params.setting),
    });

    // PERDE 3: EĞİTİCİ BÖLÜM (öğrenme anı)
    scenes.push({
      name: 'Eğitici Bölüm',
      duration: 30,
      description: `${params.theme} teması işleniyor, ${mainChar} bir şey öğreniyor.`,
      events: this.generateEducationalEvents(mainChar, sideChars, params),
      background: this.getSettingBackground(params.setting),
    });

    // PERDE 4: SONUÇ (öğrenilen ders, vedalaşma)
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

  /**
   * Gelişme sahnesi olayları
   */
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

    // Tema bazlı ek olaylar
    events.push(
      { time: 12, type: 'talk', actorId: mainChar, text: this.getThemeIntro(params.theme), duration: 3 },
      { time: 16, type: 'animate', actorId: mainChar, preset: 'nod', duration: 1 },
    );

    return events;
  }

  /**
   * Eğitici bölüm olayları
   */
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
