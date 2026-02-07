/**
 * Cartoon Maker - Ana giriş noktası
 *
 * AI Agent-driven puppet animation engine.
 * Eğitici çocuk çizgi filmleri üretir:
 *   - Tutarlı karakterler (%100 aynı her sahnede)
 *   - Puppet animasyon (kemik/eklem tabanlı)
 *   - Çocuk dostu ses (yumuşak kadın sesi)
 *   - Eğitici içerik (sayılar, renkler, paylaşma vb.)
 */

// Engine
export { CharacterSheet } from './engine/CharacterSheet.js';
export { PuppetAnimator } from './engine/PuppetAnimator.js';
export { Scene } from './engine/Scene.js';
export { Renderer } from './engine/Renderer.js';

// Agents
export { ScriptWriter } from './agents/ScriptWriter.js';
export { ArtistAgent } from './agents/ArtistAgent.js';
export { AnimatorAgent } from './agents/AnimatorAgent.js';
export { SoundAgent } from './agents/SoundAgent.js';
export { FFmpegAgent } from './agents/FFmpegAgent.js';
export { SpriteGenerator } from './agents/SpriteGenerator.js';
export { DirectorAgent } from './agents/DirectorAgent.js';

// Characters
export {
  Okkes, Zipzip, Poncik, Elif, Boncuk,
  EpisodeTemplates, getAllCharacters, getCharacterByName,
} from './characters/okkes-universe.js';
