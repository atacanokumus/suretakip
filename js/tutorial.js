// Tadiller & Süreç Takibi Interactive Tutorial Controller

const TUTORIAL_SLIDES = [
    {
        title: "🚀 Süreç Takibine Giriş",
        description: "Yeni tadil takip sistemimiz ile projelerinize ait tadil süreçlerini, aşama sürelerini, kurum görüşlerini ve revizyon geçmişlerini tek bir yerden anlık takip edebilirsiniz.",
        html: `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 18px; border-radius: 12px; font-family: 'Outfit', sans-serif;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="background: rgba(99, 102, 241, 0.15); color: #818cf8; font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: bold;">Saha Koordinat Tadili</span>
                    <span style="font-size: 11px; color: #fbbf24; font-weight: 600;">⚡ Aşama 4/11</span>
                </div>
                <h4 style="margin: 0 0 6px 0; color: #fff; font-size: 15px;">Harput EDT 2 GES</h4>
                <p style="margin: 0 0 12px 0; color: var(--text-muted); font-size: 12px;">📋 Proje süreci aktif olarak takip edilmektedir.</p>
                <div style="background: rgba(0,0,0,0.15); padding: 10px; border-radius: 8px; font-size: 11px; color: var(--text-primary); border: 1px solid rgba(255,255,255,0.04);">
                    <strong>Aktif Aşama:</strong> 4. TEİAŞ / EİGM Kurum Görüşleri (12 gündür bu aşamada)
                </div>
            </div>
        `
    },
    {
        title: "📝 Hızlı Tadil Kaydı Oluşturma",
        description: "Yeni tadil başvurusu girerken sadece en gerekli bilgileri girmeniz yeterlidir: Proje Adı, Tadil Tipi ve Notlar. İş akışı detayları sonradan atanıp güncellenebilir.",
        html: `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 16px; border-radius: 12px;">
                <div style="margin-bottom:10px;">
                    <label style="font-size:10px; color:var(--text-muted); display:block; margin-bottom:4px; font-weight:600;">PROJE ADI</label>
                    <input type="text" value="Harput EDT 2 GES" class="modern-input" disabled style="opacity:0.8; font-size:11px; padding: 6px 10px; height:auto; background:rgba(0,0,0,0.25);">
                </div>
                <div style="margin-bottom:10px;">
                    <label style="font-size:10px; color:var(--text-muted); display:block; margin-bottom:4px; font-weight:600;">TADİL TİPİ</label>
                    <select class="modern-select" disabled style="opacity:0.8; font-size:11px; height:auto; padding:6px 10px; background:rgba(0,0,0,0.25);"><option>Saha Koordinat Tadili</option></select>
                </div>
                <div>
                    <label style="font-size:10px; color:var(--text-muted); display:block; margin-bottom:4px; font-weight:600;">NOTLAR / AÇIKLAMA</label>
                    <textarea class="modern-textarea" disabled style="opacity:0.8; font-size:11px; min-height:45px; background:rgba(0,0,0,0.25); padding:6px 10px;">Başvuru öncesi bilgi belge talebi süreci başladı.</textarea>
                </div>
            </div>
        `
    },
    {
        title: "🎛️ Süreç Aşamaları & Metro Stepper",
        description: "Tadil tipine göre özel olarak yüklenen süreç çizgisinde aşamaların süre sayaçları o aşamada kaç gün geçirildiğini gösterir. Tamamlanan adımlar yeşile, aktif adım maviye boyanır.",
        html: `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 12px; display: flex; justify-content: center; align-items: center;">
                <div style="display: flex; justify-content: space-between; width: 100%; max-width: 440px; position: relative; margin-top: 15px; margin-bottom: 5px;">
                    <!-- Line -->
                    <div style="position: absolute; top: 11px; left: 0; right: 0; height: 2px; background: rgba(255,255,255,0.1); z-index: 1;"></div>
                    <div style="position: absolute; top: 11px; left: 0; width: 50%; height: 2px; background: #10b981; z-index: 2;"></div>
                    <!-- Done Node -->
                    <div style="position: relative; z-index: 3; text-align: center; flex: 1;">
                        <div style="width: 24px; height: 24px; border-radius: 50%; background: #10b981; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; margin: 0 auto; border: 2px solid #111827;">✓</div>
                        <div style="font-size: 9.5px; color: #10b981; margin-top: 6px; font-weight: 600;">Tadil Bedeli</div>
                    </div>
                    <!-- Done Node -->
                    <div style="position: relative; z-index: 3; text-align: center; flex: 1;">
                        <div style="width: 24px; height: 24px; border-radius: 50%; background: #10b981; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; margin: 0 auto; border: 2px solid #111827;">✓</div>
                        <div style="font-size: 9.5px; color: #10b981; margin-top: 6px; font-weight: 600;">Başvuru</div>
                    </div>
                    <!-- Active Node -->
                    <div style="position: relative; z-index: 3; text-align: center; flex: 1; transform: scale(1.05);">
                        <div style="width: 24px; height: 24px; border-radius: 50%; background: #6366f1; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; margin: 0 auto; border: 2px solid #111827; box-shadow: 0 0 10px rgba(99,102,241,0.4);">3</div>
                        <div style="font-size: 9.5px; color: #818cf8; margin-top: 6px; font-weight: bold;">TEİAŞ/EİGM</div>
                        <span style="background: rgba(156, 163, 175, 0.12); color: #9ca3af; font-size: 9px; padding: 1px 4px; border-radius: 4px; display: inline-block; margin-top: 4px; font-style: italic; border: 1px solid rgba(156,163,175,0.2);">12 gün</span>
                    </div>
                    <!-- Locked Node -->
                    <div style="position: relative; z-index: 3; text-align: center; flex: 1; opacity: 0.4;">
                        <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(255,255,255,0.1); color: var(--text-muted); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; margin: 0 auto; border: 2px solid #111827;">4</div>
                        <div style="font-size: 9.5px; color: var(--text-muted); margin-top: 6px;">Müzekkere</div>
                    </div>
                </div>
            </div>
        `
    },
    {
        title: "🔄 Bağlantı Kabul & İtiraz Döngüsü",
        description: "TEİAŞ görüşü gelince bağlantı noktası kabulünü veya itiraz durumunu kaydedebilirsiniz. İtiraz durumunda EPDK/TEİAŞ yazışma süreçleri açılır. İtiraz cevabı geldiğinde süreci tek tıkla başa döndürebilirsiniz.",
        html: `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 16px; border-radius: 12px;">
                <div style="margin-bottom: 10px;">
                    <label style="font-size: 10px; color: #fbbf24; font-weight:bold; display: block; margin-bottom: 6px;">🔗 Bağlantı Görüşü Kabul Taahhüt / İtiraz Durumu</label>
                    <select id="tutorialMockSelect" class="modern-select" style="font-size: 11px; padding: 5px 10px; height: auto; width:100%; background:rgba(0,0,0,0.3); border-color:rgba(255,255,255,0.1);">
                        <option value="kabul">✅ Kabul Edildi / Bağlantı Noktası Değişmedi</option>
                        <option value="itiraz" selected>⚠️ İtiraz Edildi</option>
                    </select>
                </div>
                
                <!-- Objection subfields mockup -->
                <div id="tutorialMockItirazFields" style="padding: 10px; background: rgba(239, 68, 68, 0.04); border-left: 3px solid #ef4444; border-radius: 6px;">
                    <h6 style="color:#f87171; margin:0 0 6px 0; font-size:10px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">TEİAŞ İtiraz Süreci</h6>
                    <div style="display:flex; gap:6px; font-size:9px; color:var(--text-muted); margin-bottom:2px;">
                        <div style="flex:1;">EPDK İtiraz Tarihi/Sayı</div>
                        <div style="flex:1;">TEİAŞ Görüş Tarihi/Sayı</div>
                    </div>
                    <div style="display:flex; gap:6px; margin-bottom:8px;">
                        <input type="text" value="26.03.2026 / 10245" disabled class="modern-input" style="font-size:10px; padding:3px 6px; flex:1; height:auto; background:rgba(0,0,0,0.25);">
                        <input type="text" value="27.03.2026 / 542" disabled class="modern-input" style="font-size:10px; padding:3px 6px; flex:1; height:auto; background:rgba(0,0,0,0.25);">
                    </div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <input type="checkbox" checked disabled style="width:12px; height:12px;">
                        <span style="font-weight:bold; color:#f87171; font-size:10px;">🔄 İtiraz Cevabı Geldi (Süreci Başına Döndür)</span>
                    </div>
                </div>
            </div>
        `
    },
    {
        title: "📋 Kabul Taahhüt Yükümlülüğü Tanımlama",
        description: "Bağlantı kabul edildiğinde, 'Bağlantı Kabul Taahhüt Yükümlülüğü Tanımla' seçeneğini işaretleyerek, sürece dair resmi taahhüt süresini otomatik olarak Yükümlülükler (Aşama 7) havuzuna aktarabilirsiniz.",
        html: `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 16px; border-radius: 12px;">
                <div style="padding: 10px; background: rgba(16, 185, 129, 0.04); border-left: 3px solid #10b981; border-radius: 6px; margin-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
                        <input type="checkbox" checked disabled style="width:12px; height:12px;">
                        <span style="font-weight:bold; color:#10b981; font-size:10px;">📋 Bağlantı Kabul Taahhüt Yükümlülüğü Tanımla</span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <div style="flex:1;">
                            <span style="font-size:9px; color:var(--text-muted); display:block; margin-bottom:2px;">Taahhüt Son Günü</span>
                            <input type="text" value="30.04.2026" disabled class="modern-input" style="font-size:10px; padding:3px 6px; height:auto; background:rgba(0,0,0,0.25);">
                        </div>
                        <div style="flex:2;">
                            <span style="font-size:9px; color:var(--text-muted); display:block; margin-bottom:2px;">Taahhüt Açıklaması</span>
                            <input type="text" value="TEİAŞ Bağlantı Kabul Taahhüdü Yükümlülüğü" disabled class="modern-input" style="font-size:10px; padding:3px 6px; height:auto; background:rgba(0,0,0,0.25);">
                        </div>
                    </div>
                </div>
            </div>
        `
    },
    {
        title: "🔄 Revizyon Yapabilme & Arşivleme",
        description: "Kurul kararı çıkana kadar süreçte dilediğiniz an tek tıkla yeni revizyon başlatabilirsiniz. 'Revizyon Yap' butonu süreci başvuruya geri döndürür, önceki tüm verileri timeline özetine arşivler ve korur.",
        html: `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 16px; border-radius: 12px; font-family:'Outfit', sans-serif;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom:6px;">
                    <span style="font-size:11px; font-weight:bold; color:#fbbf24; display:flex; align-items:center; gap:4px;">📜 İş Akışı Geçmişi Özeti</span>
                    <span style="background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.25); color:#fbbf24; font-weight:bold; font-size:9px; padding:2px 6px; border-radius:4px; display:inline-block;">🔄 Revizyon Yap</span>
                </div>
                <div style="font-size:10.5px; line-height:1.5;">
                    <div style="color:#fbbf24; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
                        <span>🔄</span> <strong>1. Revizyon Başlatıldı:</strong> 26.03.2026 tarihinde süreç revize edilerek başvuru aşamasına çekildi.
                    </div>
                    <div style="color:var(--text-muted); margin-left:12px;">
                        • <strong>3. 1. Revizyon Yapılması:</strong> 27.03.2026 tarihinde revize başvuru yapıldı.
                    </div>
                </div>
            </div>
        `
    }
];

let activeSlideIndex = 0;

function renderSlide(index) {
    const container = document.getElementById("tadilTutorialSlides");
    const prevBtn = document.getElementById("prevTadilTutorialBtn");
    const nextBtn = document.getElementById("nextTadilTutorialBtn");
    const dotsContainer = document.getElementById("tadilTutorialDots");
    
    if (!container || !prevBtn || !nextBtn || !dotsContainer) return;
    
    const slide = TUTORIAL_SLIDES[index];
    
    // Render Slide content
    container.innerHTML = `
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
                <h4 style="margin: 0 0 10px 0; font-family: 'Outfit'; font-size: 18px; font-weight: 700; color: #fff;">
                    ${slide.title}
                </h4>
                <p style="margin: 0 0 20px 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                    ${slide.description}
                </p>
            </div>
            <div class="interactive-preview-box" style="margin-top: auto; padding-top: 10px;">
                ${slide.html}
            </div>
        </div>
    `;
    
    // Render Dot Indicators
    dotsContainer.innerHTML = TUTORIAL_SLIDES.map((_, i) => {
        const isActive = i === index;
        return `<span style="width: ${isActive ? '18px' : '6px'}; height: 6px; border-radius: 6px; background: ${isActive ? '#fbbf24' : 'rgba(255,255,255,0.2)'}; display: inline-block; transition: all 0.2s;"></span>`;
    }).join("");
    
    // Update Button States
    prevBtn.disabled = index === 0;
    prevBtn.style.opacity = index === 0 ? "0.3" : "1";
    prevBtn.style.pointerEvents = index === 0 ? "none" : "auto";
    
    if (index === TUTORIAL_SLIDES.length - 1) {
        nextBtn.textContent = "Kullanmaya Başla! 🎉";
        nextBtn.style.background = "#10b981"; // Green success color
        nextBtn.style.borderColor = "#10b981";
    } else {
        nextBtn.textContent = "İleri";
        nextBtn.style.background = ""; // Default CSS color
        nextBtn.style.borderColor = "";
    }
}

export function openTadilTutorial() {
    const overlay = document.getElementById("tadilTutorialOverlay");
    if (overlay) {
        activeSlideIndex = 0;
        overlay.classList.remove("hidden");
        renderSlide(activeSlideIndex);
    }
}

export function closeTadilTutorial() {
    const overlay = document.getElementById("tadilTutorialOverlay");
    if (overlay) {
        overlay.classList.add("hidden");
        localStorage.setItem("sure_takip_tadil_tutorial_seen", "true");
    }
}

// Bind Global Window Functions
window.openTadilTutorial = openTadilTutorial;
window.closeTadilTutorial = closeTadilTutorial;

// Initialize Tutorial Elements when DOM loads
document.addEventListener("DOMContentLoaded", () => {
    // Bind Next button click
    const nextBtn = document.getElementById("nextTadilTutorialBtn");
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (activeSlideIndex < TUTORIAL_SLIDES.length - 1) {
                activeSlideIndex++;
                renderSlide(activeSlideIndex);
            } else {
                closeTadilTutorial();
            }
        };
    }
    
    // Bind Prev button click
    const prevBtn = document.getElementById("prevTadilTutorialBtn");
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (activeSlideIndex > 0) {
                activeSlideIndex--;
                renderSlide(activeSlideIndex);
            }
        };
    }
    
    // Bind Close buttons click
    const closeBtn = document.getElementById("closeTadilTutorialBtn");
    if (closeBtn) {
        closeBtn.onclick = closeTadilTutorial;
    }
    
    // Bind Help Button in header
    const helpBtn = document.getElementById("helpTutorialBtn");
    if (helpBtn) {
        helpBtn.onclick = openTadilTutorial;
    }
    
    // First-time automatic onboarding trigger
    const seen = localStorage.getItem("sure_takip_tadil_tutorial_seen");
    if (!seen) {
        setTimeout(() => {
            openTadilTutorial();
        }, 2000);
    }
});
