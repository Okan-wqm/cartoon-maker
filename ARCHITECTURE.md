# Cartoon Maker - Mimari ve Yol Haritası

## Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────┐
│                   DirectorAgent (Yönetmen)               │
│                   Tüm ajanları koordine eder             │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│Senarist  │ Sanatçı  │Animatör  │   Ses    │  Renderer   │
│  Ajan    │   Ajan   │  Ajan    │  Ajan    │  (Render)   │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│                    Motor (Engine)                         │
│  CharacterSheet │ PuppetAnimator │ Scene │ Timeline      │
└─────────────────────────────────────────────────────────┘
```

## Pipeline (Üretim Hattı)

```
Konu/Tema
    │
    ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Senarist │────▶│ Sanatçı  │────▶│ Animatör │
│  Ajan    │     │   Ajan   │     │   Ajan   │
│          │     │          │     │          │
│ Senaryo  │     │ Karakter │     │ Timeline │
│ üretir   │     │ Sheet    │     │ event'   │
│          │     │ üretir   │     │ leri     │
└──────────┘     └──────────┘     └──────────┘
                                       │
                                       ▼
                 ┌──────────┐     ┌──────────┐
                 │   Ses    │────▶│ Renderer │
                 │   Ajan   │     │          │
                 │          │     │ Frame →  │
                 │ TTS +    │     │ PNG →    │
                 │ efekt    │     │ Video    │
                 └──────────┘     └──────────┘
```

## Dosya Yapısı

```
cartoon-maker/
├── src/
│   ├── engine/                 # Çekirdek motor
│   │   ├── CharacterSheet.js   # Karakter parçaları ve ifadeler
│   │   ├── PuppetAnimator.js   # Kemik/eklem animasyon sistemi
│   │   ├── Scene.js            # Sahne, timeline, kamera, parçacıklar
│   │   ├── Renderer.js         # Canvas → PNG → Video pipeline
│   │   └── index.js
│   ├── agents/                 # AI Ajanlar
│   │   ├── ScriptWriter.js     # Senaryo üretimi
│   │   ├── ArtistAgent.js      # Karakter tasarımı (programatik + AI sprite)
│   │   ├── AnimatorAgent.js    # Sahne → Scene dönüşümü, arka planlar
│   │   ├── SoundAgent.js       # Ses planı, TTS, efektler
│   │   ├── DirectorAgent.js    # Orkestra şefi, pipeline yönetimi
│   │   └── index.js
│   ├── characters/             # Karakter tanımları
│   │   └── okkes-universe.js   # Ökkeş ve arkadaşları
│   ├── index.js                # Ana export
│   └── demo.js                 # Demo çalıştırma
├── assets/
│   ├── sprites/                # PNG sprite dosyaları (AI üretimi)
│   ├── sounds/                 # Ses efektleri
│   └── backgrounds/            # Arka plan görselleri
├── output/                     # Render çıktıları
│   └── frames/                 # PNG frame'ler
├── package.json
└── ARCHITECTURE.md
```

## Karakter Tutarlılığı Yaklaşımı

| Seviye | Yöntem | Tutarlılık | Durum |
|--------|--------|------------|-------|
| 1 | Programatik çizim (drawFn) | %100 | ✅ Mevcut |
| 2 | PNG Sprite (elle çizilmiş) | %100 | ✅ Destekleniyor |
| 3 | AI Sprite (Stable Diffusion + LoRA) | %95+ | 🔜 Planlandı |
| 4 | Spine/DragonBones entegrasyonu | %100 | 🔜 İleri aşama |

## Ses Politikası

- Anlatıcı sesi: Sıcak, güven verici kadın sesi (teyze gibi)
- Pitch: Hafif yüksek (1.1x), çocukların ilgisini çeker
- Hız: Yavaş (0.85x), anlaşılır konuşma
- YASAK sesler: Patlama, çığlık, korku efektleri
- Müzik: Ukulele, piyano, hafif melodiler

## İleri Götürme Yol Haritası

### Faz 1: Temel (Mevcut ✅)
- [x] Puppet animasyon motoru
- [x] Karakter sheet sistemi (programatik çizim)
- [x] Sahne/timeline sistemi
- [x] 5 ajan (senarist, sanatçı, animatör, ses, yönetmen)
- [x] 5 karakter (Ökkeş, Zıpzıp, Ponçik, Elif, Boncuk)
- [x] 7 arka plan (göl, saha, park, okul, orman, deniz, ev)
- [x] PNG frame render
- [x] Ses planı + TTS konfigürasyonu

### Faz 2: AI Sprite Entegrasyonu
- [ ] Stable Diffusion API bağlantısı
- [ ] LoRA eğitim pipeline'ı (karakter tutarlılığı)
- [ ] Otomatik sprite sheet üretimi
- [ ] Sprite → parça ayırma (SAM/rembg)
- [ ] Arka plan AI üretimi

### Faz 3: Gerçek Ses
- [ ] Google Cloud TTS entegrasyonu
- [ ] ElevenLabs entegrasyonu (daha doğal ses)
- [ ] Ses efekt kütüphanesi (freesound.org)
- [ ] Müzik üretimi (Suno AI / MusicGen)
- [ ] Dudak senkronizasyonu (lip sync)

### Faz 4: İleri Animasyon
- [ ] Spine 2D entegrasyonu (profesyonel kemik animasyon)
- [ ] Mesh deformasyon (daha akıcı hareketler)
- [ ] IK (Inverse Kinematics) sistemi
- [ ] Fizik motoru (saç, kuyruk, etek sallanması)
- [ ] Parçacık editörü (görsel efekt tasarımı)

### Faz 5: AI Senaryo
- [ ] Claude/GPT API ile senaryo üretimi
- [ ] Müfredata uyumlu eğitim içeriği
- [ ] İnteraktif bölümler (izleyici seçim yapabilir)
- [ ] Çok dilli destek (EN, DE, FR, AR)
- [ ] Kişiselleştirme (çocuğun adı hikayede)

### Faz 6: Dağıtım
- [ ] Web UI (sahne editörü)
- [ ] YouTube otomatik yükleme
- [ ] Batch render (seri bölüm üretimi)
- [ ] CDN üzerinden sprite/ses dağıtımı
- [ ] Analytics (hangi bölüm daha çok izleniyor)
