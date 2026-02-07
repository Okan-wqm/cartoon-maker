/**
 * Scene - Bir sahneyi tanımlar: aktörler, hareketler, diyaloglar, kamera.
 *
 * Her sahne bir mini-senaryo: hangi karakterler nerede, ne yapıyor, ne söylüyor.
 * Timeline sistemi ile zamana bağlı event'ler tetiklenir.
 */
export class Scene {
  /**
   * @param {object} config
   * @param {string} config.name - Sahne adı
   * @param {number} config.duration - Sahne süresi (saniye)
   * @param {object} config.background - Arka plan { color, drawFn, image }
   */
  constructor(config) {
    this.name = config.name || 'Untitled Scene';
    this.duration = config.duration || 10;
    this.background = config.background || { color: '#87CEEB' };

    /** @type {Actor[]} Sahnedeki aktörler */
    this.actors = [];

    /** @type {TimelineEvent[]} Zamana bağlı olaylar */
    this.timeline = [];

    /** @type {object} Kamera durumu */
    this.camera = { x: 0, y: 0, zoom: 1, shake: 0 };

    /** @type {Particle[]} Parçacık efektleri (speed lines, toz bulutu vb.) */
    this.particles = [];

    /** @type {TextBubble[]} Konuşma balonları */
    this.textBubbles = [];

    this.time = 0;
    this.isPlaying = false;
  }

  /**
   * Sahneye aktör ekle
   * @param {string} id - Benzersiz aktör ID
   * @param {import('./PuppetAnimator.js').PuppetAnimator} animator
   * @param {object} position - { x, y }
   * @param {number} scale
   */
  addActor(id, animator, position, scale = 1) {
    this.actors.push({
      id,
      animator,
      position: { x: position?.x ?? 0, y: position?.y ?? 0 },
      scale: scale,
      velocity: { x: 0, y: 0 },
      visible: true,
      flipX: false,
    });
    return this;
  }

  /**
   * Timeline'a olay ekle
   * @param {number} time - Tetiklenme zamanı (saniye)
   * @param {string} type - Olay tipi
   * @param {object} data - Olay verisi
   */
  at(time, type, data) {
    this.timeline.push({
      time,
      type,
      data,
      fired: false,
    });
    // Zamana göre sırala
    this.timeline.sort((a, b) => a.time - b.time);
    return this;
  }

  /**
   * Sahneyi güncelle
   * @param {number} dt - Delta time (saniye)
   */
  update(dt) {
    this.time += dt;

    // Timeline olaylarını tetikle
    for (const event of this.timeline) {
      if (!event.fired && this.time >= event.time) {
        event.fired = true;
        this.executeEvent(event);
      }
    }

    // Aktör animasyonlarını güncelle
    for (const actor of this.actors) {
      actor.animator.update(dt);

      // Hareket (velocity)
      actor.position.x += actor.velocity.x * dt;
      actor.position.y += actor.velocity.y * dt;
    }

    // Parçacıkları güncelle
    this.updateParticles(dt);

    // Kamera sarsıntısı azalt
    if (this.camera.shake > 0) {
      this.camera.shake *= 0.9;
      if (this.camera.shake < 0.1) this.camera.shake = 0;
    }

    // Konuşma balonlarını güncelle
    this.textBubbles = this.textBubbles.filter(b => this.time < b.endTime);
  }

  /**
   * Timeline olayını çalıştır
   */
  executeEvent(event) {
    const { type, data } = event;
    const actor = data.actorId ? this.actors.find(a => a.id === data.actorId) : null;

    switch (type) {
      case 'move': {
        if (!actor) break;
        // Lerp ile hedef pozisyona git
        const dx = data.targetX - actor.position.x;
        const dy = data.targetY - actor.position.y;
        const dur = data.duration || 1;
        actor.velocity.x = dx / dur;
        actor.velocity.y = dy / dur;
        // Dur komutu
        this.at(event.time + dur, 'stop', { actorId: data.actorId });
        // Yön ayarla
        if (dx < 0) actor.flipX = true;
        else if (dx > 0) actor.flipX = false;
        break;
      }
      case 'stop': {
        if (!actor) break;
        actor.velocity.x = 0;
        actor.velocity.y = 0;
        break;
      }
      case 'expression': {
        if (!actor) break;
        actor.animator.sheet.setExpression(data.expression);
        break;
      }
      case 'animate': {
        if (!actor) break;
        if (data.preset) {
          this.applyPreset(actor, data.preset, data);
        }
        break;
      }
      case 'squash': {
        if (!actor) break;
        actor.animator.squashStretch(data.partName || 'body', {
          amount: data.amount || 0.2,
          duration: data.duration || 0.3,
        });
        break;
      }
      case 'talk': {
        this.textBubbles.push({
          actorId: data.actorId,
          text: data.text,
          endTime: event.time + (data.duration || 3),
          style: data.style || 'speech',
        });
        // Konuşma animasyonu
        if (actor) {
          actor.animator.sheet.setExpression('talking');
          this.at(event.time + (data.duration || 3), 'expression', {
            actorId: data.actorId,
            expression: 'idle',
          });
        }
        break;
      }
      case 'camera_shake': {
        this.camera.shake = data.intensity || 5;
        break;
      }
      case 'camera_zoom': {
        this.camera.zoom = data.zoom || 1;
        break;
      }
      case 'particles': {
        this.spawnParticles(data);
        break;
      }
      case 'flip': {
        if (!actor) break;
        actor.flipX = data.flipX ?? !actor.flipX;
        break;
      }
      case 'visible': {
        if (!actor) break;
        actor.visible = data.visible ?? true;
        break;
      }
    }
  }

  /**
   * Hazır animasyon presetleri
   */
  applyPreset(actor, preset, data) {
    const anim = actor.animator;
    switch (preset) {
      case 'walk': {
        // Bacak sallanması
        anim.oscillate('leftLeg', 'rotation', {
          amplitude: 0.4, frequency: 2, duration: data.duration || 2,
        });
        anim.oscillate('rightLeg', 'rotation', {
          amplitude: 0.4, frequency: 2, phase: Math.PI, duration: data.duration || 2,
        });
        // Kol sallanması
        anim.oscillate('leftArm', 'rotation', {
          amplitude: 0.3, frequency: 2, phase: Math.PI, duration: data.duration || 2,
        });
        anim.oscillate('rightArm', 'rotation', {
          amplitude: 0.3, frequency: 2, duration: data.duration || 2,
        });
        // Hafif nefes
        anim.oscillate('body', 'scaleY', {
          center: 1, amplitude: 0.02, frequency: 2, duration: data.duration || 2,
        });
        break;
      }
      case 'run': {
        anim.oscillate('leftLeg', 'rotation', {
          amplitude: 0.7, frequency: 4, duration: data.duration || 2,
        });
        anim.oscillate('rightLeg', 'rotation', {
          amplitude: 0.7, frequency: 4, phase: Math.PI, duration: data.duration || 2,
        });
        anim.oscillate('leftArm', 'rotation', {
          amplitude: 0.5, frequency: 4, phase: Math.PI, duration: data.duration || 2,
        });
        anim.oscillate('rightArm', 'rotation', {
          amplitude: 0.5, frequency: 4, duration: data.duration || 2,
        });
        anim.oscillate('body', 'offsetY', {
          center: 0, amplitude: -5, frequency: 4, duration: data.duration || 2,
        });
        break;
      }
      case 'jump': {
        anim.squashStretch('body', { amount: 0.3, duration: 0.2 });
        anim.animate('body', 'offsetY', {
          from: 0, to: -80, duration: 0.3, easing: 'easeOut',
        });
        anim.animate('body', 'offsetY', {
          from: -80, to: 0, duration: 0.3, delay: 0.3, easing: 'easeIn',
        });
        break;
      }
      case 'idle': {
        anim.oscillate('body', 'scaleY', {
          center: 1, amplitude: 0.015, frequency: 0.8, duration: Infinity,
        });
        anim.oscillate('body', 'offsetY', {
          center: 0, amplitude: 2, frequency: 0.8, duration: Infinity,
        });
        break;
      }
      case 'wave': {
        anim.oscillate('rightArm', 'rotation', {
          center: -1.2, amplitude: 0.4, frequency: 3, duration: data.duration || 1.5,
        });
        break;
      }
      case 'nod': {
        anim.oscillate('head', 'rotation', {
          center: 0, amplitude: 0.15, frequency: 2, duration: data.duration || 1,
        });
        break;
      }
    }
  }

  /**
   * Parçacık oluştur (speed lines, toz bulutu, yıldız vb.)
   */
  spawnParticles(data) {
    const count = data.count || 10;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: data.x ?? 0,
        y: data.y ?? 0,
        vx: (Math.random() - 0.5) * (data.speed || 100),
        vy: (Math.random() - 0.5) * (data.speed || 100),
        life: data.life || 1,
        maxLife: data.life || 1,
        size: data.size || 3,
        color: data.color || '#FFD700',
        type: data.particleType || 'circle',
      });
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vy += (p.type === 'dust' ? -20 : 50) * dt; // gravity or float
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  /**
   * Sahneyi canvas'a çiz
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   */
  render(ctx, width, height) {
    ctx.save();

    // Arka plan
    if (this.background.color) {
      ctx.fillStyle = this.background.color;
      ctx.fillRect(0, 0, width, height);
    }
    if (this.background.drawFn) {
      this.background.drawFn(ctx, width, height, this.time);
    }

    // Kamera transform
    const shakeX = this.camera.shake * (Math.random() - 0.5) * 2;
    const shakeY = this.camera.shake * (Math.random() - 0.5) * 2;
    ctx.translate(width / 2 + shakeX, height / 2 + shakeY);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-width / 2 - this.camera.x, -height / 2 - this.camera.y);

    // Aktörleri çiz
    for (const actor of this.actors) {
      if (!actor.visible) continue;
      ctx.save();
      if (actor.flipX) {
        ctx.translate(actor.position.x, actor.position.y);
        ctx.scale(-1, 1);
        actor.animator.draw(ctx, 0, 0, actor.scale);
      } else {
        actor.animator.draw(ctx, actor.position.x, actor.position.y, actor.scale);
      }
      ctx.restore();
    }

    // Parçacıklar
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      if (p.type === 'speedline') {
        ctx.fillRect(p.x, p.y, 20, 2);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Konuşma balonları
    for (const bubble of this.textBubbles) {
      const actor = this.actors.find(a => a.id === bubble.actorId);
      if (!actor) continue;
      this.drawBubble(ctx, actor, bubble);
    }

    ctx.restore();
  }

  /**
   * Konuşma balonu çiz
   */
  drawBubble(ctx, actor, bubble) {
    const bx = actor.position.x;
    const by = actor.position.y - 120 * actor.scale;
    const padding = 12;
    const maxWidth = 200;

    ctx.save();
    ctx.font = 'bold 16px Comic Sans MS, cursive';
    ctx.textAlign = 'center';

    // Metin ölç
    const lines = this.wrapText(ctx, bubble.text, maxWidth - padding * 2);
    const textHeight = lines.length * 20;
    const boxWidth = Math.min(maxWidth, Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2);
    const boxHeight = textHeight + padding * 2;

    // Balon
    ctx.fillStyle = bubble.style === 'thought' ? '#F0F0FF' : '#FFFFFF';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.roundRect(ctx, bx - boxWidth / 2, by - boxHeight, boxWidth, boxHeight, 10);
    ctx.fill();
    ctx.stroke();

    // Kuyruk (üçgen)
    ctx.beginPath();
    ctx.moveTo(bx - 8, by);
    ctx.lineTo(bx + 8, by);
    ctx.lineTo(bx, by + 15);
    ctx.closePath();
    ctx.fillStyle = bubble.style === 'thought' ? '#F0F0FF' : '#FFFFFF';
    ctx.fill();

    // Metin
    ctx.fillStyle = '#333';
    lines.forEach((line, i) => {
      ctx.fillText(line, bx, by - boxHeight + padding + 16 + i * 20);
    });

    ctx.restore();
  }

  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  }

  /**
   * Sahne bitti mi?
   */
  isFinished() {
    return this.time >= this.duration;
  }

  /**
   * Sahneyi baştan al
   */
  resetScene() {
    this.time = 0;
    this.particles = [];
    this.textBubbles = [];
    for (const event of this.timeline) {
      event.fired = false;
    }
    for (const actor of this.actors) {
      actor.animator.reset();
      actor.velocity = { x: 0, y: 0 };
    }
  }
}
