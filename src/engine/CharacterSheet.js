/**
 * CharacterSheet - Bir karakterin tüm görsel parçalarını ve meta verisini yönetir.
 *
 * Puppet animasyon yaklaşımı: Karakter 1 kez üretilir, parçalara ayrılır,
 * her sahnede AYNI sprite'lar kullanılır → %100 tutarlılık.
 *
 * Parçalar (parts):
 *   head, body, leftArm, rightArm, leftLeg, rightLeg, tail, ...
 *   + yüz ifadeleri (expressions): happy, sad, angry, surprised, talking, idle
 */
export class CharacterSheet {
  /**
   * @param {object} config
   * @param {string} config.name - Karakter adı (ör: "Ökkeş")
   * @param {string} config.type - Karakter türü (ör: "cat", "fish", "human")
   * @param {object} config.dimensions - { width, height } karakter boyutu
   * @param {object} config.pivot - { x, y } karakter merkez noktası
   * @param {object} config.metadata - Ek bilgiler (yaş, kişilik, renk paleti vb.)
   */
  constructor(config) {
    this.name = config.name;
    this.type = config.type || 'generic';
    this.dimensions = config.dimensions || { width: 200, height: 300 };
    this.pivot = config.pivot || { x: 100, y: 150 };
    this.metadata = config.metadata || {};

    /** @type {Map<string, Part>} */
    this.parts = new Map();

    /** @type {Map<string, Expression>} */
    this.expressions = new Map();

    /** @type {string} */
    this.currentExpression = 'idle';
  }

  /**
   * Karakter parçası ekle (kafa, gövde, kol, bacak vb.)
   * @param {string} name - Parça adı
   * @param {object} partConfig
   * @param {object} partConfig.anchor - { x, y } parçanın bağlantı noktası (eklem)
   * @param {object} partConfig.offset - { x, y } gövdeye göre konum
   * @param {number} partConfig.zIndex - Çizim sırası
   * @param {object} partConfig.defaultTransform - Varsayılan { rotation, scaleX, scaleY }
   * @param {Function|null} partConfig.drawFn - Canvas çizim fonksiyonu (sprite yoksa fallback)
   * @param {object|null} partConfig.sprite - { image, sx, sy, sw, sh } sprite bilgisi
   */
  addPart(name, partConfig) {
    this.parts.set(name, {
      name,
      anchor: partConfig.anchor || { x: 0, y: 0 },
      offset: partConfig.offset || { x: 0, y: 0 },
      zIndex: partConfig.zIndex ?? 0,
      defaultTransform: {
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        ...(partConfig.defaultTransform || {}),
      },
      drawFn: partConfig.drawFn || null,
      sprite: partConfig.sprite || null,
      children: [],
      parent: null,
    });
    return this;
  }

  /**
   * Parçalar arası parent-child ilişkisi kur (kemik hiyerarşisi)
   * Örnek: leftArm → body, head → body
   */
  setParent(childName, parentName) {
    const child = this.parts.get(childName);
    const parent = this.parts.get(parentName);
    if (child && parent) {
      child.parent = parentName;
      if (!parent.children.includes(childName)) {
        parent.children.push(childName);
      }
    }
    return this;
  }

  /**
   * Yüz ifadesi ekle
   * @param {string} name - İfade adı (happy, sad, angry, surprised, talking, idle)
   * @param {object} expressionConfig
   * @param {Function|null} expressionConfig.drawFn - Yüz çizim fonksiyonu
   * @param {object|null} expressionConfig.sprite - Yüz sprite'ı
   * @param {object} expressionConfig.eyeState - { openness, pupilX, pupilY }
   * @param {object} expressionConfig.mouthState - { openness, smile }
   */
  addExpression(name, expressionConfig) {
    this.expressions.set(name, {
      name,
      drawFn: expressionConfig.drawFn || null,
      sprite: expressionConfig.sprite || null,
      eyeState: expressionConfig.eyeState || { openness: 1, pupilX: 0, pupilY: 0 },
      mouthState: expressionConfig.mouthState || { openness: 0, smile: 0.5 },
    });
    return this;
  }

  setExpression(name) {
    if (this.expressions.has(name)) {
      this.currentExpression = name;
    }
    return this;
  }

  getExpression() {
    return this.expressions.get(this.currentExpression) || null;
  }

  /**
   * Tüm parçaları zIndex sırasına göre döndür
   */
  getDrawOrder() {
    return [...this.parts.values()].sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Hiyerarşi köklerini bul (parent'ı olmayan parçalar)
   */
  getRoots() {
    return [...this.parts.values()].filter(p => p.parent === null);
  }

  /**
   * Serialize → JSON (kaydetme/yükleme için)
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      dimensions: this.dimensions,
      pivot: this.pivot,
      metadata: this.metadata,
      parts: Object.fromEntries(
        [...this.parts.entries()].map(([k, v]) => [k, {
          ...v,
          drawFn: undefined,
          sprite: v.sprite ? { ...v.sprite, image: undefined } : null,
        }])
      ),
      expressions: Object.fromEntries(
        [...this.expressions.entries()].map(([k, v]) => [k, {
          ...v,
          drawFn: undefined,
          sprite: v.sprite ? { ...v.sprite, image: undefined } : null,
        }])
      ),
      currentExpression: this.currentExpression,
    };
  }
}
