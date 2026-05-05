// ═══════════════════════════════════════════════════════════
//  GOOGLE SHEETS — URLs CSV
//  Menú:    CODIGO | NOMBRE | CATEGORIA | SUBCATEGORIA | PRECIO | URL | DESCUENTO | ESTADO
//  Carrusel: URL (Google Drive) | (columna extra ignorada)
// ═══════════════════════════════════════════════════════════
const SHEETS_CSV_URL   = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTzSpg2Btp_n--dUIHh_jdevzHmS1dd_jjDJ5AAWFrB2FkcgOypVDdC3XoQS-Sxy6GVK6eSYaIAuPDi/pub?gid=1058584065&single=true&output=csv';
const CAROUSEL_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTzSpg2Btp_n--dUIHh_jdevzHmS1dd_jjDJ5AAWFrB2FkcgOypVDdC3XoQS-Sxy6GVK6eSYaIAuPDi/pub?gid=659633114&single=true&output=csv';

// Foto del local — primera slide fija (carga inmediata, buena para SEO)
const LOCAL_PHOTO = 'img/foto-local.jpg';

// Color de fondo cuando un producto no tiene imagen
const PLACEHOLDER_COLOR = '#3A2010';

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
  // Extraer el ID del archivo de cualquier formato de URL de Google Drive
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) {
    // lh3.googleusercontent.com es el endpoint más confiable para imágenes embebidas
    return `https://lh3.googleusercontent.com/d/${m[1]}`;
  }
  return url;
}

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Construye el menú desde el CSV del Google Sheet
function parseFullSheet(csv) {
  const rows = csv.split('\n').slice(1)
    .map(l => parseCsvLine(l))
    .filter(c => c[1]?.trim());

  const catMap = new Map();

  rows.forEach((cols, idx) => {
    const nombre     = cols[1]?.trim() || '';
    const catName    = cols[2]?.trim() || 'General';
    const subcatName = cols[3]?.trim() || '';
    const precio     = parseFloat(cols[4]) || 0;
    const imgUrl     = toDriveDirectUrl(cols[5]?.trim() || '');
    const desc       = parseFloat(cols[6]) || 0;
    const estado     = (cols[7]?.trim() || 'disponible').toLowerCase();

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
    const namedSubcats = [...subMap.keys()].filter(k => k !== '');

    if (namedSubcats.length >= 1) {
      const subcats = [];
      subMap.forEach((items, label) => subcats.push({ label: label || catName, items }));
      categories.push({ id, label: catName, subcats });
    } else {
      categories.push({ id, label: catName, items: [...subMap.values()].flat() });
    }
  });

  return categories;
}

function allItems(cat) {
  if (cat.subcats) return cat.subcats.flatMap(s => s.items);
  return cat.items || [];
}

// ─────────────────────────────────────────────
// ANIMACIÓN: Volar al carrito flotante
// ─────────────────────────────────────────────
function flyToCart(originEl) {
  // Destino: el botón flotante del carrito (abajo)
  const floatBtn = document.querySelector('.float-cart');

  const originRect = originEl.getBoundingClientRect();

  // Posición de inicio (centro del botón "+")
  const startX = originRect.left + originRect.width  / 2;
  const startY = originRect.top  + originRect.height / 2;

  // Destino: si el botón flotante existe y está visible, usarlo;
  // de lo contrario, ir al centro inferior de la pantalla
  let endX, endY;
  const destRect = floatBtn ? floatBtn.getBoundingClientRect() : null;
  if (destRect && destRect.width > 0) {
    endX = destRect.left + destRect.width  / 2;
    endY = destRect.top  + destRect.height / 2;
  } else {
    endX = window.innerWidth  / 2;
    endY = window.innerHeight - 48;
  }

  // Crear burbuja
  const dot = document.createElement('div');
  dot.style.cssText = `
    position: fixed;
    left: ${startX}px;
    top:  ${startY}px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--terra, #C85828);
    box-shadow: 0 0 8px rgba(200,88,40,.6);
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%) scale(1);
    will-change: left, top, transform, opacity;
    transition: none;
  `;
  document.body.appendChild(dot);

  // Forzar reflow
  dot.getBoundingClientRect();

  // Animar hacia el destino con curva suave
  dot.style.transition = [
    'left .6s cubic-bezier(.25,.8,.25,1)',
    'top .6s cubic-bezier(.25,.8,.25,1)',
    'transform .6s cubic-bezier(.25,.8,.25,1)',
    'opacity .2s ease .45s'
  ].join(', ');

  dot.style.left      = `${endX}px`;
  dot.style.top       = `${endY}px`;
  dot.style.transform = 'translate(-50%, -50%) scale(0.25)';
  dot.style.opacity   = '0';

  // Eliminar al terminar
  setTimeout(() => dot.remove(), 800);
}

// ─────────────────────────────────────────────
// ALPINE APP
// ─────────────────────────────────────────────
document.addEventListener('alpine:init', () => {
  Alpine.data('melitaApp', () => ({
    categories: [],
    activeCategory: '',
    activeSubcat: 'all',
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

    // ── Category ─────────────────────────────
    setCategory(id) {
      this.activeCategory = id;
      this.activeSubcat = 'all';
    },

    get filteredSubcats() {
      if (!this.activeData?.subcats) return [];
      if (this.activeSubcat === 'all') return this.activeData.subcats;
      return this.activeData.subcats.filter(s => s.label === this.activeSubcat);
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
      // Animar desde el botón "+" al carrito flotante
      const btn = ev.currentTarget;
      flyToCart(btn);
      this._addItem(item, 1);
    },
    addSelected() {
      if (!this.selected || this.selected.agotado) return;
      // Animar desde el botón del modal
      const addBtn = document.querySelector('.ps-add-btn');
      if (addBtn) flyToCart(addBtn);
      this._addItem(this.selected, this.selectedQty);
      this.closeModal();
    },
    _addItem(item, qty) {
      const ex = this.cart.find(i => i.id === item.id);
      if (ex) { ex.qty += qty; }
      else { this.cart.push({ id: item.id, name: item.name, note: item.note, price: item.price, image: item.image || null, qty }); }
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
        'Hola Melita Coffe, quiero hacer un pedido:\n',
        ...this.cart.map(i => `- ${i.qty}x ${i.name}${i.note ? ` (${i.note})` : ''} — S/. ${(i.price * i.qty).toFixed(2)}`),
        `\n*Total: S/. ${this.cartTotal.toFixed(2)}*`,
        `*Tipo:* ${this.orderType === 'delivery' ? 'Delivery' : 'Recoger en tienda'}`,
        this.orderType === 'delivery' ? '*Mi dirección:* (escríbela aquí)' : '',
      ].filter(l => l !== '');
      window.open(`https://wa.me/51941679505?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
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
    },
  }));
});

// ─────────────────────────────────────────────
// CARRUSEL HERO
// ─────────────────────────────────────────────
let _current = 0;
let _autoplay = null;

function heroGoTo(index) {
  const slides = document.querySelectorAll('.hero-slide');
  const dots   = document.querySelectorAll('.hero-dot');
  if (!slides.length) return;
  slides[_current]?.classList.remove('active');
  dots[_current]?.classList.remove('active');
  _current = (index + slides.length) % slides.length;
  slides[_current]?.classList.add('active');
  dots[_current]?.classList.add('active');
}

function addHeroSlide(src, carousel, dotsWrap) {
  const i = carousel.children.length;
  const slide = document.createElement('div');
  slide.className = 'hero-slide' + (i === 0 ? ' active' : '');
  slide.style.backgroundImage = `url('${src}')`;
  carousel.appendChild(slide);

  const dot = document.createElement('button');
  dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
  dot.setAttribute('aria-label', `Foto ${i + 1}`);
  dot.addEventListener('click', () => heroGoTo(i));
  dotsWrap.appendChild(dot);
}

function startAutoplay() {
  if (_autoplay) clearInterval(_autoplay);
  const slides = document.querySelectorAll('.hero-slide');
  if (slides.length > 1) {
    _autoplay = setInterval(() => heroGoTo(_current + 1), 3500);
  }
}

async function fetchCarouselSheets(carousel, dotsWrap) {
  try {
    const r = await fetch(CAROUSEL_CSV_URL);
    if (!r.ok) return;
    const csv = await r.text();
    csv.split('\n').slice(1).forEach(line => {
      const url = toDriveDirectUrl(parseCsvLine(line)[0]?.trim());
      if (url) addHeroSlide(url, carousel, dotsWrap);
    });
  } catch(e) {
    console.warn('Carrusel Sheets no disponible:', e.message);
  } finally {
    startAutoplay();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const carousel = document.getElementById('hero-carousel');
  const dotsWrap = document.getElementById('hero-dots');
  addHeroSlide(LOCAL_PHOTO, carousel, dotsWrap);
  fetchCarouselSheets(carousel, dotsWrap);
});

// Nav transparencia al hacer scroll
window.addEventListener('scroll', () => {
  document.getElementById('app-nav')
    ?.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });
