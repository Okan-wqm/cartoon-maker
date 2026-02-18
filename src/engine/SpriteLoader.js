/**
 * SpriteLoader - Elle cizilmis PNG sprite'lari CharacterSheet'e yukler
 *
 * Kullanim:
 *   1. Karakteri parcalar halinde ciz (head.png, body.png, ...)
 *   2. sprites/okkes/ klasorune koy
 *   3. SpriteLoader.loadCharacter('okkes') ile yukle
 *   4. Animasyon sistemi otomatik calisiyor!
 *
 * Gerekli parcalar (seffaf arka plan PNG):
 *   head.png, body.png, left_arm.png, right_arm.png,
 *   left_leg.png, right_leg.png, tail.png (opsiyonel)
 *
 * Opsiyonel ifade dosyalari:
 *   face_happy.png, face_sad.png, face_surprised.png, ...
 */
import { loadImage } from '@napi-rs/canvas';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { CharacterSheet } from '../engine/CharacterSheet.js';

export class SpriteLoader {
  constructor(config = {}) {
    this.spritesDir = config.spritesDir || './sprites';
  }

  /**
   * PNG dosyalarindan tam bir CharacterSheet yukle
   *
   * @param {string} characterName - Klasor adi (orn: 'okkes')
   * @param {object} config - Pivot, offset, boyut ayarlari
   * @returns {CharacterSheet}
   */
  async loadCharacter(characterName, config = {}) {
    const charDir = join(this.spritesDir, characterName);

    // Manifest dosyasi varsa ondan oku
    const manifestPath = join(charDir, 'manifest.json');
    let manifest = config;
    if (existsSync(manifestPath)) {
      manifest = { ...JSON.parse(readFileSync(manifestPath, 'utf-8')), ...config };
    }

    console.log(`🖼️  Sprite yukleniyor: ${characterName}`);

    const sheet = new CharacterSheet({
      name: manifest.name || characterName,
      type: manifest.type || 'custom',
      dimensions: manifest.dimensions || { width: 200, height: 280 },
      pivot: manifest.pivot || { x: 100, y: 140 },
      metadata: manifest.metadata || {},
    });

    // Her parca icin PNG yukle
    const parts = manifest.parts || this.getDefaultParts(manifest.type || 'cat');

    for (const part of parts) {
      const pngPath = join(charDir, `${part.file || part.name}.png`);

      if (!existsSync(pngPath)) {
        console.log(`    ⚠ ${part.name}.png bulunamadi, atlaniyor`);
        continue;
      }

      const image = await loadImage(pngPath);
      console.log(`    ✓ ${part.name} (${image.width}x${image.height})`);

      sheet.addPart(part.name, {
        offset: part.offset || { x: 0, y: 0 },
        anchor: part.anchor || { x: image.width / 2, y: image.height / 2 },
        zIndex: part.zIndex ?? 5,
        sprite: {
          image,
          sx: 0,
          sy: 0,
          sw: image.width,
          sh: image.height,
        },
        // drawFn yok - sprite kullaniliyor
      });
    }

    // Parent hiyerarsisi kur
    const bodyParts = ['head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'tail'];
    for (const partName of bodyParts) {
      if (sheet.parts.has(partName) && sheet.parts.has('body')) {
        sheet.setParent(partName, 'body');
      }
    }

    // Yuz ifadelerini yukle (varsa)
    await this.loadExpressions(sheet, charDir);

    // Standart ifadeler ekle
    this.addDefaultExpressions(sheet);

    console.log(`    🖼️  ${characterName} yuklendi: ${sheet.parts.size} parca`);
    return sheet;
  }

  /**
   * Yuz ifade PNG'lerini yukle
   * face_happy.png, face_sad.png, ... formatinda
   */
  async loadExpressions(sheet, charDir) {
    const files = existsSync(charDir) ? readdirSync(charDir) : [];
    const faceFiles = files.filter(f => f.startsWith('face_') && f.endsWith('.png'));

    for (const file of faceFiles) {
      const exprName = file.replace('face_', '').replace('.png', '');
      const image = await loadImage(join(charDir, file));

      // Head part'in sprite'ini bu ifadeyle degistirmek icin kaydet
      if (!sheet.metadata) sheet.metadata = {};
      if (!sheet.metadata.faceSprites) sheet.metadata.faceSprites = {};
      sheet.metadata.faceSprites[exprName] = { image, width: image.width, height: image.height };

      console.log(`    ✓ ifade: ${exprName}`);
    }
  }

  /**
   * Karakter tipi icin varsayilan parca konfigurasyonu
   */
  getDefaultParts(type) {
    const configs = {
      cat: [
        { name: 'body', file: 'body', offset: { x: 50, y: 80 }, anchor: { x: 50, y: 40 }, zIndex: 5 },
        { name: 'head', file: 'head', offset: { x: 40, y: 10 }, anchor: { x: 60, y: 60 }, zIndex: 10 },
        { name: 'tail', file: 'tail', offset: { x: -10, y: 70 }, anchor: { x: 20, y: 10 }, zIndex: 2 },
        { name: 'leftArm', file: 'left_arm', offset: { x: 15, y: 82 }, anchor: { x: 15, y: 5 }, zIndex: 3 },
        { name: 'rightArm', file: 'right_arm', offset: { x: 105, y: 82 }, anchor: { x: 15, y: 5 }, zIndex: 3 },
        { name: 'leftLeg', file: 'left_leg', offset: { x: 35, y: 130 }, anchor: { x: 15, y: 5 }, zIndex: 4 },
        { name: 'rightLeg', file: 'right_leg', offset: { x: 80, y: 130 }, anchor: { x: 15, y: 5 }, zIndex: 4 },
      ],
      dog: [
        { name: 'body', file: 'body', offset: { x: 45, y: 80 }, anchor: { x: 55, y: 40 }, zIndex: 5 },
        { name: 'head', file: 'head', offset: { x: 35, y: 10 }, anchor: { x: 65, y: 60 }, zIndex: 10 },
        { name: 'tail', file: 'tail', offset: { x: -10, y: 80 }, anchor: { x: 15, y: 15 }, zIndex: 2 },
        { name: 'leftArm', file: 'left_arm', offset: { x: 10, y: 85 }, anchor: { x: 15, y: 5 }, zIndex: 3 },
        { name: 'rightArm', file: 'right_arm', offset: { x: 110, y: 85 }, anchor: { x: 15, y: 5 }, zIndex: 3 },
        { name: 'leftLeg', file: 'left_leg', offset: { x: 30, y: 135 }, anchor: { x: 15, y: 5 }, zIndex: 4 },
        { name: 'rightLeg', file: 'right_leg', offset: { x: 85, y: 135 }, anchor: { x: 15, y: 5 }, zIndex: 4 },
      ],
      bird: [
        { name: 'body', file: 'body', offset: { x: 30, y: 50 }, anchor: { x: 40, y: 35 }, zIndex: 5 },
        { name: 'head', file: 'head', offset: { x: 30, y: 5 }, anchor: { x: 40, y: 45 }, zIndex: 10 },
        { name: 'leftArm', file: 'left_wing', offset: { x: 0, y: 55 }, anchor: { x: 25, y: 10 }, zIndex: 3 },
        { name: 'rightArm', file: 'right_wing', offset: { x: 70, y: 55 }, anchor: { x: 5, y: 10 }, zIndex: 3 },
        { name: 'leftLeg', file: 'left_leg', offset: { x: 35, y: 85 }, anchor: { x: 8, y: 2 }, zIndex: 4 },
        { name: 'rightLeg', file: 'right_leg', offset: { x: 55, y: 85 }, anchor: { x: 8, y: 2 }, zIndex: 4 },
        { name: 'tail', file: 'tail', offset: { x: 25, y: 80 }, anchor: { x: 15, y: 5 }, zIndex: 2 },
      ],
      fish: [
        { name: 'body', file: 'body', offset: { x: 30, y: 20 }, anchor: { x: 60, y: 35 }, zIndex: 5 },
        { name: 'head', file: 'head', offset: { x: 80, y: 15 }, anchor: { x: 20, y: 35 }, zIndex: 10 },
        { name: 'tail', file: 'tail', offset: { x: -10, y: 20 }, anchor: { x: 30, y: 25 }, zIndex: 2 },
        { name: 'leftArm', file: 'top_fin', offset: { x: 50, y: 5 }, anchor: { x: 15, y: 20 }, zIndex: 8 },
        { name: 'rightArm', file: 'bottom_fin', offset: { x: 50, y: 55 }, anchor: { x: 15, y: 5 }, zIndex: 3 },
      ],
      human_child: [
        { name: 'body', file: 'body', offset: { x: 40, y: 90 }, anchor: { x: 45, y: 30 }, zIndex: 5 },
        { name: 'head', file: 'head', offset: { x: 30, y: 10 }, anchor: { x: 50, y: 60 }, zIndex: 10 },
        { name: 'leftArm', file: 'left_arm', offset: { x: 10, y: 92 }, anchor: { x: 15, y: 5 }, zIndex: 3 },
        { name: 'rightArm', file: 'right_arm', offset: { x: 105, y: 92 }, anchor: { x: 15, y: 5 }, zIndex: 3 },
        { name: 'leftLeg', file: 'left_leg', offset: { x: 35, y: 145 }, anchor: { x: 15, y: 5 }, zIndex: 4 },
        { name: 'rightLeg', file: 'right_leg', offset: { x: 75, y: 145 }, anchor: { x: 15, y: 5 }, zIndex: 4 },
      ],
    };

    return configs[type] || configs.cat;
  }

  /**
   * Standart yuz ifadeleri (sprite olmadan da calisan)
   */
  addDefaultExpressions(sheet) {
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
    sheet.addExpression('surprised', {
      eyeState: { openness: 1.3, pupilX: 0, pupilY: 0 },
      mouthState: { openness: 0.8, smile: 0 },
    });
    sheet.addExpression('talking', {
      eyeState: { openness: 1, pupilX: 0, pupilY: 0 },
      mouthState: { openness: 0.6, smile: 0.3 },
    });
  }

  /**
   * Ornek manifest.json olustur (kullaniciya rehber)
   */
  static generateManifestTemplate(characterName, type = 'cat') {
    return {
      name: characterName,
      type,
      dimensions: { width: 200, height: 280 },
      pivot: { x: 100, y: 140 },
      metadata: {
        description: 'Karakter aciklamasi',
        personality: 'merakli, sevimli',
      },
      parts: new SpriteLoader().getDefaultParts(type),
      notes: {
        format: 'PNG, seffaf arka plan',
        resolution: 'En az 200x200px parca basi',
        files_needed: [
          'body.png - Govde (karin dahil)',
          'head.png - Kafa (yuz, kulaklar dahil)',
          'left_arm.png - Sol kol',
          'right_arm.png - Sag kol',
          'left_leg.png - Sol bacak',
          'right_leg.png - Sag bacak',
          'tail.png - Kuyruk (opsiyonel)',
          'face_happy.png - Mutlu yuz (opsiyonel)',
          'face_sad.png - Uzgun yuz (opsiyonel)',
          'face_surprised.png - Saskin yuz (opsiyonel)',
        ],
      },
    };
  }
}
