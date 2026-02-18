#!/usr/bin/env node
/**
 * Cartoon Maker → Blender Export
 *
 * Kullanım:
 *   node src/export/export-to-blender.js                    # Varsayılan bölüm
 *   node src/export/export-to-blender.js "Ökkeş Maçta"      # Belirli bölüm
 *   node src/export/export-to-blender.js --all               # Tüm bölümler
 */
import { ScriptWriter } from '../agents/ScriptWriter.js';
import { BlenderExporter } from './BlenderExporter.js';
import { EpisodeTemplates } from '../characters/okkes-universe.js';

async function main() {
  const args = process.argv.slice(2);
  const exportAll = args.includes('--all');
  const episodeName = args.find(a => !a.startsWith('--')) || 'Ökkeş Balık Avında';

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  📦 Cartoon Maker → Blender Export                  ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  const scriptWriter = new ScriptWriter({ targetAge: '4-8', language: 'tr' });
  const exporter = new BlenderExporter({ fps: 24, width: 1920, height: 1080 });

  const templates = exportAll
    ? Object.values(EpisodeTemplates)
    : [EpisodeTemplates[episodeName] || Object.values(EpisodeTemplates)[0]];

  for (const template of templates) {
    console.log(`\n🎬 "${template.title}" export ediliyor...`);
    const episode = await scriptWriter.generateEpisode(template);
    exporter.exportEpisode(episode, template.characters);
  }
}

main().catch(console.error);
