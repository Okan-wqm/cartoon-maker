/**
 * PuppetAnimator - Kemik/eklem tabanlı puppet animasyon motoru.
 *
 * CharacterSheet'teki parçaları canvas üzerinde hareket ettirir.
 * Squash/stretch, rotation, translation, sine-wave oscillation destekler.
 *
 * Animasyon Kanalları (channels):
 *   Her parça için bağımsız: rotation, scaleX, scaleY, offsetX, offsetY
 *   Easing fonksiyonları ve keyframe desteği.
 */
export class PuppetAnimator {
  /**
   * @param {import('./CharacterSheet.js').CharacterSheet} characterSheet
   */
  constructor(characterSheet) {
    this.sheet = characterSheet;

    /** @type {Map<string, PartState>} Her parçanın anlık transform durumu */
    this.partStates = new Map();

    // Her parça için başlangıç durumu oluştur
    for (const [name, part] of this.sheet.parts) {
      this.partStates.set(name, {
        rotation: part.defaultTransform.rotation,
        scaleX: part.defaultTransform.scaleX,
        scaleY: part.defaultTransform.scaleY,
        offsetX: 0,
        offsetY: 0,
        opacity: 1,
      });
    }

    /** @type {Animation[]} Aktif animasyonlar */
    this.animations = [];

    /** @type {number} Global zaman (saniye) */
    this.time = 0;
  }

  /**
   * Bir parçaya animasyon kanalı ekle
   * @param {string} partName - Parça adı
   * @param {string} property - 'rotation' | 'scaleX' | 'scaleY' | 'offsetX' | 'offsetY' | 'opacity'
   * @param {object} config
   * @param {number} config.from - Başlangıç değeri
   * @param {number} config.to - Bitiş değeri
   * @param {number} config.duration - Süre (saniye)
   * @param {number} config.delay - Gecikme (saniye)
   * @param {string} config.easing - 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce' | 'elastic'
   * @param {boolean} config.loop - Döngü
   * @param {boolean} config.yoyo - İleri-geri döngü
   */
  animate(partName, property, config) {
    this.animations.push({
      partName,
      property,
      from: config.from ?? this.partStates.get(partName)?.[property] ?? 0,
      to: config.to ?? 0,
      duration: config.duration ?? 1,
      delay: config.delay ?? 0,
      easing: config.easing ?? 'easeInOut',
      loop: config.loop ?? false,
      yoyo: config.yoyo ?? false,
      startTime: this.time + (config.delay ?? 0),
      done: false,
    });
    return this;
  }

  /**
   * Sinüs dalgası ile sürekli sallanma (bacak, kuyruk, nefes vb.)
   */
  oscillate(partName, property, config) {
    this.animations.push({
      partName,
      property,
      type: 'oscillate',
      center: config.center ?? 0,
      amplitude: config.amplitude ?? 0.1,
      frequency: config.frequency ?? 1,
      phase: config.phase ?? 0,
      startTime: this.time + (config.delay ?? 0),
      duration: config.duration ?? Infinity,
      loop: true,
      done: false,
    });
    return this;
  }

  /**
   * Squash & Stretch efekti
   */
  squashStretch(partName, config) {
    const amount = config.amount ?? 0.2;
    const dur = config.duration ?? 0.3;
    // Squash: X büyür, Y küçülür → sonra ters
    this.animate(partName, 'scaleX', {
      from: 1, to: 1 + amount, duration: dur / 2, easing: 'easeOut',
    });
    this.animate(partName, 'scaleY', {
      from: 1, to: 1 - amount, duration: dur / 2, easing: 'easeOut',
    });
    // Stretch geri
    this.animate(partName, 'scaleX', {
      from: 1 + amount, to: 1, duration: dur / 2, delay: dur / 2, easing: 'easeIn',
    });
    this.animate(partName, 'scaleY', {
      from: 1 - amount, to: 1, duration: dur / 2, delay: dur / 2, easing: 'easeIn',
    });
    return this;
  }

  /**
   * Zaman ilerlet ve tüm animasyonları güncelle
   * @param {number} dt - Delta time (saniye)
   */
  update(dt) {
    this.time += dt;

    for (const anim of this.animations) {
      if (anim.done) continue;

      const elapsed = this.time - anim.startTime;
      if (elapsed < 0) continue;

      const state = this.partStates.get(anim.partName);
      if (!state) continue;

      if (anim.type === 'oscillate') {
        // Sinüs dalgası
        const value = anim.center + anim.amplitude *
          Math.sin((elapsed * anim.frequency * Math.PI * 2) + anim.phase);
        state[anim.property] = value;

        if (elapsed >= anim.duration) anim.done = true;
      } else {
        // Keyframe animasyon
        let progress = Math.min(elapsed / anim.duration, 1);

        if (anim.yoyo && anim.loop) {
          const cycle = elapsed / anim.duration;
          const isReverse = Math.floor(cycle) % 2 === 1;
          progress = cycle % 1;
          if (isReverse) progress = 1 - progress;
        } else if (anim.loop && progress >= 1) {
          progress = (elapsed / anim.duration) % 1;
        }

        const easedProgress = PuppetAnimator.ease(anim.easing, progress);
        state[anim.property] = anim.from + (anim.to - anim.from) * easedProgress;

        if (!anim.loop && elapsed >= anim.duration) {
          state[anim.property] = anim.to;
          anim.done = true;
        }
      }
    }

    // Tamamlanan loop olmayan animasyonları temizle
    this.animations = this.animations.filter(a => !a.done || a.loop);
  }

  /**
   * Karakteri canvas'a çiz
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - Karakter pozisyonu X
   * @param {number} y - Karakter pozisyonu Y
   * @param {number} scale - Global ölçek
   */
  draw(ctx, x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const drawOrder = this.sheet.getDrawOrder();

    for (const part of drawOrder) {
      this.drawPart(ctx, part);
    }

    ctx.restore();
  }

  /**
   * Tek bir parçayı çiz (parent hiyerarşisi dahil)
   */
  drawPart(ctx, part) {
    const state = this.partStates.get(part.name);
    if (!state || state.opacity <= 0) return;

    ctx.save();

    // Offset (pozisyon)
    ctx.translate(
      part.offset.x + state.offsetX,
      part.offset.y + state.offsetY
    );

    // Anchor noktasına git, transform uygula, geri gel
    ctx.translate(part.anchor.x, part.anchor.y);
    ctx.rotate(state.rotation);
    ctx.scale(state.scaleX, state.scaleY);
    ctx.translate(-part.anchor.x, -part.anchor.y);

    ctx.globalAlpha *= state.opacity;

    // Sprite varsa sprite çiz, yoksa drawFn fallback
    if (part.sprite && part.sprite.image) {
      const s = part.sprite;
      ctx.drawImage(
        s.image,
        s.sx ?? 0, s.sy ?? 0, s.sw ?? s.image.width, s.sh ?? s.image.height,
        0, 0, s.sw ?? s.image.width, s.sh ?? s.image.height
      );
    } else if (part.drawFn) {
      part.drawFn(ctx, part, this.sheet.getExpression());
    }

    ctx.restore();
  }

  /**
   * Tüm animasyonları sıfırla
   */
  reset() {
    this.animations = [];
    this.time = 0;
    for (const [name, part] of this.sheet.parts) {
      this.partStates.set(name, {
        rotation: part.defaultTransform.rotation,
        scaleX: part.defaultTransform.scaleX,
        scaleY: part.defaultTransform.scaleY,
        offsetX: 0,
        offsetY: 0,
        opacity: 1,
      });
    }
  }

  /**
   * Easing fonksiyonları
   */
  static ease(type, t) {
    switch (type) {
      case 'linear': return t;
      case 'easeIn': return t * t;
      case 'easeOut': return t * (2 - t);
      case 'easeInOut': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'bounce': {
        if (t < 1 / 2.75) return 7.5625 * t * t;
        if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75; }
        if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375; }
        t -= 2.625 / 2.75; return 7.5625 * t * t + 0.984375;
      }
      case 'elastic': {
        if (t === 0 || t === 1) return t;
        return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
      }
      default: return t;
    }
  }
}
