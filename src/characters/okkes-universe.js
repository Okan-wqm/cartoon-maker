/**
 * Ökkeş Evreni - Karakter Tanımları
 *
 * Ana karakter: Ökkeş (turuncu kedi, meraklı ve sevimli)
 * Yan karakterler: Zıpzıp (kuş), Ponçik (köpek), Elif (çocuk), Boncuk (balık)
 *
 * Her karakter sabit ve tutarlı: Aynı renkler, aynı kişilik, her bölümde.
 */

/**
 * Ana karakter: Ökkeş
 * Turuncu çizgili kedi, yaşı ~5 (insan yaşı karşılığı)
 * Kişilik: Meraklı, cesur ama bazen korkak, iyi kalpli
 */
export const Okkes = {
  name: 'Ökkeş',
  type: 'cat',
  bodyColor: '#FF8C42',
  bellyColor: '#FFD4A8',
  eyeColor: '#2ECC40',
  noseColor: '#FF6B81',
  stripeColor: '#E06030',
  personality: 'meraklı, cesur, iyi kalpli, bazen sakar',
  age: 'yavru',
  catchphrase: 'Vay canına!',
  voicePitch: 1.2, // Sevimli, yüksek ton
};

/**
 * Yan karakter: Zıpzıp
 * Sarı minik kuş, Ökkeş'in en yakın arkadaşı
 * Kişilik: Neşeli, enerjik, her şeye heyecanlanan
 */
export const Zipzip = {
  name: 'Zıpzıp',
  type: 'bird',
  bodyColor: '#FFD700',
  bellyColor: '#FFF8DC',
  beakColor: '#FF6347',
  wingColor: '#FFA500',
  personality: 'neşeli, enerjik, heyecanlı',
  age: 'yavru',
  catchphrase: 'Cik cik, harika!',
  voicePitch: 1.4, // Çok yüksek, cıvıl cıvıl
};

/**
 * Yan karakter: Ponçik
 * Kahverengi benekli köpek, biraz yavaş ama çok sadık
 * Kişilik: Sadık, yardımsever, uyuşuk ama güçlü
 */
export const Poncik = {
  name: 'Ponçik',
  type: 'dog',
  bodyColor: '#C8A87C',
  bellyColor: '#F5E6D3',
  eyeColor: '#4A3728',
  noseColor: '#333333',
  spotColor: '#8B6914',
  personality: 'sadık, yardımsever, biraz uyuşuk',
  age: 'genç',
  catchphrase: 'Hav hav, tamam!',
  voicePitch: 0.9, // Kalın, sıcak ses
};

/**
 * Yan karakter: Elif
 * Küçük kız çocuk, hayvanlarla konuşabilen özel bir çocuk
 * Kişilik: Akıllı, şefkatli, öğretici rol
 */
export const Elif = {
  name: 'Elif',
  type: 'human_child',
  skinColor: '#FFD5B8',
  hairColor: '#4A2F1B',
  shirtColor: '#E91E63',
  pantsColor: '#7B1FA2',
  eyeColor: '#4A3728',
  shoeColor: '#8B4513',
  personality: 'akıllı, şefkatli, meraklı',
  age: '6',
  catchphrase: 'Birlikte öğrenelim!',
  voicePitch: 1.15,
};

/**
 * Yan karakter: Boncuk
 * Mavi-gümüş balık, göldeki bilge karakter
 * Kişilik: Sakin, bilge, bazen gizemli
 */
export const Boncuk = {
  name: 'Boncuk',
  type: 'fish',
  bodyColor: '#4A90D9',
  bellyColor: '#A8D8EA',
  finColor: '#2E6CB5',
  tailColor: '#3578C4',
  personality: 'sakin, bilge, gizemli',
  age: 'yaşlı',
  catchphrase: 'Hmm, bir düşünelim...',
  voicePitch: 1.0,
};

/**
 * Hazır bölüm şablonları
 */
export const EpisodeTemplates = {
  'Ökkeş Balık Avında': {
    title: 'Ökkeş Balık Avında',
    theme: 'sayılar',
    setting: 'göl kenarı',
    characters: [Okkes, Zipzip, Boncuk],
    description: 'Ökkeş ve Zıpzıp göl kenarına gider. Boncuk ile tanışır ve saymayı öğrenir.',
  },
  'Ökkeş Maçta': {
    title: 'Ökkeş Maçta',
    theme: 'paylaşma',
    setting: 'futbol sahası',
    characters: [Okkes, Poncik, Elif],
    description: 'Ökkeş futbol oynamak ister ama top yok. Paylaşmayı ve takım olmanın güzelliğini öğrenir.',
  },
  'Ökkeş Renkleri Öğreniyor': {
    title: 'Ökkeş Renkleri Öğreniyor',
    theme: 'renkler',
    setting: 'park',
    characters: [Okkes, Elif, Zipzip],
    description: 'Elif, Ökkeş ve Zıpzıp ile parkta renkleri keşfeder.',
  },
  'Ökkeş Ormanda': {
    title: 'Ökkeş Ormanda',
    theme: 'hayvanlar',
    setting: 'orman',
    characters: [Okkes, Poncik, Zipzip],
    description: 'Ökkeş ve arkadaşları ormanda yürüyüşe çıkar, farklı hayvanları tanır.',
  },
  'Ökkeş Denizde': {
    title: 'Ökkeş Denizde',
    theme: 'şekiller',
    setting: 'deniz kenarı',
    characters: [Okkes, Elif, Boncuk],
    description: 'Kumda şekiller çizerek geometriyi öğrenirler.',
  },
};

/**
 * Tüm karakterleri döndür
 */
export function getAllCharacters() {
  return [Okkes, Zipzip, Poncik, Elif, Boncuk];
}

/**
 * İsme göre karakter bul
 */
export function getCharacterByName(name) {
  return getAllCharacters().find(c => c.name === name);
}
