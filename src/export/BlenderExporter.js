/**
 * BlenderExporter - Sahne verisini Blender Python scriptine donusturur
 *
 * Bizim pipeline:
 *   ScriptWriter → AnimatorAgent → Scene verileri
 *                                      ↓
 *                              BlenderExporter
 *                                      ↓
 *                              scene_export.py (Blender scripti)
 *                                      ↓
 *                              Blender'da ac → 3D render
 *
 * Kullanim:
 *   1. node src/export/export-to-blender.js "Ökkeş Balık Avında"
 *   2. Blender'da: File → Scripting → scene_export.py calistir
 *   3. Render → Animation
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export class BlenderExporter {
  constructor(config = {}) {
    this.outputDir = config.outputDir || './output/blender';
    this.fps = config.fps || 24;
    this.width = config.width || 1920;
    this.height = config.height || 1080;
    this.sceneScale = config.sceneScale || 0.01; // piksel → Blender birim
  }

  /**
   * Tam bolum verisini Blender Python scriptine donustur
   *
   * @param {object} episode - ScriptWriter ciktisi
   * @param {object[]} characters - Karakter tanimlari
   * @returns {string} Python script dosya yolu
   */
  exportEpisode(episode, characters) {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }

    const lines = [];

    // Header
    lines.push(...this.generateHeader(episode));

    // Sahne ayarlari
    lines.push(...this.generateSceneSetup());

    // Karakterler
    for (const char of characters) {
      lines.push(...this.generateCharacterSetup(char));
    }

    // Sahneler ve animasyonlar
    let frameOffset = 0;
    for (let i = 0; i < episode.scenes.length; i++) {
      const scene = episode.scenes[i];
      lines.push('');
      lines.push(`# ═══ SAHNE ${i + 1}: ${scene.name} ═══`);
      lines.push(...this.generateSceneAnimations(scene, characters, frameOffset));

      // Arka plan
      lines.push(...this.generateBackground(scene, frameOffset));

      frameOffset += scene.duration * this.fps;
    }

    // Kamera ayarlari
    lines.push(...this.generateCameraSetup(episode));

    // Render ayarlari
    lines.push(...this.generateRenderSettings(episode, frameOffset));

    // Subtitle / diyalog marker
    lines.push(...this.generateSubtitleMarkers(episode));

    // Footer
    lines.push('');
    lines.push('print("═" * 60)');
    lines.push(`print("✓ Blender sahne kurulumu tamamlandı!")`);
    lines.push(`print(f"  Toplam frame: {${frameOffset}}")`);
    lines.push(`print(f"  FPS: ${this.fps}")`);
    lines.push(`print(f"  Süre: {${frameOffset} / ${this.fps}:.1f} saniye")`);
    lines.push(`print("  Render: Render → Render Animation (Ctrl+F12)")`);
    lines.push('print("═" * 60)');

    const script = lines.join('\n');
    const scriptPath = join(this.outputDir, `${this.sanitize(episode.title)}.py`);
    writeFileSync(scriptPath, script);

    // Ayrica JSON veri dosyasi
    const dataPath = join(this.outputDir, `${this.sanitize(episode.title)}_data.json`);
    writeFileSync(dataPath, JSON.stringify({
      episode,
      characters,
      settings: { fps: this.fps, width: this.width, height: this.height },
      exportedAt: new Date().toISOString(),
    }, null, 2));

    console.log(`\n📦 Blender export tamamlandı:`);
    console.log(`   Script: ${scriptPath}`);
    console.log(`   Data:   ${dataPath}`);
    console.log(`\n   Kullanım:`);
    console.log(`   1. Blender'ı aç`);
    console.log(`   2. Scripting sekmesine geç`);
    console.log(`   3. ${scriptPath} dosyasını aç ve çalıştır`);
    console.log(`   4. 3D modelleri placeholder küplerin yerine yerleştir`);
    console.log(`   5. Render → Render Animation (Ctrl+F12)`);

    return scriptPath;
  }

  generateHeader(episode) {
    return [
      '"""',
      `Blender Scene Script: ${episode.title}`,
      `Otomatik üretildi: Cartoon Maker → Blender Export`,
      `Tarih: ${new Date().toISOString()}`,
      '',
      'Kullanım:',
      '  1. Blender\'da Scripting sekmesini aç',
      '  2. Bu scripti yapıştır ve çalıştır (Alt+P)',
      '  3. Placeholder objeleri kendi 3D modellerinle değiştir',
      '  4. Render → Render Animation',
      '"""',
      'import bpy',
      'import mathutils',
      'from math import radians, sin, cos, pi',
      '',
      '# Mevcut sahneyi temizle',
      'bpy.ops.object.select_all(action="SELECT")',
      'bpy.ops.object.delete(use_global=False)',
      '',
    ];
  }

  generateSceneSetup() {
    return [
      '# ═══ SAHNE AYARLARI ═══',
      `bpy.context.scene.render.fps = ${this.fps}`,
      `bpy.context.scene.render.resolution_x = ${this.width}`,
      `bpy.context.scene.render.resolution_y = ${this.height}`,
      'bpy.context.scene.render.engine = "EEVEE"  # Hızlı render',
      '',
      '# Dünya (gökyüzü)',
      'world = bpy.data.worlds.new("CartoonWorld")',
      'bpy.context.scene.world = world',
      'world.use_nodes = True',
      'bg_node = world.node_tree.nodes["Background"]',
      'bg_node.inputs[0].default_value = (0.53, 0.81, 0.92, 1)  # Açık mavi gökyüzü',
      '',
      '# Güneş ışığı',
      'bpy.ops.object.light_add(type="SUN", location=(5, -3, 10))',
      'sun = bpy.context.active_object',
      'sun.name = "Güneş"',
      'sun.data.energy = 3',
      'sun.data.color = (1, 0.95, 0.8)',
      '',
      '# Dolgu ışığı (gölgeleri yumuşat)',
      'bpy.ops.object.light_add(type="AREA", location=(-3, -5, 5))',
      'fill = bpy.context.active_object',
      'fill.name = "DolguIşık"',
      'fill.data.energy = 50',
      'fill.data.color = (0.8, 0.85, 1)',
      '',
    ];
  }

  generateCharacterSetup(charSpec) {
    const name = this.sanitize(charSpec.name);
    const colorHex = charSpec.bodyColor || '#FF8C42';
    const r = parseInt(colorHex.slice(1, 3), 16) / 255;
    const g = parseInt(colorHex.slice(3, 5), 16) / 255;
    const b = parseInt(colorHex.slice(5, 7), 16) / 255;

    const lines = [
      `# ─── KARAKTER: ${charSpec.name} ───`,
      '',
      `# Placeholder - bunu kendi 3D modelinle değiştir!`,
    ];

    // Karakter tipine göre placeholder
    switch (charSpec.type) {
      case 'cat':
        lines.push(
          `# Gövde`,
          `bpy.ops.mesh.primitive_uv_sphere_add(radius=0.5, location=(0, 0, 0.7))`,
          `body_${name} = bpy.context.active_object`,
          `body_${name}.name = "${charSpec.name}_body"`,
          `body_${name}.scale = (0.6, 0.4, 0.5)`,
          ``,
          `# Kafa`,
          `bpy.ops.mesh.primitive_uv_sphere_add(radius=0.35, location=(0, 0, 1.3))`,
          `head_${name} = bpy.context.active_object`,
          `head_${name}.name = "${charSpec.name}_head"`,
          `head_${name}.parent = body_${name}`,
          ``,
          `# Kulaklar`,
          `bpy.ops.mesh.primitive_cone_add(radius1=0.08, depth=0.2, location=(-0.15, 0, 1.6))`,
          `ear_l = bpy.context.active_object`,
          `ear_l.name = "${charSpec.name}_ear_L"`,
          `ear_l.parent = head_${name}`,
          `bpy.ops.mesh.primitive_cone_add(radius1=0.08, depth=0.2, location=(0.15, 0, 1.6))`,
          `ear_r = bpy.context.active_object`,
          `ear_r.name = "${charSpec.name}_ear_R"`,
          `ear_r.parent = head_${name}`,
          ``,
          `# Kuyruk`,
          `bpy.ops.curve.primitive_bezier_curve_add(location=(-0.5, 0, 0.7))`,
          `tail_${name} = bpy.context.active_object`,
          `tail_${name}.name = "${charSpec.name}_tail"`,
          `tail_${name}.parent = body_${name}`,
        );
        break;
      case 'bird':
        lines.push(
          `bpy.ops.mesh.primitive_uv_sphere_add(radius=0.3, location=(0, 0, 0.5))`,
          `body_${name} = bpy.context.active_object`,
          `body_${name}.name = "${charSpec.name}_body"`,
          `bpy.ops.mesh.primitive_uv_sphere_add(radius=0.2, location=(0, 0, 0.85))`,
          `head_${name} = bpy.context.active_object`,
          `head_${name}.name = "${charSpec.name}_head"`,
          `head_${name}.parent = body_${name}`,
        );
        break;
      default:
        lines.push(
          `bpy.ops.mesh.primitive_uv_sphere_add(radius=0.5, location=(0, 0, 0.7))`,
          `body_${name} = bpy.context.active_object`,
          `body_${name}.name = "${charSpec.name}_body"`,
          `bpy.ops.mesh.primitive_uv_sphere_add(radius=0.35, location=(0, 0, 1.3))`,
          `head_${name} = bpy.context.active_object`,
          `head_${name}.name = "${charSpec.name}_head"`,
          `head_${name}.parent = body_${name}`,
        );
    }

    // Materyal
    lines.push(
      ``,
      `# Materyal (cel-shading / cartoon look)`,
      `mat_${name} = bpy.data.materials.new(name="Mat_${charSpec.name}")`,
      `mat_${name}.use_nodes = True`,
      `bsdf = mat_${name}.node_tree.nodes["Principled BSDF"]`,
      `bsdf.inputs["Base Color"].default_value = (${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)}, 1)`,
      `bsdf.inputs["Roughness"].default_value = 0.9  # Mat görünüm`,
      `bsdf.inputs["Specular IOR Level"].default_value = 0.1`,
      `body_${name}.data.materials.append(mat_${name})`,
      `head_${name}.data.materials.append(mat_${name})`,
      ``,
      `# Empty parent (animasyon kontrolü için)`,
      `bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))`,
      `ctrl_${name} = bpy.context.active_object`,
      `ctrl_${name}.name = "${charSpec.name}_CTRL"`,
      `body_${name}.parent = ctrl_${name}`,
      ``,
    );

    return lines;
  }

  generateSceneAnimations(scene, characters, frameOffset) {
    const lines = [];
    if (!scene.events) return lines;

    for (const event of scene.events) {
      const frame = frameOffset + Math.round(event.time * this.fps);
      const charName = this.sanitize(event.actorId || '');
      const ctrlName = `${event.actorId}_CTRL`;

      switch (event.type) {
        case 'move': {
          const targetX = (event.targetX || 640) * this.sceneScale - 6.4;
          const targetZ = 0; // Y düzlemi
          const endFrame = frame + Math.round((event.duration || 2) * this.fps);
          lines.push(
            `# ${event.actorId} hareket: frame ${frame}-${endFrame}`,
            `obj = bpy.data.objects.get("${ctrlName}")`,
            `if obj:`,
            `    obj.keyframe_insert(data_path="location", frame=${frame})`,
            `    obj.location.x = ${targetX.toFixed(2)}`,
            `    obj.keyframe_insert(data_path="location", frame=${endFrame})`,
          );
          break;
        }
        case 'talk': {
          lines.push(
            `# ${event.actorId} konuşma: "${(event.text || '').substring(0, 30)}..." frame ${frame}`,
            `# Diyalog metni: "${event.text || ''}"`,
            `obj = bpy.data.objects.get("${event.actorId}_head")`,
            `if obj:`,
            `    # Konuşma sırasında hafif baş hareketi`,
            `    obj.rotation_euler.x = 0`,
            `    obj.keyframe_insert(data_path="rotation_euler", frame=${frame})`,
            `    obj.rotation_euler.x = radians(5)`,
            `    obj.keyframe_insert(data_path="rotation_euler", frame=${frame + 6})`,
            `    obj.rotation_euler.x = radians(-3)`,
            `    obj.keyframe_insert(data_path="rotation_euler", frame=${frame + 12})`,
            `    obj.rotation_euler.x = 0`,
            `    obj.keyframe_insert(data_path="rotation_euler", frame=${frame + 18})`,
          );
          break;
        }
        case 'animate': {
          if (event.preset === 'jump') {
            lines.push(
              `# ${event.actorId} zıplama: frame ${frame}`,
              `obj = bpy.data.objects.get("${ctrlName}")`,
              `if obj:`,
              `    obj.location.z = 0`,
              `    obj.keyframe_insert(data_path="location", frame=${frame})`,
              `    obj.location.z = 1.5`,
              `    obj.keyframe_insert(data_path="location", frame=${frame + 8})`,
              `    obj.location.z = 0`,
              `    obj.keyframe_insert(data_path="location", frame=${frame + 16})`,
            );
          } else if (event.preset === 'wave') {
            lines.push(
              `# ${event.actorId} el sallama: frame ${frame}`,
              `# TODO: Armature ile kol animasyonu ekle`,
            );
          }
          break;
        }
        case 'visible': {
          lines.push(
            `# ${event.actorId} görünürlük: ${event.visible}`,
            `obj = bpy.data.objects.get("${ctrlName}")`,
            `if obj:`,
            `    obj.hide_render = ${event.visible ? 'False' : 'True'}`,
            `    obj.hide_viewport = ${event.visible ? 'False' : 'True'}`,
            `    obj.keyframe_insert(data_path="hide_render", frame=${frame})`,
            `    obj.keyframe_insert(data_path="hide_viewport", frame=${frame})`,
          );
          break;
        }
        case 'expression': {
          lines.push(
            `# ${event.actorId} ifade: ${event.expression} (frame ${frame})`,
            `# Shape key veya materyal animasyonu ile uygulanabilir`,
          );
          break;
        }
      }
      lines.push('');
    }

    return lines;
  }

  generateBackground(scene, frameOffset) {
    const bgType = scene.background?.type || 'park';
    const bgColor = scene.background?.color || '#87CEEB';

    const r = parseInt(bgColor.slice(1, 3), 16) / 255;
    const g = parseInt(bgColor.slice(3, 5), 16) / 255;
    const b = parseInt(bgColor.slice(5, 7), 16) / 255;

    const lines = [
      `# Arka plan: ${bgType}`,
      `bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 5, 0))`,
      `bg_plane = bpy.context.active_object`,
      `bg_plane.name = "Zemin_${bgType}"`,
      `bg_plane.rotation_euler.x = radians(90)`,
      `mat_bg = bpy.data.materials.new(name="Mat_Zemin_${bgType}")`,
      `mat_bg.use_nodes = True`,
      `bsdf_bg = mat_bg.node_tree.nodes["Principled BSDF"]`,
      `bsdf_bg.inputs["Base Color"].default_value = (${(r * 0.5).toFixed(3)}, ${(g * 0.8).toFixed(3)}, ${(b * 0.3).toFixed(3)}, 1)`,
      `bg_plane.data.materials.append(mat_bg)`,
      '',
    ];

    return lines;
  }

  generateCameraSetup(episode) {
    return [
      '',
      '# ═══ KAMERA ═══',
      'bpy.ops.object.camera_add(location=(0, -8, 2), rotation=(radians(80), 0, 0))',
      'cam = bpy.context.active_object',
      'cam.name = "AnaCam"',
      'bpy.context.scene.camera = cam',
      'cam.data.lens = 35  # Geniş açı (çocuk çizgi film tarzı)',
      '',
    ];
  }

  generateRenderSettings(episode, totalFrames) {
    return [
      '',
      '# ═══ RENDER AYARLARI ═══',
      `bpy.context.scene.frame_start = 1`,
      `bpy.context.scene.frame_end = ${totalFrames}`,
      `bpy.context.scene.render.filepath = "//render/${this.sanitize(episode.title)}/"`,
      'bpy.context.scene.render.image_settings.file_format = "FFMPEG"',
      'bpy.context.scene.render.ffmpeg.format = "MPEG4"',
      'bpy.context.scene.render.ffmpeg.codec = "H264"',
      'bpy.context.scene.render.ffmpeg.constant_rate_factor = "MEDIUM"',
      '',
      '# Cel-shading (çizgi film görünümü) için Freestyle',
      'bpy.context.scene.render.use_freestyle = True',
      'bpy.context.scene.view_layers["ViewLayer"].freestyle_settings.linesets[0].linestyle.thickness = 2',
      '',
    ];
  }

  generateSubtitleMarkers(episode) {
    const lines = ['', '# ═══ DİYALOG MARKERLARİ ═══'];
    let frameOffset = 0;

    for (const scene of episode.scenes) {
      for (const event of (scene.events || [])) {
        if (event.type === 'talk' && event.text) {
          const frame = frameOffset + Math.round(event.time * this.fps);
          lines.push(
            `marker = bpy.context.scene.timeline_markers.new("${(event.actorId || '').substring(0, 10)}: ${(event.text || '').substring(0, 20)}", frame=${frame})`,
          );
        }
      }
      frameOffset += scene.duration * this.fps;
    }

    return lines;
  }

  sanitize(s) {
    return (s || '')
      .replace(/[ıİ]/g, 'i')
      .replace(/[öÖ]/g, 'o')
      .replace(/[üÜ]/g, 'u')
      .replace(/[çÇ]/g, 'c')
      .replace(/[şŞ]/g, 's')
      .replace(/[ğĞ]/g, 'g')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
  }
}
