/**
 * AnimatorAgent - Animatör Ajan
 *
 * Senarist ajanın çıktısını alır, her sahne için hareket kodunu üretir.
 * Scene nesnelerine timeline event'leri ekler.
 */
import { Scene } from '../engine/Scene.js';
import { PuppetAnimator } from '../engine/PuppetAnimator.js';

export class AnimatorAgent {
  constructor(config = {}) {
    this.defaultFps = config.fps || 24;
    this.canvasWidth = config.width || 1280;
    this.canvasHeight = config.height || 720;
  }

  /**
   * Senaryo sahnesini Scene nesnesine dönüştür
   * @param {object} sceneScript - Senarist ajanın sahne çıktısı
   * @param {Map<string, import('../engine/CharacterSheet.js').CharacterSheet>} characterSheets
   * @returns {Scene}
   */
  buildScene(sceneScript, characterSheets) {
    const scene = new Scene({
      name: sceneScript.name,
      duration: sceneScript.duration,
      background: {
        color: sceneScript.background?.color || '#87CEEB',
        drawFn: this.getBackgroundDrawFn(sceneScript.background?.type),
      },
    });

    // Aktörleri ekle
    const actorPositions = this.calculateActorPositions(
      [...characterSheets.keys()],
      this.canvasWidth,
      this.canvasHeight
    );

    for (const [charName, sheet] of characterSheets) {
      const animator = new PuppetAnimator(sheet);
      const pos = actorPositions.get(charName) || { x: this.canvasWidth / 2, y: this.canvasHeight * 0.65 };
      scene.addActor(charName, animator, pos, 1.5);
    }

    // Senaryo event'lerini Scene timeline'ına ekle
    if (sceneScript.events) {
      for (const event of sceneScript.events) {
        scene.at(event.time, event.type, {
          actorId: event.actorId,
          ...event,
        });
      }
    }

    return scene;
  }

  /**
   * Tam bir bölümün tüm sahnelerini oluştur
   * @param {object} episode - Senarist ajanın bölüm çıktısı
   * @param {Map<string, import('../engine/CharacterSheet.js').CharacterSheet>} characterSheets
   * @returns {Scene[]}
   */
  buildEpisode(episode, characterSheets) {
    return episode.scenes.map(sceneScript => this.buildScene(sceneScript, characterSheets));
  }

  /**
   * Aktör başlangıç pozisyonlarını hesapla
   */
  calculateActorPositions(charNames, width, height) {
    const positions = new Map();
    const count = charNames.length;
    const spacing = width / (count + 1);

    charNames.forEach((name, i) => {
      positions.set(name, {
        x: spacing * (i + 1),
        y: height * 0.65,
      });
    });

    return positions;
  }

  /**
   * Arka plan çizim fonksiyonu üret
   */
  getBackgroundDrawFn(type) {
    switch (type) {
      case 'lake':
        return (ctx, w, h, time) => {
          // Gökyüzü gradyan
          const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
          skyGrad.addColorStop(0, '#87CEEB');
          skyGrad.addColorStop(1, '#B0E0E6');
          ctx.fillStyle = skyGrad;
          ctx.fillRect(0, 0, w, h * 0.6);

          // Güneş
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(w * 0.85, h * 0.15, 40, 0, Math.PI * 2);
          ctx.fill();

          // Bulutlar
          ctx.fillStyle = '#FFF';
          this.drawCloud(ctx, w * 0.2, h * 0.12, 50);
          this.drawCloud(ctx, w * 0.6, h * 0.08, 40);

          // Çim/zemin
          ctx.fillStyle = '#4CAF50';
          ctx.fillRect(0, h * 0.55, w, h * 0.15);

          // Göl
          const waterGrad = ctx.createLinearGradient(0, h * 0.65, 0, h);
          waterGrad.addColorStop(0, '#4A90D9');
          waterGrad.addColorStop(1, '#2E6CB5');
          ctx.fillStyle = waterGrad;
          ctx.fillRect(0, h * 0.65, w, h * 0.35);

          // Su dalgaları
          ctx.strokeStyle = '#6BB3E0';
          ctx.lineWidth = 1.5;
          for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            const baseY = h * 0.7 + i * 18;
            for (let x = 0; x < w; x += 5) {
              const y = baseY + Math.sin((x + time * 80 + i * 50) * 0.02) * 4;
              x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        };

      case 'field':
        return (ctx, w, h) => {
          // Gökyüzü
          ctx.fillStyle = '#87CEEB';
          ctx.fillRect(0, 0, w, h * 0.5);
          // Çim
          const grassGrad = ctx.createLinearGradient(0, h * 0.4, 0, h);
          grassGrad.addColorStop(0, '#4CAF50');
          grassGrad.addColorStop(1, '#2E7D32');
          ctx.fillStyle = grassGrad;
          ctx.fillRect(0, h * 0.4, w, h * 0.6);
          // Çizgiler (futbol sahası)
          ctx.strokeStyle = '#FFF';
          ctx.lineWidth = 3;
          ctx.strokeRect(w * 0.1, h * 0.45, w * 0.8, h * 0.5);
          ctx.beginPath();
          ctx.moveTo(w / 2, h * 0.45);
          ctx.lineTo(w / 2, h * 0.95);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(w / 2, h * 0.7, 50, 0, Math.PI * 2);
          ctx.stroke();
        };

      case 'park':
        return (ctx, w, h, time) => {
          // Gökyüzü
          ctx.fillStyle = '#87CEEB';
          ctx.fillRect(0, 0, w, h * 0.55);
          // Güneş
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(w * 0.8, h * 0.12, 35, 0, Math.PI * 2);
          ctx.fill();
          // Bulutlar
          ctx.fillStyle = '#FFF';
          this.drawCloud(ctx, (w * 0.3 + time * 5) % (w + 100) - 50, h * 0.1, 45);
          this.drawCloud(ctx, (w * 0.7 + time * 3) % (w + 100) - 50, h * 0.15, 35);
          // Çim
          ctx.fillStyle = '#4CAF50';
          ctx.fillRect(0, h * 0.5, w, h * 0.5);
          // Ağaçlar
          this.drawTree(ctx, w * 0.1, h * 0.5, 0.8);
          this.drawTree(ctx, w * 0.9, h * 0.5, 1);
          // Çiçekler
          const flowerColors = ['#FF6B81', '#FFD700', '#FF69B4', '#9B59B6'];
          for (let i = 0; i < 8; i++) {
            ctx.fillStyle = flowerColors[i % flowerColors.length];
            const fx = w * 0.15 + i * w * 0.1;
            const fy = h * 0.85 + Math.sin(i * 1.5) * 15;
            ctx.beginPath();
            ctx.arc(fx, fy, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          // Patika
          ctx.fillStyle = '#D4A574';
          ctx.beginPath();
          ctx.moveTo(w * 0.35, h);
          ctx.quadraticCurveTo(w * 0.5, h * 0.7, w * 0.65, h);
          ctx.lineTo(w * 0.6, h);
          ctx.quadraticCurveTo(w * 0.5, h * 0.72, w * 0.4, h);
          ctx.closePath();
          ctx.fill();
        };

      case 'school':
        return (ctx, w, h) => {
          ctx.fillStyle = '#FFF8DC';
          ctx.fillRect(0, 0, w, h);
          // Tahta
          ctx.fillStyle = '#2E7D32';
          ctx.fillRect(w * 0.15, h * 0.05, w * 0.7, h * 0.4);
          ctx.strokeStyle = '#8B4513';
          ctx.lineWidth = 5;
          ctx.strokeRect(w * 0.15, h * 0.05, w * 0.7, h * 0.4);
          // Zemin
          ctx.fillStyle = '#D4A574';
          ctx.fillRect(0, h * 0.55, w, h * 0.45);
        };

      case 'forest':
        return (ctx, w, h) => {
          ctx.fillStyle = '#2E8B57';
          ctx.fillRect(0, 0, w, h);
          // Ağaçlar arka plan
          for (let i = 0; i < 6; i++) {
            this.drawTree(ctx, w * 0.1 + i * w * 0.16, h * 0.35, 1.2 + Math.random() * 0.3);
          }
          // Zemin
          ctx.fillStyle = '#1B5E20';
          ctx.fillRect(0, h * 0.65, w, h * 0.35);
        };

      case 'beach':
        return (ctx, w, h, time) => {
          // Gökyüzü
          ctx.fillStyle = '#87CEEB';
          ctx.fillRect(0, 0, w, h * 0.4);
          // Güneş
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(w * 0.8, h * 0.1, 45, 0, Math.PI * 2);
          ctx.fill();
          // Deniz
          const seaGrad = ctx.createLinearGradient(0, h * 0.35, 0, h * 0.6);
          seaGrad.addColorStop(0, '#00CED1');
          seaGrad.addColorStop(1, '#4A90D9');
          ctx.fillStyle = seaGrad;
          ctx.fillRect(0, h * 0.35, w, h * 0.25);
          // Kum
          ctx.fillStyle = '#F4D03F';
          ctx.fillRect(0, h * 0.55, w, h * 0.45);
          // Dalgalar
          ctx.strokeStyle = '#FFF';
          ctx.lineWidth = 2;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            const baseY = h * 0.55 + i * 8;
            for (let x = 0; x < w; x += 5) {
              const y = baseY + Math.sin((x + time * 60 + i * 40) * 0.03) * 3;
              x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        };

      case 'home':
        return (ctx, w, h) => {
          // Duvar
          ctx.fillStyle = '#FAEBD7';
          ctx.fillRect(0, 0, w, h);
          // Zemin
          ctx.fillStyle = '#D2B48C';
          ctx.fillRect(0, h * 0.7, w, h * 0.3);
          // Pencere
          ctx.fillStyle = '#87CEEB';
          ctx.fillRect(w * 0.65, h * 0.1, w * 0.2, h * 0.25);
          ctx.strokeStyle = '#8B4513';
          ctx.lineWidth = 4;
          ctx.strokeRect(w * 0.65, h * 0.1, w * 0.2, h * 0.25);
          ctx.beginPath();
          ctx.moveTo(w * 0.75, h * 0.1);
          ctx.lineTo(w * 0.75, h * 0.35);
          ctx.moveTo(w * 0.65, h * 0.225);
          ctx.lineTo(w * 0.85, h * 0.225);
          ctx.stroke();
        };

      default:
        return (ctx, w, h) => {
          ctx.fillStyle = '#87CEEB';
          ctx.fillRect(0, 0, w, h * 0.5);
          ctx.fillStyle = '#4CAF50';
          ctx.fillRect(0, h * 0.5, w, h * 0.5);
        };
    }
  }

  drawCloud(ctx, x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y - size * 0.2, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y, size * 0.45, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y + size * 0.1, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  drawTree(ctx, x, y, scale) {
    // Gövde
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x - 8 * scale, y - 20 * scale, 16 * scale, 40 * scale);
    // Yapraklar
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.arc(x, y - 35 * scale, 30 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#388E3C';
    ctx.beginPath();
    ctx.arc(x - 12 * scale, y - 25 * scale, 22 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 12 * scale, y - 25 * scale, 22 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}
