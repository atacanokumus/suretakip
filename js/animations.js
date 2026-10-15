/**
 * Site geneli giriş animasyonları.
 *
 * Bir sayfa açıldığında kartlar sırayla kayarak gelir, istatistik sayıları
 * sıfırdan sayarak yükselir, başlık yumuşakça belirir. Butonlara tıklayınca
 * dalga (ripple) efekti oluşur.
 *
 * Yalnızca sayfa GEÇİŞİNDE çalışır - bir ekip arkadaşının kaydı yüzünden
 * liste yeniden çizildiğinde kartlar tekrar tekrar zıplamasın diye
 * 'data-refreshed' dinlenmez. Tüm animasyonlar transform/opacity üzerinden
 * (Web Animations API) yapılır: ekran kartında birleştirilir, sayfa yerleşimini
 * yeniden hesaplatmaz. Veriye ve DOM içeriğine dokunmaz; sayaç, bitişte
 * mutlaka gerçek değeri geri yazar ve arada liste yeniden çizilirse durur.
 */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Sayfa başına canlandırılacak öğeler. İlk MAX_STAGGER öğe sırayla gelir,
// geri kalanı beklemeden görünür - uzun listelerde son kartı saniyelerce
// bekletmemek için.
const ENTRANCE_SELECTORS = [
    '.stat-card',
    '.job-card',
    '.project-card',
    '.obligation-item',
    '#obligationsTable > tr',
    '.ext-matrix-card',
    '.chart-card',
    '.settings-card',
    '.card'
].join(',');
const MAX_STAGGER = 14;
const STAGGER_MS = 45;

function isVisible(el) {
    return el.offsetParent !== null || el.getClientRects().length > 0;
}

function playEntrance(page) {
    if (!page || reduceMotion.matches) return;
    const seen = new Set();
    const items = [...page.querySelectorAll(ENTRANCE_SELECTORS)].filter(el => {
        // İç içe eşleşmelerde (ör. .card içinde .stat-card) yalnızca dıştakini
        // canlandır, yoksa aynı kart iki kez kayar.
        for (const s of seen) if (s.contains(el)) return false;
        if (!isVisible(el)) return false;
        seen.add(el);
        return true;
    });

    items.slice(0, MAX_STAGGER).forEach((el, i) => {
        el.animate(
            [
                { opacity: 0, transform: 'translateY(18px) scale(0.98)' },
                { opacity: 1, transform: 'none' }
            ],
            { duration: 480, delay: i * STAGGER_MS, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }
        );
    });
}

function countUp(page) {
    if (!page || reduceMotion.matches) return;
    page.querySelectorAll('.stat-value').forEach(el => {
        const text = el.textContent.trim();
        if (!/^\d+$/.test(text)) return;
        const target = parseInt(text, 10);
        if (target === 0) return;

        const duration = Math.min(900, 400 + target * 15);
        const start = performance.now();
        let lastWritten = '0';
        el.textContent = lastWritten;

        const step = now => {
            // Arada uygulama bu sayıyı güncellediyse (yeni veri geldi) sayacı
            // bırak - onun yazdığı değer doğrudur.
            if (el.textContent !== lastWritten) return;
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            lastWritten = t < 1 ? String(Math.round(target * eased)) : text;
            el.textContent = lastWritten;
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    });
}

function animateTitle() {
    const title = document.getElementById('pageTitle');
    if (!title || reduceMotion.matches) return;
    title.animate(
        [
            { opacity: 0, transform: 'translateX(-10px)' },
            { opacity: 1, transform: 'none' }
        ],
        { duration: 350, easing: 'ease-out' }
    );
}

function animatePage(pageId) {
    const page = pageId ? document.getElementById(pageId) : document.querySelector('.page.active');
    if (!page) return;
    playEntrance(page);
    countUp(page);
}

/**
 * Butona tıklanan noktadan yayılan dalga. Sadece görsel bir <span> ekler,
 * animasyon bitince kaldırır.
 */
function initRipple() {
    document.addEventListener('pointerdown', e => {
        if (reduceMotion.matches) return;
        const btn = e.target.closest('.btn, .nav-item, .filter-btn, .premium-btn');
        if (!btn || btn.disabled) return;

        // Dalga, butonun kendisine overflow:hidden vermeden (rozetleri/menüleri
        // kırpmasın diye) buton şeklindeki ayrı bir kabın içinde kırpılır.
        if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2;
        const host = document.createElement('span');
        host.className = 'ui-ripple-host';
        const ripple = document.createElement('span');
        ripple.className = 'ui-ripple';
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
        host.appendChild(ripple);
        btn.appendChild(host);
        ripple.animate(
            [
                { transform: 'scale(0)', opacity: 0.35 },
                { transform: 'scale(1)', opacity: 0 }
            ],
            { duration: 600, easing: 'ease-out' }
        ).onfinish = () => host.remove();
    }, { passive: true });
}

export function initAnimations() {
    initRipple();

    window.addEventListener('page-changed', e => {
        animateTitle();
        // app.js'teki render aynı olay içinde senkron çalışıyor; bir kare
        // bekleyince yeni çizilen kartlar da yakalanır.
        requestAnimationFrame(() => animatePage(e.detail?.pageId));
    });

    // Giriş yapıldıktan sonraki ilk açılış: veriler gelip ilk sayfa
    // dolduğunda bir kez oynat.
    const startedAt = performance.now();
    const waitForFirstPage = () => {
        const page = document.querySelector('.page.active');
        if (page && isVisible(page) && page.querySelector(ENTRANCE_SELECTORS)) {
            animatePage(page.id);
            return;
        }
        // Giriş ekranında beklenen süreyi de kapsasın diye 2 dakika dene.
        if (performance.now() - startedAt < 120000) setTimeout(waitForFirstPage, 250);
    };
    waitForFirstPage();
}
