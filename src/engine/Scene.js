/**
 * Scene v2 - Sahne gecisleri, akıllı balon, kamera pan/zoom,
 * gelismis parcacik sistemi, animasyon harmanlama.
 */
export class Scene {
  constructor(config) {
    this.name = config.name || 'Untitled Scene';
    this.duration = config.duration || 10;
    this.background = config.background || { color: '#87CEEB' };

    this.actors = [];
    this.timeline = [];
    this.camera = {
      x: 0, y: 0, zoom: 1, shake: 0,
      targetX: 0, targetY: 0, targetZoom: 1,
      panSpeed: 2, zoomSpeed: 2,
    };
    this.particles = [];
    this.textBubbles = [];

    this.transition = {
      fadeIn: config.fadeIn ?? 0.8,
      fadeOut: config.fadeOut ?? 0.8,
    };

    this.time = 0;
    this.isPlaying = false;
  }

  addActor(id, animator, position, scale = 1) {
    this.actors.push({
      id,
      animator,
      position: { x: position?.x ?? 0, y: position?.y ?? 0 },
      startPosition: { x: position?.x ?? 0, y: position?.y ?? 0 },
      scale,
      velocity: { x: 0, y: 0 },
      visible: true,
      flipX: false,
    });
    return this;
  }

  at(time, type, data) {
    this.timeline.push({ time, type, data, fired: false });
    this.timeline.sort((a, b) => a.time - b.time);
    return this;
  }

  update(dt) {
    this.time += dt;

    for (const event of this.timeline) {
      if (!event.fired && this.time >= event.time) {
        event.fired = true;
        this.executeEvent(event);
      }
    }

    for (const actor of this.actors) {
      actor.animator.update(dt);
      actor.position.x += actor.velocity.x * dt;
      actor.position.y += actor.velocity.y * dt;
    }

    this.updateCamera(dt);
    this.updateParticles(dt);

    if (this.camera.shake > 0) {
      this.camera.shake *= 0.9;
      if (this.camera.shake < 0.1) this.camera.shake = 0;
    }

    this.textBubbles = this.textBubbles.filter(b => this.time < b.endTime);
  }

  updateCamera(dt) {
    const lerp = (a, b, t) => a + (b - a) * Math.min(t, 1);
    this.camera.x = lerp(this.camera.x, this.camera.targetX, this.camera.panSpeed * dt);
    this.camera.y = lerp(this.camera.y, this.camera.targetY, this.camera.panSpeed * dt);
    this.camera.zoom = lerp(this.camera.zoom, this.camera.targetZoom, this.camera.zoomSpeed * dt);
  }

  executeEvent(event) {
    const { type, data } = event;
    const actor = data.actorId ? this.actors.find(a => a.id === data.actorId) : null;

    switch (type) {
      case 'move': {
        if (!actor) break;
        const dx = data.targetX - actor.position.x;
        const dy = (data.targetY ?? actor.position.y) - actor.position.y;
        const dur = data.duration || 1;
        actor.velocity.x = dx / dur;
        actor.velocity.y = dy / dur;
        this.at(event.time + dur, 'stop', { actorId: data.actorId });
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
        if (data.preset) this.applyPreset(actor, data.preset, data);
        break;
      }
      case 'squash': {
        if (!actor) break;
        actor.animator.squashStretch(data.partName || 'body', {
          amount: data.amount || 0.2, duration: data.duration || 0.3,
        });
        break;
      }
      case 'talk': {
        this.textBubbles.push({
          actorId: data.actorId,
          text: data.text,
          endTime: event.time + (data.duration || 3),
          style: data.style || 'speech',
          startTime: event.time,
        });
        if (actor) {
          actor.animator.sheet.setExpression('talking');
          this.at(event.time + (data.duration || 3), 'expression', {
            actorId: data.actorId, expression: 'idle',
          });
        }
        break;
      }
      case 'camera_shake': {
        this.camera.shake = data.intensity || 5;
        break;
      }
      case 'camera_zoom': {
        this.camera.targetZoom = data.zoom ?? 1;
        this.camera.zoomSpeed = data.speed ?? 2;
        break;
      }
      case 'camera_pan': {
        this.camera.targetX = data.x ?? this.camera.targetX;
        this.camera.targetY = data.y ?? this.camera.targetY;
        this.camera.panSpeed = data.speed ?? 2;
        break;
      }
      case 'camera_focus': {
        if (!actor) break;
        this.camera.targetX = actor.position.x - 640;
        this.camera.targetY = actor.position.y - 360;
        this.camera.targetZoom = data.zoom ?? 1.3;
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

  applyPreset(actor, preset, data) {
    const anim = actor.animator;
    switch (preset) {
      case 'walk': {
        const dur = data.duration || 2;
        anim.oscillate('leftLeg', 'rotation', { amplitude: 0.4, frequency: 2, duration: dur });
        anim.oscillate('rightLeg', 'rotation', { amplitude: 0.4, frequency: 2, phase: Math.PI, duration: dur });
        anim.oscillate('leftArm', 'rotation', { amplitude: 0.3, frequency: 2, phase: Math.PI, duration: dur });
        anim.oscillate('rightArm', 'rotation', { amplitude: 0.3, frequency: 2, duration: dur });
        anim.oscillate('body', 'scaleY', { center: 1, amplitude: 0.02, frequency: 2, duration: dur });
        anim.oscillate('tail', 'rotation', { amplitude: 0.3, frequency: 1.5, duration: dur });
        break;
      }
      case 'run': {
        const dur = data.duration || 2;
        anim.oscillate('leftLeg', 'rotation', { amplitude: 0.7, frequency: 4, duration: dur });
        anim.oscillate('rightLeg', 'rotation', { amplitude: 0.7, frequency: 4, phase: Math.PI, duration: dur });
        anim.oscillate('leftArm', 'rotation', { amplitude: 0.5, frequency: 4, phase: Math.PI, duration: dur });
        anim.oscillate('rightArm', 'rotation', { amplitude: 0.5, frequency: 4, duration: dur });
        anim.oscillate('body', 'offsetY', { center: 0, amplitude: -5, frequency: 4, duration: dur });
        anim.oscillate('tail', 'rotation', { amplitude: 0.5, frequency: 3, duration: dur });
        break;
      }
      case 'jump': {
        anim.squashStretch('body', { amount: 0.3, duration: 0.2 });
        anim.animate('body', 'offsetY', { from: 0, to: -80, duration: 0.3, easing: 'easeOut' });
        anim.animate('body', 'offsetY', { from: -80, to: 0, duration: 0.3, delay: 0.3, easing: 'bounce' });
        anim.animate('leftArm', 'rotation', { from: 0, to: -0.8, duration: 0.2, easing: 'easeOut' });
        anim.animate('rightArm', 'rotation', { from: 0, to: -0.8, duration: 0.2, easing: 'easeOut' });
        anim.animate('leftArm', 'rotation', { from: -0.8, to: 0, duration: 0.3, delay: 0.4, easing: 'easeIn' });
        anim.animate('rightArm', 'rotation', { from: -0.8, to: 0, duration: 0.3, delay: 0.4, easing: 'easeIn' });
        break;
      }
      case 'idle': {
        anim.oscillate('body', 'scaleY', { center: 1, amplitude: 0.015, frequency: 0.8, duration: Infinity });
        anim.oscillate('body', 'offsetY', { center: 0, amplitude: 2, frequency: 0.8, duration: Infinity });
        anim.oscillate('tail', 'rotation', { amplitude: 0.15, frequency: 0.5, duration: Infinity });
        break;
      }
      case 'wave': {
        anim.oscillate('rightArm', 'rotation', { center: -1.2, amplitude: 0.4, frequency: 3, duration: data.duration || 1.5 });
        break;
      }
      case 'nod': {
        anim.oscillate('head', 'rotation', { center: 0, amplitude: 0.15, frequency: 2, duration: data.duration || 1 });
        break;
      }
      case 'celebrate': {
        const dur = data.duration || 2;
        anim.oscillate('body', 'offsetY', { center: 0, amplitude: -15, frequency: 3, duration: dur });
        anim.oscillate('leftArm', 'rotation', { center: -1, amplitude: 0.3, frequency: 4, duration: dur });
        anim.oscillate('rightArm', 'rotation', { center: -1, amplitude: 0.3, frequency: 4, phase: Math.PI, duration: dur });
        anim.oscillate('body', 'scaleX', { center: 1, amplitude: 0.05, frequency: 3, duration: dur });
        break;
      }
      case 'think': {
        anim.animate('head', 'rotation', { from: 0, to: 0.15, duration: 0.5, easing: 'easeInOut' });
        anim.animate('rightArm', 'rotation', { from: 0, to: -1.5, duration: 0.5, easing: 'easeInOut' });
        break;
      }
      case 'scared': {
        const dur = data.duration || 1.5;
        anim.oscillate('body', 'offsetX', { center: 0, amplitude: 3, frequency: 8, duration: dur });
        anim.squashStretch('body', { amount: 0.15, duration: 0.2 });
        break;
      }
    }
  }

  spawnParticles(data) {
    const count = data.count || 10;
    const type = data.particleType || 'circle';
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.5;
      const speed = (data.speed || 100) * (0.5 + Math.random() * 0.5);
      this.particles.push({
        x: (data.x ?? 0) + (Math.random() - 0.5) * 20,
        y: (data.y ?? 0) + (Math.random() - 0.5) * 20,
        vx: type === 'confetti' ? (Math.random() - 0.5) * speed : Math.cos(angle) * speed,
        vy: type === 'confetti' ? -speed * (0.5 + Math.random()) : Math.sin(angle) * speed,
        life: (data.life || 1) * (0.7 + Math.random() * 0.6),
        maxLife: data.life || 1,
        size: (data.size || 3) * (0.5 + Math.random()),
        color: data.color || ['#FFD700', '#FF6B81', '#4A90D9', '#2ECC40'][i % 4],
        type,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }
  }

  updateParticles(dt) {
    let i = this.particles.length;
    while (i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.rotation += (p.rotationSpeed || 0) * dt;
      if (p.type === 'confetti') { p.vy += 120 * dt; p.vx *= 0.98; }
      else if (p.type === 'dust') { p.vy -= 30 * dt; p.vx *= 0.95; }
      else if (p.type === 'sparkle') { p.vx *= 0.96; p.vy *= 0.96; }
      else if (p.type === 'speedline') { p.vy *= 0.5; }
      else { p.vy += 60 * dt; }
      if (p.life <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }
  }

  render(ctx, width, height) {
    ctx.save();

    // Fade hesapla
    let fadeAlpha = 1;
    if (this.transition.fadeIn > 0 && this.time < this.transition.fadeIn) {
      fadeAlpha = this.time / this.transition.fadeIn;
    }
    if (this.transition.fadeOut > 0 && this.time > this.duration - this.transition.fadeOut) {
      fadeAlpha = Math.max(0, (this.duration - this.time) / this.transition.fadeOut);
    }

    // Arka plan
    if (this.background.color) {
      ctx.fillStyle = this.background.color;
      ctx.fillRect(0, 0, width, height);
    }
    if (this.background.drawFn) {
      this.background.drawFn(ctx, width, height, this.time);
    }

    // Kamera
    const shakeX = this.camera.shake * (Math.random() - 0.5) * 2;
    const shakeY = this.camera.shake * (Math.random() - 0.5) * 2;
    ctx.translate(width / 2 + shakeX, height / 2 + shakeY);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-width / 2 - this.camera.x, -height / 2 - this.camera.y);

    // Aktorler - flip duzeltilmis
    for (const actor of this.actors) {
      if (!actor.visible) continue;
      ctx.save();
      if (actor.flipX) {
        ctx.translate(actor.position.x, 0);
        ctx.scale(-1, 1);
        ctx.translate(-actor.position.x, 0);
      }
      actor.animator.draw(ctx, actor.position.x, actor.position.y, actor.scale);
      ctx.restore();
    }

    // Parcaciklar
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      if (alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.type === 'speedline') {
        ctx.translate(p.x, p.y);
        ctx.fillRect(0, -1, 30 * alpha, 2);
      } else if (p.type === 'confetti') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
      } else if (p.type === 'sparkle') {
        const sz = p.size * alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.beginPath();
        ctx.moveTo(0, -sz); ctx.lineTo(sz * 0.3, -sz * 0.3);
        ctx.lineTo(sz, 0); ctx.lineTo(sz * 0.3, sz * 0.3);
        ctx.lineTo(0, sz); ctx.lineTo(-sz * 0.3, sz * 0.3);
        ctx.lineTo(-sz, 0); ctx.lineTo(-sz * 0.3, -sz * 0.3);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Konusma balonlari
    for (const bubble of this.textBubbles) {
      const actor = this.actors.find(a => a.id === bubble.actorId);
      if (!actor) continue;
      this.drawBubble(ctx, actor, bubble, width, height);
    }

    ctx.restore();

    // Fade overlay
    if (fadeAlpha < 1) {
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.globalAlpha = 1 - fadeAlpha;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  drawBubble(ctx, actor, bubble, canvasW, canvasH) {
    const padding = 14;
    const maxWidth = 220;
    const lineHeight = 22;

    ctx.save();
    ctx.font = 'bold 16px "Comic Sans MS", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';

    const lines = this.wrapText(ctx, bubble.text, maxWidth - padding * 2);
    const textHeight = lines.length * lineHeight;
    const boxWidth = Math.min(maxWidth, Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2);
    const boxHeight = textHeight + padding * 2;

    let bx = actor.position.x;
    let by = actor.position.y - 130 * actor.scale;

    // Ekran siniri kontrolu
    if (by - boxHeight < 10) by = boxHeight + 15;
    if (bx - boxWidth / 2 < 10) bx = boxWidth / 2 + 10;
    if (bx + boxWidth / 2 > canvasW - 10) bx = canvasW - boxWidth / 2 - 10;

    // Pop-in animasyonu
    const age = this.time - bubble.startTime;
    const popIn = Math.min(age / 0.2, 1);
    const eased = popIn < 1 ? 1 - Math.pow(1 - popIn, 3) : 1;
    ctx.globalAlpha = eased;

    // Golge
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    const isThought = bubble.style === 'thought';
    ctx.fillStyle = isThought ? '#F0F0FF' : '#FFFFFF';
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    this.roundRect(ctx, bx - boxWidth / 2, by - boxHeight, boxWidth, boxHeight, 12);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Kuyruk
    ctx.fillStyle = isThought ? '#F0F0FF' : '#FFFFFF';
    if (isThought) {
      ctx.beginPath(); ctx.arc(bx, by + 5, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx + 3, by + 12, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(bx - 8, by);
      ctx.lineTo(bx + 4, by);
      ctx.lineTo(bx - 2, by + 14);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#333';
    lines.forEach((line, i) => {
      ctx.fillText(line, bx, by - boxHeight + padding + 17 + i * lineHeight);
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

  isFinished() { return this.time >= this.duration; }

  resetScene() {
    this.time = 0;
    this.particles = [];
    this.textBubbles = [];
    this.camera = { ...this.camera, x: 0, y: 0, zoom: 1, targetX: 0, targetY: 0, targetZoom: 1, shake: 0 };
    for (const event of this.timeline) event.fired = false;
    for (const actor of this.actors) {
      actor.animator.reset();
      actor.velocity = { x: 0, y: 0 };
      actor.position = { ...actor.startPosition };
      actor.flipX = false;
    }
  }
}
