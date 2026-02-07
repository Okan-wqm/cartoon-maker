/**
 * ArtistAgent - Sanatçı Ajan
 *
 * Karakter tasarımı ve sprite sheet üretiminden sorumlu.
 * İki mod:
 *   1. Programatik çizim (canvas drawFn) - varsayılan, bağımsız çalışır
 *   2. AI Sprite üretimi (Stable Diffusion/DALL-E) - ileride entegre edilecek
 *
 * HER ZAMAN aynı karakter → %100 tutarlılık.
 */
import { CharacterSheet } from '../engine/CharacterSheet.js';

export class ArtistAgent {
  constructor(config = {}) {
    this.style = config.style || 'cartoon'; // 'cartoon' | 'chibi' | 'simple'
    this.colorPalette = config.colorPalette || {};
  }

  /**
   * Karakter sheet'i oluştur
   * @param {object} spec - Karakter spesifikasyonu
   * @returns {CharacterSheet}
   */
  createCharacter(spec) {
    switch (spec.type) {
      case 'cat': return this.createCatCharacter(spec);
      case 'dog': return this.createDogCharacter(spec);
      case 'bird': return this.createBirdCharacter(spec);
      case 'fish': return this.createFishCharacter(spec);
      case 'human_child': return this.createChildCharacter(spec);
      default: return this.createGenericCharacter(spec);
    }
  }

  /**
   * Kedi karakteri oluştur (Ökkeş tipi)
   */
  createCatCharacter(spec) {
    const name = spec.name || 'Kedi';
    const colors = {
      body: spec.bodyColor || '#FF8C42',
      belly: spec.bellyColor || '#FFD4A8',
      eyes: spec.eyeColor || '#2ECC40',
      nose: spec.noseColor || '#FF6B81',
      stripes: spec.stripeColor || '#E06030',
      ...this.colorPalette,
    };

    const sheet = new CharacterSheet({
      name,
      type: 'cat',
      dimensions: { width: 120, height: 160 },
      pivot: { x: 60, y: 80 },
      metadata: {
        colors,
        personality: spec.personality || 'meraklı ve sevimli',
        age: spec.age || 'yavru',
      },
    });

    // GÖVDE
    sheet.addPart('body', {
      offset: { x: 30, y: 50 },
      anchor: { x: 30, y: 25 },
      zIndex: 5,
      drawFn: (ctx, part, expr) => {
        // Gövde
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.ellipse(30, 25, 28, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        // Karın
        ctx.fillStyle = colors.belly;
        ctx.beginPath();
        ctx.ellipse(30, 30, 18, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        // Çizgiler
        ctx.strokeStyle = colors.stripes;
        ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(30 + i * 10, 8);
          ctx.lineTo(30 + i * 8, 20);
          ctx.stroke();
        }
      },
    });

    // KAFA
    sheet.addPart('head', {
      offset: { x: 25, y: 10 },
      anchor: { x: 35, y: 35 },
      zIndex: 10,
      drawFn: (ctx, part, expr) => {
        const eyeState = expr?.eyeState || { openness: 1, pupilX: 0, pupilY: 0 };
        const mouthState = expr?.mouthState || { openness: 0, smile: 0.5 };

        // Kafa
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.ellipse(35, 30, 30, 26, 0, 0, Math.PI * 2);
        ctx.fill();

        // Kulaklar
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.moveTo(12, 18);
        ctx.lineTo(5, -5);
        ctx.lineTo(22, 12);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(48, 18);
        ctx.lineTo(65, -5);
        ctx.lineTo(58, 12);
        ctx.closePath();
        ctx.fill();
        // İç kulak
        ctx.fillStyle = colors.nose;
        ctx.beginPath();
        ctx.moveTo(14, 15);
        ctx.lineTo(10, 0);
        ctx.lineTo(20, 13);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(50, 15);
        ctx.lineTo(60, 0);
        ctx.lineTo(56, 13);
        ctx.closePath();
        ctx.fill();

        // Gözler
        const eyeOpenness = eyeState.openness;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(24, 28, 8, 7 * eyeOpenness, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(46, 28, 8, 7 * eyeOpenness, 0, 0, Math.PI * 2);
        ctx.fill();
        // Göz bebekleri
        if (eyeOpenness > 0.2) {
          ctx.fillStyle = '#333';
          ctx.beginPath();
          ctx.ellipse(24 + eyeState.pupilX * 3, 28 + eyeState.pupilY * 2, 4, 5 * eyeOpenness, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(46 + eyeState.pupilX * 3, 28 + eyeState.pupilY * 2, 4, 5 * eyeOpenness, 0, 0, Math.PI * 2);
          ctx.fill();
          // Parlama
          ctx.fillStyle = '#FFF';
          ctx.beginPath();
          ctx.arc(22, 26, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(44, 26, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Burun
        ctx.fillStyle = colors.nose;
        ctx.beginPath();
        ctx.ellipse(35, 34, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bıyıklar
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        // Sol bıyıklar
        ctx.beginPath(); ctx.moveTo(18, 33); ctx.lineTo(0, 30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(18, 35); ctx.lineTo(0, 36); ctx.stroke();
        // Sağ bıyıklar
        ctx.beginPath(); ctx.moveTo(52, 33); ctx.lineTo(70, 30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(52, 35); ctx.lineTo(70, 36); ctx.stroke();

        // Ağız
        const mouthOpen = mouthState.openness;
        const smile = mouthState.smile;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        if (mouthOpen > 0.3) {
          ctx.fillStyle = '#FF6B81';
          ctx.beginPath();
          ctx.ellipse(35, 40, 5, 4 * mouthOpen, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(30, 38);
          ctx.quadraticCurveTo(35, 38 + smile * 6, 40, 38);
          ctx.stroke();
        }
      },
    });

    // KUYRUK
    sheet.addPart('tail', {
      offset: { x: -5, y: 55 },
      anchor: { x: 10, y: 0 },
      zIndex: 2,
      drawFn: (ctx) => {
        ctx.strokeStyle = colors.body;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.bezierCurveTo(-5, -15, -10, -30, 0, -40);
        ctx.stroke();
        // Kuyruk ucu
        ctx.strokeStyle = colors.stripes;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-2, -35);
        ctx.bezierCurveTo(-5, -38, 2, -42, 0, -40);
        ctx.stroke();
      },
    });

    // SOL KOL
    sheet.addPart('leftArm', {
      offset: { x: 10, y: 52 },
      anchor: { x: 8, y: 0 },
      zIndex: 3,
      drawFn: (ctx) => {
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.ellipse(5, 18, 7, 16, -0.15, 0, Math.PI * 2);
        ctx.fill();
        // Pati
        ctx.fillStyle = colors.belly;
        ctx.beginPath();
        ctx.ellipse(4, 32, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      },
    });

    // SAĞ KOL
    sheet.addPart('rightArm', {
      offset: { x: 65, y: 52 },
      anchor: { x: 8, y: 0 },
      zIndex: 3,
      drawFn: (ctx) => {
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.ellipse(11, 18, 7, 16, 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.belly;
        ctx.beginPath();
        ctx.ellipse(12, 32, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      },
    });

    // SOL BACAK
    sheet.addPart('leftLeg', {
      offset: { x: 22, y: 68 },
      anchor: { x: 8, y: 0 },
      zIndex: 4,
      drawFn: (ctx) => {
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.ellipse(8, 20, 9, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.belly;
        ctx.beginPath();
        ctx.ellipse(8, 36, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      },
    });

    // SAĞ BACAK
    sheet.addPart('rightLeg', {
      offset: { x: 50, y: 68 },
      anchor: { x: 8, y: 0 },
      zIndex: 4,
      drawFn: (ctx) => {
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.ellipse(8, 20, 9, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.belly;
        ctx.beginPath();
        ctx.ellipse(8, 36, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      },
    });

    // Hiyerarşi: her şey body'ye bağlı
    sheet.setParent('head', 'body');
    sheet.setParent('leftArm', 'body');
    sheet.setParent('rightArm', 'body');
    sheet.setParent('leftLeg', 'body');
    sheet.setParent('rightLeg', 'body');
    sheet.setParent('tail', 'body');

    // Yüz ifadeleri
    this.addStandardExpressions(sheet);

    return sheet;
  }

  /**
   * Köpek karakteri
   */
  createDogCharacter(spec) {
    const name = spec.name || 'Köpek';
    const colors = {
      body: spec.bodyColor || '#C8A87C',
      belly: spec.bellyColor || '#F5E6D3',
      eyes: spec.eyeColor || '#4A3728',
      nose: spec.noseColor || '#333',
      spots: spec.spotColor || '#8B6914',
    };

    const sheet = new CharacterSheet({
      name, type: 'dog',
      dimensions: { width: 120, height: 160 },
      pivot: { x: 60, y: 80 },
      metadata: { colors, personality: spec.personality || 'sadık ve enerjik' },
    });

    sheet.addPart('body', {
      offset: { x: 25, y: 50 },
      anchor: { x: 35, y: 25 },
      zIndex: 5,
      drawFn: (ctx) => {
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.ellipse(35, 25, 30, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.belly;
        ctx.beginPath();
        ctx.ellipse(35, 32, 20, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      },
    });

    sheet.addPart('head', {
      offset: { x: 22, y: 8 },
      anchor: { x: 38, y: 35 },
      zIndex: 10,
      drawFn: (ctx, part, expr) => {
        const eyeState = expr?.eyeState || { openness: 1, pupilX: 0, pupilY: 0 };
        const mouthState = expr?.mouthState || { openness: 0, smile: 0.7 };
        // Kafa
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.ellipse(38, 30, 32, 28, 0, 0, Math.PI * 2);
        ctx.fill();
        // Sarkık kulaklar
        ctx.fillStyle = colors.spots;
        ctx.beginPath();
        ctx.ellipse(8, 28, 12, 22, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(68, 28, 12, 22, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Gözler
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.ellipse(28, 26, 8, 7 * eyeState.openness, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(48, 26, 8, 7 * eyeState.openness, 0, 0, Math.PI * 2); ctx.fill();
        if (eyeState.openness > 0.2) {
          ctx.fillStyle = colors.eyes;
          ctx.beginPath(); ctx.arc(28 + eyeState.pupilX * 3, 26, 4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(48 + eyeState.pupilX * 3, 26, 4, 0, Math.PI * 2); ctx.fill();
        }
        // Burun
        ctx.fillStyle = colors.nose;
        ctx.beginPath(); ctx.ellipse(38, 35, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
        // Ağız (dil dışarıda!)
        if (mouthState.openness > 0.3) {
          ctx.fillStyle = '#FF6B81';
          ctx.beginPath();
          ctx.ellipse(38, 42, 6, 8 * mouthState.openness, 0, 0, Math.PI);
          ctx.fill();
        }
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(32, 38);
        ctx.quadraticCurveTo(38, 38 + mouthState.smile * 8, 44, 38);
        ctx.stroke();
      },
    });

    // Kuyruk (sallanan!)
    sheet.addPart('tail', {
      offset: { x: -5, y: 50 },
      anchor: { x: 10, y: 10 },
      zIndex: 2,
      drawFn: (ctx) => {
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.ellipse(0, -10, 6, 18, -0.5, 0, Math.PI * 2);
        ctx.fill();
      },
    });

    // Kollar ve bacaklar (basitleştirilmiş)
    for (const [partName, offsetX, zIdx] of [['leftArm', 8, 3], ['rightArm', 68, 3], ['leftLeg', 20, 4], ['rightLeg', 52, 4]]) {
      sheet.addPart(partName, {
        offset: { x: offsetX, y: partName.includes('Leg') ? 70 : 52 },
        anchor: { x: 8, y: 0 },
        zIndex: zIdx,
        drawFn: (ctx) => {
          ctx.fillStyle = colors.body;
          ctx.beginPath();
          ctx.ellipse(8, 18, 8, 16, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = colors.belly;
          ctx.beginPath();
          ctx.ellipse(8, 32, 7, 5, 0, 0, Math.PI * 2);
          ctx.fill();
        },
      });
      sheet.setParent(partName, 'body');
    }

    sheet.setParent('head', 'body');
    sheet.setParent('tail', 'body');
    this.addStandardExpressions(sheet);

    return sheet;
  }

  /**
   * Kuş karakteri
   */
  createBirdCharacter(spec) {
    const name = spec.name || 'Kuş';
    const colors = {
      body: spec.bodyColor || '#FFD700',
      belly: spec.bellyColor || '#FFF8DC',
      beak: spec.beakColor || '#FF6347',
      wing: spec.wingColor || '#FFA500',
    };

    const sheet = new CharacterSheet({
      name, type: 'bird',
      dimensions: { width: 80, height: 100 },
      pivot: { x: 40, y: 50 },
      metadata: { colors, personality: spec.personality || 'neşeli ve meraklı' },
    });

    sheet.addPart('body', {
      offset: { x: 15, y: 35 },
      anchor: { x: 25, y: 20 },
      zIndex: 5,
      drawFn: (ctx) => {
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.ellipse(25, 20, 22, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.belly;
        ctx.beginPath();
        ctx.ellipse(25, 25, 15, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      },
    });

    sheet.addPart('head', {
      offset: { x: 18, y: 5 },
      anchor: { x: 22, y: 25 },
      zIndex: 10,
      drawFn: (ctx, part, expr) => {
        const eyeState = expr?.eyeState || { openness: 1, pupilX: 0, pupilY: 0 };
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.arc(22, 18, 16, 0, Math.PI * 2);
        ctx.fill();
        // Gözler
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.ellipse(15, 15, 5, 5 * eyeState.openness, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(29, 15, 5, 5 * eyeState.openness, 0, 0, Math.PI * 2); ctx.fill();
        if (eyeState.openness > 0.2) {
          ctx.fillStyle = '#333';
          ctx.beginPath(); ctx.arc(15, 15, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(29, 15, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        // Gaga
        ctx.fillStyle = colors.beak;
        ctx.beginPath();
        ctx.moveTo(20, 22);
        ctx.lineTo(22, 28);
        ctx.lineTo(24, 22);
        ctx.closePath();
        ctx.fill();
      },
    });

    // Kanatlar
    sheet.addPart('leftArm', {
      offset: { x: 0, y: 38 },
      anchor: { x: 15, y: 5 },
      zIndex: 3,
      drawFn: (ctx) => {
        ctx.fillStyle = colors.wing;
        ctx.beginPath();
        ctx.ellipse(5, 12, 12, 8, -0.3, 0, Math.PI * 2);
        ctx.fill();
      },
    });
    sheet.addPart('rightArm', {
      offset: { x: 45, y: 38 },
      anchor: { x: 0, y: 5 },
      zIndex: 3,
      drawFn: (ctx) => {
        ctx.fillStyle = colors.wing;
        ctx.beginPath();
        ctx.ellipse(10, 12, 12, 8, 0.3, 0, Math.PI * 2);
        ctx.fill();
      },
    });

    // Bacaklar (ince)
    sheet.addPart('leftLeg', {
      offset: { x: 25, y: 55 },
      anchor: { x: 5, y: 0 },
      zIndex: 4,
      drawFn: (ctx) => {
        ctx.strokeStyle = colors.beak;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(3, 15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo(8, 15); ctx.stroke();
      },
    });
    sheet.addPart('rightLeg', {
      offset: { x: 38, y: 55 },
      anchor: { x: 5, y: 0 },
      zIndex: 4,
      drawFn: (ctx) => {
        ctx.strokeStyle = colors.beak;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(7, 15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3, 15); ctx.lineTo(11, 15); ctx.stroke();
      },
    });

    // Kuyruk tüyleri
    sheet.addPart('tail', {
      offset: { x: 5, y: 50 },
      anchor: { x: 10, y: 0 },
      zIndex: 2,
      drawFn: (ctx) => {
        ctx.fillStyle = colors.wing;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(0, -12);
        ctx.lineTo(10, -8);
        ctx.lineTo(20, -12);
        ctx.closePath();
        ctx.fill();
      },
    });

    ['head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'tail'].forEach(p => sheet.setParent(p, 'body'));
    this.addStandardExpressions(sheet);
    return sheet;
  }

  /**
   * Balık karakteri
   */
  createFishCharacter(spec) {
    const name = spec.name || 'Balık';
    const colors = {
      body: spec.bodyColor || '#4A90D9',
      belly: spec.bellyColor || '#A8D8EA',
      fin: spec.finColor || '#2E6CB5',
      tail: spec.tailColor || '#3578C4',
    };

    const sheet = new CharacterSheet({
      name, type: 'fish',
      dimensions: { width: 120, height: 80 },
      pivot: { x: 60, y: 40 },
      metadata: { colors, personality: spec.personality || 'sakin ve bilge' },
    });

    sheet.addPart('body', {
      offset: { x: 20, y: 15 },
      anchor: { x: 40, y: 25 },
      zIndex: 5,
      drawFn: (ctx) => {
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.ellipse(40, 25, 35, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.belly;
        ctx.beginPath();
        ctx.ellipse(40, 30, 25, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pullar
        ctx.fillStyle = colors.fin + '40';
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(25 + i * 8, 22, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    });

    sheet.addPart('head', {
      offset: { x: 55, y: 15 },
      anchor: { x: 15, y: 25 },
      zIndex: 10,
      drawFn: (ctx, part, expr) => {
        const eyeState = expr?.eyeState || { openness: 1, pupilX: 0, pupilY: 0 };
        const mouthState = expr?.mouthState || { openness: 0, smile: 0.3 };
        // Göz
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.ellipse(15, 18, 8, 7 * eyeState.openness, 0, 0, Math.PI * 2);
        ctx.fill();
        if (eyeState.openness > 0.2) {
          ctx.fillStyle = '#333';
          ctx.beginPath();
          ctx.arc(16 + eyeState.pupilX * 2, 18, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Ağız
        if (mouthState.openness > 0.2) {
          ctx.fillStyle = '#FF6B81';
          ctx.beginPath();
          ctx.ellipse(22, 30, 4, 3 * mouthState.openness, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    });

    // Kuyruk yüzgeci
    sheet.addPart('tail', {
      offset: { x: -5, y: 18 },
      anchor: { x: 20, y: 15 },
      zIndex: 2,
      drawFn: (ctx) => {
        ctx.fillStyle = colors.tail;
        ctx.beginPath();
        ctx.moveTo(20, 15);
        ctx.lineTo(0, 0);
        ctx.lineTo(0, 30);
        ctx.closePath();
        ctx.fill();
      },
    });

    // Üst yüzgeç
    sheet.addPart('leftArm', {
      offset: { x: 35, y: 5 },
      anchor: { x: 10, y: 15 },
      zIndex: 8,
      drawFn: (ctx) => {
        ctx.fillStyle = colors.fin;
        ctx.beginPath();
        ctx.moveTo(10, 15);
        ctx.lineTo(5, 0);
        ctx.lineTo(20, 15);
        ctx.closePath();
        ctx.fill();
      },
    });

    // Alt yüzgeç
    sheet.addPart('rightArm', {
      offset: { x: 35, y: 42 },
      anchor: { x: 10, y: 0 },
      zIndex: 3,
      drawFn: (ctx) => {
        ctx.fillStyle = colors.fin;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(5, 12);
        ctx.lineTo(18, 0);
        ctx.closePath();
        ctx.fill();
      },
    });

    // Balıkta bacak yok ama sisteme uyumluluk için dummy
    sheet.addPart('leftLeg', { offset: { x: 0, y: 0 }, zIndex: -1, drawFn: () => {} });
    sheet.addPart('rightLeg', { offset: { x: 0, y: 0 }, zIndex: -1, drawFn: () => {} });

    ['head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'tail'].forEach(p => sheet.setParent(p, 'body'));
    this.addStandardExpressions(sheet);
    return sheet;
  }

  /**
   * Çocuk karakteri
   */
  createChildCharacter(spec) {
    const name = spec.name || 'Çocuk';
    const colors = {
      skin: spec.skinColor || '#FFD5B8',
      hair: spec.hairColor || '#4A2F1B',
      shirt: spec.shirtColor || '#4A90D9',
      pants: spec.pantsColor || '#2E4057',
      eyes: spec.eyeColor || '#4A3728',
      shoes: spec.shoeColor || '#8B4513',
    };

    const sheet = new CharacterSheet({
      name, type: 'human_child',
      dimensions: { width: 100, height: 180 },
      pivot: { x: 50, y: 90 },
      metadata: { colors, personality: spec.personality || 'meraklı ve arkadaş canlısı' },
    });

    sheet.addPart('body', {
      offset: { x: 20, y: 60 },
      anchor: { x: 30, y: 20 },
      zIndex: 5,
      drawFn: (ctx) => {
        // Tişört
        ctx.fillStyle = colors.shirt;
        ctx.beginPath();
        ctx.roundRect(10, 0, 40, 40, 5);
        ctx.fill();
      },
    });

    sheet.addPart('head', {
      offset: { x: 18, y: 5 },
      anchor: { x: 32, y: 45 },
      zIndex: 10,
      drawFn: (ctx, part, expr) => {
        const eyeState = expr?.eyeState || { openness: 1, pupilX: 0, pupilY: 0 };
        const mouthState = expr?.mouthState || { openness: 0, smile: 0.5 };
        // Saç (arkada)
        ctx.fillStyle = colors.hair;
        ctx.beginPath();
        ctx.ellipse(32, 22, 28, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        // Yüz
        ctx.fillStyle = colors.skin;
        ctx.beginPath();
        ctx.ellipse(32, 28, 24, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        // Saç (önde)
        ctx.fillStyle = colors.hair;
        ctx.beginPath();
        ctx.ellipse(32, 12, 26, 14, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        // Gözler
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.ellipse(22, 26, 6, 5 * eyeState.openness, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(42, 26, 6, 5 * eyeState.openness, 0, 0, Math.PI * 2); ctx.fill();
        if (eyeState.openness > 0.2) {
          ctx.fillStyle = colors.eyes;
          ctx.beginPath(); ctx.arc(22 + eyeState.pupilX * 2, 26, 3, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(42 + eyeState.pupilX * 2, 26, 3, 0, Math.PI * 2); ctx.fill();
        }
        // Yanaklar (allık)
        ctx.fillStyle = '#FFB6C1';
        ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.arc(14, 33, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(50, 33, 5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        // Ağız
        if (mouthState.openness > 0.3) {
          ctx.fillStyle = '#FF6B81';
          ctx.beginPath();
          ctx.ellipse(32, 38, 5, 3 * mouthState.openness, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(27, 37);
          ctx.quadraticCurveTo(32, 37 + mouthState.smile * 5, 37, 37);
          ctx.stroke();
        }
      },
    });

    // Kollar
    sheet.addPart('leftArm', {
      offset: { x: 5, y: 62 },
      anchor: { x: 10, y: 0 },
      zIndex: 3,
      drawFn: (ctx) => {
        ctx.fillStyle = colors.shirt;
        ctx.beginPath(); ctx.roundRect(2, 0, 14, 20, 3); ctx.fill();
        ctx.fillStyle = colors.skin;
        ctx.beginPath(); ctx.ellipse(8, 32, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
      },
    });

    sheet.addPart('rightArm', {
      offset: { x: 65, y: 62 },
      anchor: { x: 5, y: 0 },
      zIndex: 3,
      drawFn: (ctx) => {
        ctx.fillStyle = colors.shirt;
        ctx.beginPath(); ctx.roundRect(0, 0, 14, 20, 3); ctx.fill();
        ctx.fillStyle = colors.skin;
        ctx.beginPath(); ctx.ellipse(7, 32, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
      },
    });

    // Bacaklar
    sheet.addPart('leftLeg', {
      offset: { x: 22, y: 98 },
      anchor: { x: 8, y: 0 },
      zIndex: 4,
      drawFn: (ctx) => {
        ctx.fillStyle = colors.pants;
        ctx.beginPath(); ctx.roundRect(2, 0, 14, 30, 3); ctx.fill();
        ctx.fillStyle = colors.shoes;
        ctx.beginPath(); ctx.ellipse(8, 35, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
      },
    });

    sheet.addPart('rightLeg', {
      offset: { x: 48, y: 98 },
      anchor: { x: 8, y: 0 },
      zIndex: 4,
      drawFn: (ctx) => {
        ctx.fillStyle = colors.pants;
        ctx.beginPath(); ctx.roundRect(2, 0, 14, 30, 3); ctx.fill();
        ctx.fillStyle = colors.shoes;
        ctx.beginPath(); ctx.ellipse(8, 35, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
      },
    });

    // Kuyruk yok (dummy)
    sheet.addPart('tail', { offset: { x: 0, y: 0 }, zIndex: -1, drawFn: () => {} });

    ['head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'tail'].forEach(p => sheet.setParent(p, 'body'));
    this.addStandardExpressions(sheet);
    return sheet;
  }

  /**
   * Genel karakter (herhangi bir tür için fallback)
   */
  createGenericCharacter(spec) {
    return this.createCatCharacter(spec);
  }

  /**
   * Standart yüz ifadelerini ekle
   */
  addStandardExpressions(sheet) {
    sheet.addExpression('idle', {
      eyeState: { openness: 1, pupilX: 0, pupilY: 0 },
      mouthState: { openness: 0, smile: 0.3 },
    });
    sheet.addExpression('happy', {
      eyeState: { openness: 0.8, pupilX: 0, pupilY: 0 },
      mouthState: { openness: 0.2, smile: 1 },
    });
    sheet.addExpression('sad', {
      eyeState: { openness: 0.7, pupilX: 0, pupilY: 0.3 },
      mouthState: { openness: 0, smile: -0.5 },
    });
    sheet.addExpression('angry', {
      eyeState: { openness: 0.6, pupilX: 0, pupilY: 0 },
      mouthState: { openness: 0.3, smile: -0.8 },
    });
    sheet.addExpression('surprised', {
      eyeState: { openness: 1.3, pupilX: 0, pupilY: 0 },
      mouthState: { openness: 0.8, smile: 0 },
    });
    sheet.addExpression('talking', {
      eyeState: { openness: 1, pupilX: 0, pupilY: 0 },
      mouthState: { openness: 0.6, smile: 0.3 },
    });
    sheet.addExpression('sleeping', {
      eyeState: { openness: 0, pupilX: 0, pupilY: 0 },
      mouthState: { openness: 0, smile: 0.2 },
    });
    sheet.addExpression('winking', {
      eyeState: { openness: 0.5, pupilX: 0.2, pupilY: 0 },
      mouthState: { openness: 0, smile: 0.8 },
    });
  }
}
