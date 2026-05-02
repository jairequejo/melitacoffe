// ═══════════════════════════════════════════════════════════
//  FOTOS DEL CARRUSEL HERO
//  Para agregar una foto: copia el archivo a img/fotos-carrusel/
//  y agrega su nombre aquí debajo. Admite .jpg, .png, .webp
// ═══════════════════════════════════════════════════════════
const HERO_SLIDES = [
  'img/foto-local.jpg',           // Foto del local (va primero)
  'img/fotos-carrusel/c1.png',
  'img/fotos-carrusel/c2.jpg',
  'img/fotos-carrusel/c4.jpg',
  'img/fotos-carrusel/c5.jpg',
  'img/fotos-carrusel/c8.jpg',
  'img/fotos-carrusel/c9.jpg',
  'img/fotos-carrusel/c10.jpg',
];

// ═══════════════════════════════════════════════════════════
//  GOOGLE SHEETS — URL CSV
//  Columnas esperadas: CODIGO | NOMBRE | CATEGORIA | SUBCATEGORIA | PRECIO | URL | DESCUENTO | ESTADO
// ═══════════════════════════════════════════════════════════
const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTzSpg2Btp_n--dUIHh_jdevzHmS1dd_jjDJ5AAWFrB2FkcgOypVDdC3XoQS-Sxy6GVK6eSYaIAuPDi/pub?gid=1058584065&single=true&output=csv';


// Paleta de colores por categoría (para gradientes de placeholder)
const CAT_PALETTE = {
  cafe:         '#7B3F1A',
  bebcal:       '#4A1E05',
  infusiones:   '#1A4A1E',
  cafefrio:     '#1A2E5A',
  frappes:      '#3A1A5A',
  frozen:       '#1A3E5A',
  jugos:        '#5A2E0A',
  batidos:      '#5A1A3A',
  sandwiches:   '#3A3A0A',
  hamburguesas: '#5A0A0A',
  waffles:      '#5A3A0A',
  piqueos:      '#3A2A0A',
  cocteles:     '#0A1A5A',
  postres:      '#5A0A2A',
  embotellados: '#0A3A3A',
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function parseCsvLine(line) {
  const res = []; let cur = ''; let q = false;
  for (const ch of line) {
    if (ch === '"') { q = !q; }
    else if (ch === ',' && !q) { res.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  res.push(cur.trim());
  return res;
}

function toDriveDirectUrl(url) {
  if (!url) return null;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  return url;
}

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Emojis por categoría (insensible a tildes y mayúsculas)
const CAT_EMOJI_MAP = {
  'cafe': '☕', 'café': '☕', 'cafe caliente': '☕', 'café caliente': '☕',
  'calientes': '🍫', 'bebidas calientes': '🍫', 'beb. calientes': '🍫',
  'infusiones': '🌿', 'infusion': '🌿',
  'cafe frio': '🧊', 'café frío': '🧊', 'cafe frio': '🧊',
  'frappes': '🧋', 'frappés': '🧋', 'frappe': '🧋',
  'frozen': '❄️', 'bebidas frozen': '❄️',
  'jugos': '🍓', 'jugos naturales': '🍓',
  'batidos': '🥛', 'batidos con leche': '🥛',
  'sandwiches': '🥪', 'sándwiches': '🥪', 'sandwiches & triples': '🥪',
  'hamburguesas': '🍔',
  'waffles': '🧇',
  'piqueos': '🍟', 'piqueos & acompañamientos': '🍟',
  'cocteles': '🍹', 'cócteles': '🍹',
  'postres': '🍰',
  'embotellados': '🍾', 'bebidas embotelladas': '🍾', 'bebidas': '🍾',
};

function getEmoji(catName) {
  const key = catName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return CAT_EMOJI_MAP[catName.toLowerCase()] || CAT_EMOJI_MAP[key] || '🍽️';
}

// Construye el menú completo desde el CSV del Google Sheet
// Columnas: CODIGO(0) | NOMBRE(1) | CATEGORIA(2) | SUBCATEGORIA(3) | PRECIO(4) | URL(5) | DESCUENTO(6) | ESTADO(7)
function parseFullSheet(csv) {
  const rows = csv.split('\n').slice(1)   // saltar header
    .map(l => parseCsvLine(l))
    .filter(c => c[1]?.trim());           // solo filas con NOMBRE

  const catMap = new Map(); // catName → Map(subcatName → items[])

  rows.forEach((cols, idx) => {
    const nombre    = cols[1]?.trim() || '';
    const catName   = cols[2]?.trim() || 'General';
    const subcatName= cols[3]?.trim() || '';
    const precio    = parseFloat(cols[4]) || 0;
    const imgUrl    = toDriveDirectUrl(cols[5]?.trim() || '');
    const desc      = parseFloat(cols[6]) || 0;
    const estado    = (cols[7]?.trim() || 'disponible').toLowerCase();

    if (!nombre) return;

    const precioFinal = desc > 0 ? +(precio * (1 - desc / 100)).toFixed(2) : precio;

    const item = {
      id: `s${idx}`,
      name: nombre,
      note: null,
      price: precioFinal,
      precioOriginal: desc > 0 ? precio : null,
      descuento: desc > 0 ? desc : 0,
      image: imgUrl || null,
      badge: desc > 0 ? `-${desc}% OFF` : null,
      agotado: estado === 'agotado',
    };

    if (!catMap.has(catName)) catMap.set(catName, new Map());
    const subMap = catMap.get(catName);
    if (!subMap.has(subcatName)) subMap.set(subcatName, []);
    subMap.get(subcatName).push(item);
  });

  const categories = [];
  catMap.forEach((subMap, catName) => {
    const id = slugify(catName);
    const emoji = getEmoji(catName);
    const namedSubcats = [...subMap.keys()].filter(k => k !== '');

    if (namedSubcats.length >= 1) {
      const subcats = [];
      subMap.forEach((items, label) => subcats.push({ label: label || catName, items }));
      categories.push({ id, label: catName, emoji, sub: '', subcats });
    } else {
      categories.push({ id, label: catName, emoji, sub: '', items: [...subMap.values()].flat() });
    }
  });

  return categories;
}

function allItems(cat) {
  if (cat.subcats) return cat.subcats.flatMap(s => s.items);
  return cat.items || [];
}

// ─────────────────────────────────────────────
// ALPINE APP
// ─────────────────────────────────────────────
document.addEventListener('alpine:init', () => {
  Alpine.data('melitaApp', () => ({
    categories: [],
    activeCategory: '',
    loading: true,
    cart: [],
    cartOpen: false,
    modalOpen: false,
    selected: null,
    selectedQty: 1,
    orderType: 'delivery',
    bump: false,

    init() {
      this.loadCart();
      if (SHEETS_CSV_URL) this.fetchSheets();
    },

    // ── Getters ──────────────────────────────
    get activeData() {
      return this.categories.find(c => c.id === this.activeCategory) || this.categories[0];
    },
    get cartCount() {
      return this.cart.reduce((s, i) => s + i.qty, 0);
    },
    get cartTotal() {
      return this.cart.reduce((s, i) => s + i.price * i.qty, 0);
    },
    get catColor() {
      return CAT_PALETTE[this.activeCategory] || '#4A2A0A';
    },
    get itemColor() {
      if (!this.selected) return '#4A2A0A';
      const cat = this.categories.find(c => allItems(c).some(i => i.id === this.selected.id));
      return CAT_PALETTE[cat?.id] || '#4A2A0A';
    },

    // ── Category ─────────────────────────────
    setCategory(id) {
      this.activeCategory = id;
      this.$nextTick(() => {
        document.querySelector(`[data-cat="${id}"]`)
          ?.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
      });
    },

    // ── Product modal ─────────────────────────
    openProduct(item) {
      this.selected = item;
      this.selectedQty = 1;
      this.modalOpen = true;
      document.body.style.overflow = 'hidden';
    },
    closeModal() {
      this.modalOpen = false;
      setTimeout(() => { this.selected = null; }, 300);
      document.body.style.overflow = '';
    },

    // ── Cart ──────────────────────────────────
    quickAdd(item, ev) {
      ev.stopPropagation();
      if (item.agotado) return;
      this._addItem(item, 1);
    },
    addSelected() {
      if (!this.selected || this.selected.agotado) return;
      this._addItem(this.selected, this.selectedQty);
      this.closeModal();
    },
    _addItem(item, qty) {
      const ex = this.cart.find(i => i.id === item.id);
      if (ex) { ex.qty += qty; }
      else { this.cart.push({ id:item.id, name:item.name, note:item.note, price:item.price, image:item.image||null, qty }); }
      this.saveCart();
      this.bump = true;
      setTimeout(() => { this.bump = false; }, 600);
    },
    updateQty(id, delta) {
      const item = this.cart.find(i => i.id === id);
      if (!item) return;
      item.qty += delta;
      if (item.qty <= 0) this.cart = this.cart.filter(i => i.id !== id);
      this.saveCart();
    },
    removeItem(id) {
      this.cart = this.cart.filter(i => i.id !== id);
      this.saveCart();
    },
    openCart() {
      this.cartOpen = true;
      document.body.style.overflow = 'hidden';
    },
    closeCart() {
      this.cartOpen = false;
      document.body.style.overflow = '';
    },
    closeAll() {
      this.closeModal();
      this.closeCart();
    },

    // ── WhatsApp ──────────────────────────────
    sendWhatsApp() {
      if (!this.cart.length) return;
      const lines = [
        '¡Hola Melita Coffe! 👋\n',
        '🛒 *MI PEDIDO:*',
        '━━━━━━━━━━━━━━━━━━━',
        ...this.cart.map(i => `• ${i.qty}x *${i.name}*${i.note ? ` (${i.note})` : ''} — S/. ${(i.price * i.qty).toFixed(2)}`),
        '━━━━━━━━━━━━━━━━━━━',
        `💰 *Total: S/. ${this.cartTotal.toFixed(2)}*`,
        '',
        `📦 *Tipo:* ${this.orderType === 'delivery' ? '🛵 Delivery' : '🏠 Recoger en tienda'}`,
        this.orderType === 'delivery' ? '📍 *Mi dirección:* (escríbela aquí)\n' : '',
        '¡Gracias! 😊',
      ];
      const url = `https://wa.me/51941679505?text=${encodeURIComponent(lines.join('\n'))}`;
      window.open(url, '_blank');
    },

    // ── Persistencia ──────────────────────────
    saveCart() {
      try { localStorage.setItem('melita_v3', JSON.stringify(this.cart)); } catch(e) {}
    },
    loadCart() {
      try { const d = localStorage.getItem('melita_v3'); if (d) this.cart = JSON.parse(d); } catch(e) {}
    },

    // ── Google Sheets ─────────────────────────
    async fetchSheets() {
      try {
        const r = await fetch(SHEETS_CSV_URL);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const csv = await r.text();
        const newCats = parseFullSheet(csv);
        if (newCats.length > 0) {
          this.categories = newCats;
          if (!this.categories.find(c => c.id === this.activeCategory)) {
            this.activeCategory = this.categories[0].id;
          }
        }
      } catch(e) {
        console.warn('Sheets no disponible:', e.message);
      } finally {
        this.loading = false;
      }
    }
  }));
});

// ─────────────────────────────────────────────
// CARRUSEL HERO
// ─────────────────────────────────────────────
let _current = 0;

function heroGoTo(index) {
  const slides = document.querySelectorAll('.hero-slide');
  const dots   = document.querySelectorAll('.hero-dot');
  slides[_current].classList.remove('active');
  dots[_current]?.classList.remove('active');
  _current = index;
  slides[_current].classList.add('active');
  dots[_current]?.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
  const carousel = document.getElementById('hero-carousel');
  const dotsWrap = document.getElementById('hero-dots');

  // Construir slides y dots desde HERO_SLIDES
  HERO_SLIDES.forEach((src, i) => {
    const slide = document.createElement('div');
    slide.className = 'hero-slide' + (i === 0 ? ' active' : '');
    slide.style.backgroundImage = `url('${src}')`;
    carousel.appendChild(slide);

    const dot = document.createElement('button');
    dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Foto ${i + 1}`);
    dot.addEventListener('click', () => heroGoTo(i));
    dotsWrap.appendChild(dot);
  });

  // Autoplay cada 3 segundos
  if (HERO_SLIDES.length > 1) {
    setInterval(() => heroGoTo((_current + 1) % HERO_SLIDES.length), 3000);
  }
});

// Nav transparencia
window.addEventListener('scroll', () => {
  const nav = document.getElementById('app-nav');
  if (!nav) return;
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });
