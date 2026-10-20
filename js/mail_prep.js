/**
 * Mail Hazırlığı - tadil bedeli isteme maillerini otomatik hazırlar.
 *
 * Kullanıcı: bedel istenecek tadil tipini, projeyi ve projenin mekanik gücünü
 * seçer; modül EPDK'nın yıllık Kurul Kararındaki bedel tablosuna göre tutarı
 * hesaplar ve gönderilmeye hazır mail taslağını üretir.
 *
 * Şablonlar:
 *   - Tesis Tamamlama Süre Uzatımı   (kullanıcının gönderdiği örnek metin)
 *   - Önlisans Süre Uzatımı          (kullanıcının gönderdiği örnek metin)
 *   - TEA Başvurusu                  (eski "TEA Başvuru Bedeli Hesaplayıcı"
 *                                     buraya taşındı, birim fiyatları aynı
 *                                     Store.teaFeeSettings'ten gelir)
 *   - Saha / KGÜT / ÜKT              (Kurul Kararı ** dipnotundan türetildi;
 *                                     ünite tadillerinde yönetmelik maddesi yazılmaz)
 *   - Diğer Tadil (asgari bedel)     (Kurul Kararı tablosundan türetildi)
 *
 * Bedel tablosu yılda bir değişir: sayfadaki "Bedel Ayarları" düğmesinden
 * güncellenir (daVinciData/master.mailFeeSettings). Hiç düzenlenmediyse aşağıdaki
 * DEFAULT_MAIL_FEE_SETTINGS (2026 Kurul Kararı) kullanılır.
 */

import { Store } from './store.js';
import { escapeHtml } from './utils.js';
import { showToast } from './ui.js';
import { saveData } from './data.js';
import { formatDateForInput } from './jobs.js';

// ---------------------------------------------------------------------------
// Bedel tablosu - EPDK Kurul Kararı No 14051 (18/12/2025), 2026 yılı
// "Önlisans/Üretim Lisansı ... alma bedeli" ve asgari tadil bedeli.
// ---------------------------------------------------------------------------
export const DEFAULT_MAIL_FEE_SETTINGS = {
    year: 2026,
    source: 'EPDK Kurul Kararı No: 14051, Karar Tarihi: 18/12/2025',
    minTadilFee: 92200,
    renewableRatio: 0.10, // yerli/yenilenebilir tesislerde tadil bedelinin %10'u (** dipnotu)
    // Kurul Kararı'ndaki gibi: min < P ≤ max. max: null = üst sınır yok (son aralık).
    tiers: [
        { min: 0, max: 10, fee: 92200 },
        { min: 10, max: 25, fee: 179100 },
        { min: 25, max: 50, fee: 268600 },
        { min: 50, max: 100, fee: 447700 },
        { min: 100, max: 250, fee: 895200 },
        { min: 250, max: 500, fee: 1789400 },
        { min: 500, max: 1000, fee: 2683600 },
        { min: 1000, max: null, fee: 4475500 }
    ],
    payment: {
        bank: 'T.VAKIFLAR BANKASI T.A.O BAHÇELİEVLER/ANKARA ŞUBESİ',
        account: 'ELEKTRİK LİSANS ALMA, TADİL, SURET BEDELİ HS. (Tahsilat Alt Hesabı)',
        iban: 'TR41 0001 5001 5800 7292 2298 96'
    }
};

/** Ayarlar penceresinden (Store.mailFeeSettings) özelleştirilmişse o, değilse varsayılan. */
function currentFeeSettings() {
    const s = Store.mailFeeSettings;
    return s && Array.isArray(s.tiers) && s.tiers.length ? s : DEFAULT_MAIL_FEE_SETTINGS;
}

const plainNum = (x) => String(x).replace('.', ',');

/** Geçerli bedel tablosu; aralık etiketleri üst sınırlardan üretilir. */
export function getFeeTable() {
    const s = currentFeeSettings();
    const d = DEFAULT_MAIL_FEE_SETTINGS;
    const tiers = s.tiers.map((t, i, arr) => {
        const max = t.max == null ? Infinity : Number(t.max);
        // Alt sınır kayıtlıysa o, eski (yalnızca üst sınırlı) kayıtlarda bir önceki üst sınır.
        const min = t.min != null ? Number(t.min) : (i === 0 ? 0 : Number(arr[i - 1].max));
        const label = max === Infinity
            ? `P > ${plainNum(min)} MW`
            : `${plainNum(min)} < P ≤ ${plainNum(max)} MW`;
        return { min, max, fee: Number(t.fee) || 0, label };
    });
    return {
        year: s.year || d.year,
        minTadilFee: s.minTadilFee != null ? Number(s.minTadilFee) : d.minTadilFee,
        renewableTadilRatio: s.renewableRatio != null ? Number(s.renewableRatio) : d.renewableRatio,
        tiers
    };
}

function getPayment() {
    return { ...DEFAULT_MAIL_FEE_SETTINGS.payment, ...(currentFeeSettings().payment || {}) };
}

const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

const fmtMoney = (v) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
const fmtMw = (v) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(v);

/** "2026-10-24" -> "24.10.2026" */
function fmtDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
}

/** "2024-11" -> "Kasım 2024" */
function fmtMonth(ym) {
    const m = /^(\d{4})-(\d{2})$/.exec(ym || '');
    return m ? `${TR_MONTHS[parseInt(m[2], 10) - 1]} ${m[1]}` : '';
}

export function getLicenseFeeTier(mw) {
    const tiers = getFeeTable().tiers;
    return tiers.find(t => mw <= t.max) || tiers[tiers.length - 1];
}

function getProject(name) {
    return (Store.projects || []).find(p => p.name === name) || null;
}

function defaultUnitFor(projectName) {
    const n = String(projectName || '').toUpperCase();
    if (/\bRES\b/.test(n)) return 'türbinlerin';
    if (/\bGES\b/.test(n)) return 'panellerin';
    return 'ünitelerin';
}

function esc(s) {
    return escapeHtml(String(s == null ? '' : s));
}

const TABLE_BORDER = 'border:1px solid #444; padding:6px 8px; vertical-align:top;';
const th = (text, extra = '') => `<td style="${TABLE_BORDER} font-weight:bold; ${extra}">${text}</td>`;
const td = (text, extra = '') => `<td style="${TABLE_BORDER} ${extra}">${text}</td>`;

/** Bedel tablosu + "ÖDEME BİLGİLERİ" sütunu (tesis tamamlama şablonu) ya da yalnızca bedel satırı (önlisans). */
function feeTable(tier, fee, bedelTuru, withPaymentColumn, kistasNote = '') {
    const head = `<tr>
        ${th('Lisans Türü')}${th('Bedel Türü')}
        ${th('Bedel Kıstası (Kurulu Güç(P=MW), Bir yılda dağıtımı yapılan/yapılması öngörülen enerji miktarı (D=kWh))')}
        ${th('Bedel (TL)')}${withPaymentColumn ? th('ÖDEME BİLGİLERİ') : ''}
    </tr>`;
    const body = `<tr>
        ${td('Önlisans/Üretim Lisansı/OSB Üretim Önlisans/OSB Üretim Lisansı')}
        ${td(esc(bedelTuru))}
        ${td(esc(tier.label) + (kistasNote ? `<br><span style="font-size:0.9em;">${esc(kistasNote)}</span>` : ''))}
        ${td(withPaymentColumn ? `<b>${fmtMoney(fee)}</b>` : `${fmtMoney(fee)}TL`)}
        ${withPaymentColumn ? td(`<b>${esc(getPayment().bank)}<br>${esc(getPayment().account)}</b><br><br><b>${esc(getPayment().iban)}</b>`) : ''}
    </tr>`;
    return `<table class="mail-fee-table" style="border-collapse:collapse; border:1px solid #444; width:100%;">${head}${body}</table>`;
}

function bankTable() {
    return `<table class="mail-fee-table" style="border-collapse:collapse; border:1px solid #444; width:100%;">
        <tr><td colspan="3" style="${TABLE_BORDER} font-weight:bold; text-align:center;">${esc(getPayment().bank)}</td></tr>
        <tr>${th('SIRA', 'width:50px;')}${th('HESAP ADI (TL)', 'text-align:center;')}${th('IBAN NO', 'text-align:center;')}</tr>
        <tr>${td('1', 'text-align:center;')}${td(esc(getPayment().account))}${td(esc(getPayment().iban))}</tr>
    </table>`;
}

/**
 * Ünite / diğer tadiller için bedel tablosu (Kurul Kararı'ndaki sütunlarla):
 * Lisans Türü, Bedel Türü, Bedel Kıstası, Bedel. Banka bilgisi ikinci tabloda (bankTable).
 */
function tadilFeeTable(lic, kistas, fee) {
    const head = `<tr>
        ${th('Lisans Türü')}${th('Bedel Türü')}
        ${th('Bedel Kıstası (Kurulu Güç(P=MW), Bir yılda dağıtımı yapılan/yapılması öngörülen enerji miktarı (D=kWh))')}
        ${th('Bedel (TL)')}
    </tr>`;
    const body = `<tr>
        ${td(esc(lic.lisansTuruMetni))}
        ${td(esc(`${lic.Tadil} Bedeli`))}
        ${td(esc(kistas))}
        ${td(`${fmtMoney(fee)}TL`)}
    </tr>`;
    return `<table class="mail-fee-table" style="border-collapse:collapse; border:1px solid #444; width:100%;">${head}${body}</table>`;
}

// ---------------------------------------------------------------------------
// TEA başvuru bedeli (eski js/tea.js hesaplayıcısı, mantığı aynen taşındı)
// ---------------------------------------------------------------------------

/**
 * 4 senaryo: ilk başvuru (yeni güç × yeni fiyat), güç artıyor (eski güç × eski
 * fiyat + artış × yeni fiyat), güç aynı (eski güç × eski fiyat), güç azalıyor
 * (yeni güç × eski fiyat). Sonuca KDV eklenir.
 */
function calculateTeaFeeCase(lastMW, newMW) {
    const { lastMwRate, newMwRate, vatRate } = Store.teaFeeSettings || { lastMwRate: 5800, newMwRate: 11600, vatRate: 0.20 };
    let caseType, base;

    if (!lastMW || lastMW <= 0) {
        caseType = 'first';
        base = newMW * newMwRate;
    } else if (newMW > lastMW) {
        caseType = 'increase';
        base = (lastMW * lastMwRate) + ((newMW - lastMW) * newMwRate);
    } else if (newMW === lastMW) {
        caseType = 'same';
        base = lastMW * lastMwRate;
    } else {
        caseType = 'decrease';
        base = newMW * lastMwRate;
    }

    const total = base * (1 + vatRate);
    return { caseType, base, total, lastMwRate, newMwRate, vatRate };
}

// ---------------------------------------------------------------------------
// Şablonlar
// ---------------------------------------------------------------------------
//
// Her mailin KONUSU ve GÖVDESİ, {{degisken}} yer tutucuları içeren bir metindir ve
// Mail Hazırlığı > Taslak Ayarları'ndan düzenlenir (daVinciData/master.mailTemplates).
// Aşağıdakiler yalnızca VARSAYILAN metinlerdir. compute() tutarı hesaplar ve yer
// tutucuların değerlerini (vars) üretir; vars değerleri HTML'e hazırdır (kaçışlıdır),
// tablolar da birer değişkendir (bedel_tablosu, banka_tablosu).

/**
 * Proje önlisans aşamasındaysa "önlisans", üretim lisansı aşamasındaysa "lisans"
 * terimleri kullanılır: önlisans projesine giden mailde üretim lisansı ifadesi
 * geçmesin.
 */
function licenseWording(lisansTuru) {
    const onlisans = lisansTuru !== 'Üretim Lisansı';
    return onlisans
        ? { alma: 'önlisans alma bedeli', tadil: 'önlisans tadil', Tadil: 'Önlisans Tadil', lisansTuruMetni: 'Önlisans/OSB Üretim Önlisans' }
        : { alma: 'lisans alma bedeli', tadil: 'lisans tadil', Tadil: 'Lisans Tadil', lisansTuruMetni: 'Üretim Lisansı/OSB Üretim Lisansı' };
}

const COMMON_VARIABLES = [
    ['selamlama', 'Hitap + "merhaba," (örn. Emre Bey merhaba,); hitap boşsa "Merhaba,"'],
    ['proje', 'Seçilen projenin adı'],
    ['yil', 'Kurul Kararı yılı (Bedel Ayarları\'ndaki yıl)']
];

const FEE_VARIABLES = [
    ['bedel', 'Ödenecek tutar (örn. 92.200,00 TL)'],
    ['bedel_tablosu', 'Lisans türü / bedel türü / bedel kıstası / bedel tablosu'],
    ['banka_tablosu', 'EPDK banka, hesap adı ve IBAN tablosu'],
    ['dekont_aciklamasi', 'Dekont açıklamasına yazılacak metin']
];

/** Dekont açıklaması paragrafı: TEA hariç tüm EPDK tadil maillerinde bedel tablosundan sonra, banka tablosundan önce. */
const DEKONT_METNI = '<p>Ödeme için banka ve hesap bilgileri aşağıda sunulmaktadır. Dekont açıklamasına <b>“{{dekont_aciklamasi}}”</b> yazılmalıdır. Başvuru Sahibi – Lisans Sahibi tüzel kişiliğin adı ve VKN (Vergi Kimlik No) dekontta yer almalı; “Alıcı Unvanı” kısaltma yapılmaksızın eksiksiz “ENERJİ PİYASASI DÜZENLEME KURUMU” olarak yazılmalıdır.</p>';

const KAPANIS_METNI = '<p>Şimdiden teşekkür eder, iyi çalışmalar dileriz.</p>\n<p>Saygılarımızla,</p>';

function commonVars(ctx) {
    return {
        selamlama: ctx.greeting ? `${esc(ctx.greeting)} merhaba,` : 'Merhaba,',
        proje: esc(ctx.project),
        yil: String(getFeeTable().year)
    };
}

const TEMPLATES = {
    tesis_tamamlama: {
        label: 'Tesis Tamamlama Süre Uzatımı',
        hint: 'Üretim lisansında tesis tamamlanma süresinin uzatılması: Lisans Yönetmeliği m.43/9 uyarınca içinde bulunulan yılın lisans alma bedeli, tadil bedeli olarak alınır.',
        fields: [
            { id: 'mw', label: 'Projenin Mekanik Gücü (MW)', type: 'number', placeholder: 'Örn: 5,4', required: true },
            { id: 'sureSonu', label: 'Tesis Tamamlanma Süre Sonu', type: 'date', required: true },
            { id: 'unite', label: 'Üniteler', type: 'select', options: ['türbinlerin', 'ünitelerin', 'panellerin'] },
            { id: 'harcamaBaslangic', label: 'Harcama Tablosu Başlangıç Ayı', type: 'month', hint: 'Boş bırakırsanız cümlede ay geçmez.' },
            { id: 'manualFee', label: 'Bedeli Elle Gir (TL, opsiyonel)', type: 'number', placeholder: 'Boşsa tablo bedeli kullanılır' }
        ],
        variables: [
            ...COMMON_VARIABLES,
            ['sure_sonu', 'Tesis tamamlanma süre sonu (gg.aa.yyyy)'],
            ['unite', 'türbinlerin / ünitelerin / panellerin'],
            ['harcama_cumlesi', 'Harcama tablosu cümlesi (başlangıç ayına göre)'],
            ...FEE_VARIABLES
        ],
        defaultSubject: '{{proje}} - Tesis Tamamlama Süre Uzatımı Tadil Bedeli',
        defaultBody: `<p>{{selamlama}}</p>
<p>{{proje}} projesi için üretim lisansında tesis tamamlanma tarihi süre sonu <b>{{sure_sonu}}</b> olarak belirlendiğinden, söz konusu {{unite}} süresinin uzatılması için başvuruda bulunmamız gerekecektir.</p>
<p>Lisans yönetmeliği m.43/9’a göre Üretim lisanslarında tesis tamamlanma süresinin uzatılmasına ilişkin tadillerde, lisansa konu tesis için içerisinde bulunulan yıl itibarıyla geçerli olan <i>lisans alma bedeli kadar tutar</i>, lisans tadil bedeli olarak alınır. Bu nedenle aşağıdaki tabloda belirtildiği üzere <b>{{bedel}}</b> tutarında tadil bedeli yatırılması gerekecektir. {{harcama_cumlesi}}</p>
{{bedel_tablosu}}
${DEKONT_METNI}
{{banka_tablosu}}
${KAPANIS_METNI}`,
        sample: { values: { mw: 9.8, sureSonu: '2026-12-31', unite: 'ünitelerin', harcamaBaslangic: '2024-11', manualFee: 0 }, ctx: { project: 'ÖRNEK GES', greeting: 'Emre Bey', company: 'NESMA' } },
        compute(v, ctx) {
            const tier = getLicenseFeeTier(v.mw);
            const fee = v.manualFee > 0 ? v.manualFee : tier.fee;
            const harcama = fmtMonth(v.harcamaBaslangic);
            const harcamaCumle = harcama
                ? `Ayrıca süre uzatımı başvurusunda kullanmak üzere ${harcama}’ten itibaren yapılan ödemeleri içeren ekteki harcama tablosunun doldurulması ve harcamaları gösteren belgelerin de ibraz edilmesi gerekmektedir.`
                : 'Ayrıca süre uzatımı başvurusunda kullanmak üzere yapılan ödemeleri içeren ekteki harcama tablosunun doldurulması ve harcamaları gösteren belgelerin de ibraz edilmesi gerekmektedir.';
            return {
                amount: fee,
                amountLabel: `Tadil Bedeli (${tier.label})`,
                vars: {
                    ...commonVars(ctx),
                    sure_sonu: fmtDate(v.sureSonu),
                    unite: esc(v.unite),
                    harcama_cumlesi: harcamaCumle,
                    bedel: `${fmtMoney(fee)} TL`,
                    bedel_tablosu: feeTable(tier, fee, 'Önlisans/Lisans alma bedeli*', false),
                    banka_tablosu: bankTable(),
                    dekont_aciklamasi: esc(`${ctx.project} Tesis Tamamlama Süresinin Uzatılması Tadil Bedeli`)
                }
            };
        }
    },

    onlisans_sure: {
        label: 'Önlisans Süre Uzatımı',
        hint: 'Önlisans süresinin uzatılması: Lisans Yönetmeliği m.43/9 uyarınca önlisans alma bedelinin tamamı tadil bedeli olarak alınır. Bedel aralığı mekanik güç + depolama kapasitesi toplamına göre belirlenir.',
        fields: [
            { id: 'mw', label: 'Projenin Mekanik Gücü (MW)', type: 'number', placeholder: 'Örn: 75', required: true },
            { id: 'storage', label: 'Depolama Kapasitesi (MW, varsa)', type: 'number', placeholder: 'Yoksa boş bırakın', hint: 'Varsa mekanik güce eklenir; bedel toplam güce göre çıkar.' },
            { id: 'manualFee', label: 'Bedeli Elle Gir (TL, opsiyonel)', type: 'number', placeholder: 'Boşsa tablo bedeli kullanılır' }
        ],
        variables: [...COMMON_VARIABLES, ...FEE_VARIABLES],
        defaultSubject: '{{proje}} - Önlisans Süre Uzatımı Tadil Bedeli',
        defaultBody: `<p>{{selamlama}}</p>
<p>{{proje}} projesinde önlisans süre uzatımı başvurusu için Elektrik Piyasası Lisans Yönetmeliği 43.Madde 9.bendinde yer alan; <i>“önlisans süresinin uzatılmasına ilişkin tadillerde önlisans alma bedelinin tamamı tadil bedeli olarak alınır”</i> ibaresine göre ve buna istinaden Elektrik Piyasasında {{yil}} yılında uygulanacak olan önlisans ve lisans alma, yıllık lisans, lisans yenileme, önlisans ve lisans tadili, önlisans ve lisans sureti çıkartma bedellerine ilişkin olarak alınan Kurul Kararına göre:</p>
{{bedel_tablosu}}
<p>EPDK’ya <b>{{bedel}}</b> tutarında önlisans tadil bedeli yatırılması gerekmektedir. Ödeme için banka ve hesap bilgileri aşağıda sunulmaktadır. Dekont açıklamasına <b>“{{dekont_aciklamasi}}”</b> yazılmalıdır. Başvuru Sahibi – Lisans Sahibi tüzel kişiliğin adı ve VKN (Vergi Kimlik No) dekontta yer almalı; “Alıcı Unvanı” kısaltma yapılmaksızın eksiksiz “ENERJİ PİYASASI DÜZENLEME KURUMU” olarak yazılmalıdır.</p>
{{banka_tablosu}}
<p>Saygılarımla,</p>`,
        sample: { values: { mw: 45, storage: 10, manualFee: 0 }, ctx: { project: 'ÖRNEK RES', greeting: 'Nurdan Hanım', company: 'NESMA' } },
        compute(v, ctx) {
            const storage = v.storage > 0 ? v.storage : 0;
            const power = v.mw + storage;
            const tier = getLicenseFeeTier(power);
            const kistasNote = storage > 0
                ? `Mekanik güç ${fmtMw(v.mw)} MW + depolama kapasitesi ${fmtMw(storage)} MW = ${fmtMw(power)} MW`
                : '';
            const fee = v.manualFee > 0 ? v.manualFee : tier.fee;
            return {
                amount: fee,
                amountLabel: `Önlisans Tadil Bedeli (${storage > 0 ? fmtMw(power) + ' MW: ' : ''}${tier.label})`,
                vars: {
                    ...commonVars(ctx),
                    bedel: `${fmtMoney(fee)} TL`,
                    bedel_tablosu: feeTable(tier, fee, 'Lisans alma bedeli*', false, kistasNote),
                    banka_tablosu: bankTable(),
                    dekont_aciklamasi: esc(`${ctx.project} Önlisans Süresinin Uzatılması Tadil Bedeli`)
                }
            };
        }
    },

    tea: {
        label: 'TEA Başvurusu',
        hint: 'TÜBİTAK BİLGEM TEA başvuru bedeli: ilk başvuruda yeni güç × yeni birim fiyat; güç artıyorsa eski güç × eski fiyat + artış × yeni fiyat; sonuca KDV eklenir.',
        fields: [
            { id: 'lastMw', label: 'Son Başvuru Mekanik Gücü (MW)', type: 'number', placeholder: 'İlk başvuruysa boş bırakın' },
            { id: 'mw', label: 'Yapılacak Başvurunun Mekanik Gücü (MW)', type: 'number', placeholder: 'Örn: 15', required: true }
        ],
        variables: [
            ...COMMON_VARIABLES,
            ['sirket', 'Projenin şirketi'],
            ['toplam_tutar', 'KDV dahil toplam tutar (örn. 208.800,00₺)'],
            ['hesap_satiri', 'Hesaplama satırı (MW x birim fiyat = tutar)'],
            ['kdv_orani', 'KDV oranı (yüzde olarak, örn. 20)'],
            ['alici', 'Ödemenin gönderileceği kişi/kurum'],
            ['sube', 'Banka şubesi'],
            ['iban', 'IBAN']
        ],
        defaultSubject: '{{proje}} - TEA Başvuru Bedeli',
        defaultBody: `<p>{{selamlama}}</p>
<div>{{proje}} için yapacağımız TEA başvurusu için ödenmesi gereken tutar <b>{{toplam_tutar}}</b> olup ücretin detaylarını aşağıda bilgilerinize sunarım:</div>
<br>
<div><b>Ödeme Yapılacak Hesap Bilgileri:</b></div>
<br>
<table class="tea-email-table">
<tr><td>Gönderilen Kişi</td><td>: {{alici}}</td></tr>
<tr><td>Yatırılacak Tutar</td><td>: {{hesap_satiri}} + %{{kdv_orani}} KDV'dir. Vergiler Dahil Ödenecek Tutar: <b>{{toplam_tutar}}</b>'dir.</td></tr>
<tr><td>Şube</td><td>: {{sube}}</td></tr>
<tr><td>IBAN</td><td>: <b>{{iban}}</b></td></tr>
<tr><td>Açıklama</td><td>: <b>{{sirket}}-{{proje}} TEA Başvuru Bedeli</b></td></tr>
</table>
<br>
<div>Saygılarımla,</div>`,
        sample: { values: { lastMw: 10, mw: 15 }, ctx: { project: 'ÖRNEK RES', greeting: 'Emre Bey', company: 'NESMA' } },
        compute(v, ctx) {
            const calc = calculateTeaFeeCase(v.lastMw || 0, v.mw);
            const { caseType, lastMwRate, newMwRate, vatRate, base, total } = calc;
            const lastMW = v.lastMw || 0;
            const newMW = v.mw;
            let calcLine;
            if (caseType === 'increase') {
                calcLine = `${fmtMw(lastMW)} MW x ${fmtMoney(lastMwRate)}₺ + (${fmtMw(newMW)} MW - ${fmtMw(lastMW)} MW) x ${fmtMoney(newMwRate)}₺ = <b>${fmtMoney(base)}₺</b>`;
            } else if (caseType === 'same') {
                calcLine = `${fmtMw(lastMW)} MW x ${fmtMoney(lastMwRate)}₺ = <b>${fmtMoney(base)}₺</b>`;
            } else if (caseType === 'decrease') {
                calcLine = `${fmtMw(newMW)} MW x ${fmtMoney(lastMwRate)}₺ = <b>${fmtMoney(base)}₺</b>`;
            } else {
                calcLine = `${fmtMw(newMW)} MW x ${fmtMoney(newMwRate)}₺ = <b>${fmtMoney(base)}₺</b>`;
            }
            const s = Store.teaFeeSettings || {};
            return {
                amount: total,
                amountLabel: 'TEA Başvuru Bedeli (KDV Dahil)',
                vars: {
                    ...commonVars(ctx),
                    sirket: esc(ctx.company || ''),
                    toplam_tutar: `${fmtMoney(total)}₺`,
                    hesap_satiri: calcLine,
                    kdv_orani: String(Math.round(vatRate * 100)),
                    alici: esc(s.recipientName || 'Tübitak Bilgem'),
                    sube: esc(s.bankBranch || 'Türkiye Cumhuriyeti Ziraat Bankası A.Ş. Gebze Kurumsal Şube'),
                    iban: esc(s.iban || 'TR96 0001 0020 8534 7551 9667 26')
                }
            };
        }
    },

    kurulu_guc_artisi: {
        label: 'Saha / KGÜT / ÜKT',
        hint: 'Saha koordinat, kurulu güç / ünite (KGÜT) ve ünite koordinat (ÜKT) tadilleri: asgari tadil bedeli; kurulu güç artışı değer aralığını aşıyorsa aralıkların alma bedeli farkı (yerli/yenilenebilir tesislerde %10\'u, asgariden az olamaz). Mailde yönetmelik maddesi belirtilmez. Metni göndermeden gözden geçirin.',
        fields: [
            { id: 'tadilTuru', label: 'Tadil Türü', type: 'select', options: ['Saha Koordinat Tadili', 'Kurulu Güç / Ünite Tadili', 'Ünite Koordinat Tadili'] },
            { id: 'lisansTuru', label: 'Proje Aşaması', type: 'select', options: ['Önlisans', 'Üretim Lisansı'] },
            { id: 'lastMw', label: 'Mevcut Mekanik Güç (MW)', type: 'number', placeholder: 'Yalnızca güç artışında doldurun' },
            { id: 'mw', label: 'Yeni Mekanik Güç (MW)', type: 'number', placeholder: 'Yalnızca güç artışında doldurun' },
            { id: 'renewable', label: 'Yerli / yenilenebilir kaynaklı tesis (bedelin %10\'u alınır)', type: 'checkbox', default: true },
            { id: 'manualFee', label: 'Bedeli Elle Gir (TL, opsiyonel)', type: 'number', placeholder: 'Boşsa hesaplanan bedel kullanılır' }
        ],
        variables: [
            ...COMMON_VARIABLES,
            ['tadil_turu', 'Seçilen tadil türü (örn. Saha Koordinat Tadili)'],
            ['lisans_tadil', '"önlisans tadil" ya da "lisans tadil" (Proje Aşaması seçimine göre)'],
            ['hesap_aciklamasi', 'Bedelin nasıl hesaplandığını anlatan cümle'],
            ...FEE_VARIABLES
        ],
        defaultSubject: '{{proje}} - {{tadil_turu}} Bedeli',
        defaultBody: `<p>{{selamlama}}</p>
<p>{{proje}} projesinde yapılacak {{tadil_turu}} için Elektrik Piyasası Lisans Yönetmeliği uyarınca {{yil}} yılında uygulanacak bedellere ilişkin Kurul Kararı’nda tanımlı {{lisans_tadil}} bedeli yatırılması gerekmektedir.</p>
<p>{{hesap_aciklamasi}}</p>
{{bedel_tablosu}}
${DEKONT_METNI}
{{banka_tablosu}}
${KAPANIS_METNI}`,
        sample: { values: { tadilTuru: 'Saha Koordinat Tadili', lisansTuru: 'Önlisans', lastMw: 0, mw: 0, renewable: true, manualFee: 0 }, ctx: { project: 'ÖRNEK GES', greeting: 'Emre Bey', company: 'NESMA' } },
        compute(v, ctx) {
            const lic = licenseWording(v.lisansTuru);
            const min = getFeeTable().minTadilFee;
            const oldTier = v.lastMw > 0 ? getLicenseFeeTier(v.lastMw) : null;
            const newTier = v.mw > 0 ? getLicenseFeeTier(v.mw) : null;
            const crossesTier = !!(oldTier && newTier && v.mw > v.lastMw && newTier.fee > oldTier.fee);

            let computed = min;
            let explain = ''; // güç artışı aralık atlamıyorsa ayrıca açıklama gerekmez
            if (crossesTier) {
                const diff = newTier.fee - oldTier.fee;
                const base = v.renewable ? diff * getFeeTable().renewableTadilRatio : diff;
                computed = Math.max(min, base);
                explain = `Kurulu güç artışı (${fmtMw(v.lastMw)} MW → ${fmtMw(v.mw)} MW) ${oldTier.label} aralığından ${newTier.label} aralığına geçtiğinden, aralıkların ${lic.alma} farkı (${fmtMoney(newTier.fee)} TL − ${fmtMoney(oldTier.fee)} TL = ${fmtMoney(diff)} TL)${v.renewable ? ' üzerinden yerli ve yenilenebilir enerji kaynaklarına dayalı tesisler için %10’u' : ''} dikkate alınmakta olup bu bedel asgari tadil bedeli olan ${fmtMoney(min)} TL’den az olamaz.`;
            }
            const fee = v.manualFee > 0 ? v.manualFee : computed;
            // Bedel kıstası: Kurul Kararı'nda ünite tadilleri "Asgari"; güç artışı aralık
            // atlıyorsa artışın kendisi yazılır.
            const kistas = crossesTier ? `Kurulu güç artışı (${fmtMw(v.lastMw)} MW → ${fmtMw(v.mw)} MW)` : 'Asgari';
            return {
                amount: fee,
                amountLabel: `${v.tadilTuru} - ${lic.Tadil} Bedeli`,
                vars: {
                    ...commonVars(ctx),
                    tadil_turu: esc(v.tadilTuru),
                    lisans_tadil: lic.tadil,
                    hesap_aciklamasi: explain
                        ? `${explain} Bu doğrultuda <b>${fmtMoney(fee)} TL</b> tutarında tadil bedeli yatırılması gerekecektir.`
                        : `Yatırılması gereken tadil bedeli <b>${fmtMoney(fee)} TL</b>’dir.`,
                    bedel: `${fmtMoney(fee)} TL`,
                    bedel_tablosu: tadilFeeTable(lic, kistas, fee),
                    banka_tablosu: bankTable(),
                    dekont_aciklamasi: esc(`${ctx.project} ${v.tadilTuru.replace(/ Tadili$/, '')} Tadil Bedeli`)
                }
            };
        }
    },

    diger_tadil: {
        label: 'Diğer Tadil (Asgari Tadil Bedeli)',
        hint: 'Kurul Kararı tablosundaki asgari tadil bedeli (önlisans veya lisans). Mailde yönetmelik maddesi belirtilmez. Metni göndermeden gözden geçirin.',
        fields: [
            { id: 'tadilAdi', label: 'Tadil Konusu', type: 'text', placeholder: 'Örn: ortaklık yapısı değişikliği', required: true },
            { id: 'lisansTuru', label: 'Proje Aşaması', type: 'select', options: ['Önlisans', 'Üretim Lisansı'] },
            { id: 'manualFee', label: 'Bedeli Elle Gir (TL, opsiyonel)', type: 'number', placeholder: 'Boşsa Kurul Kararı asgari bedeli' }
        ],
        variables: [
            ...COMMON_VARIABLES,
            ['tadil_konusu', 'Yazdığınız tadil konusu'],
            ['lisans_tadil', '"önlisans tadil" ya da "lisans tadil" (Proje Aşaması seçimine göre)'],
            ...FEE_VARIABLES
        ],
        defaultSubject: '{{proje}} - Tadil Bedeli',
        defaultBody: `<p>{{selamlama}}</p>
<p>{{proje}} projesinde yapılacak {{tadil_konusu}} tadili için Elektrik Piyasası Lisans Yönetmeliği uyarınca {{yil}} yılında uygulanacak bedellere ilişkin Kurul Kararı’nda tanımlı asgari {{lisans_tadil}} bedeli olan <b>{{bedel}}</b> tutarında tadil bedeli yatırılması gerekmektedir.</p>
{{bedel_tablosu}}
${DEKONT_METNI}
{{banka_tablosu}}
${KAPANIS_METNI}`,
        sample: { values: { tadilAdi: 'ortaklık yapısı değişikliği', lisansTuru: 'Önlisans', manualFee: 0 }, ctx: { project: 'ÖRNEK GES', greeting: 'Emre Bey', company: 'NESMA' } },
        compute(v, ctx) {
            const lic = licenseWording(v.lisansTuru);
            const fee = v.manualFee > 0 ? v.manualFee : getFeeTable().minTadilFee;
            return {
                amount: fee,
                amountLabel: `Asgari ${lic.Tadil} Bedeli`,
                vars: {
                    ...commonVars(ctx),
                    tadil_konusu: esc(v.tadilAdi),
                    lisans_tadil: lic.tadil,
                    bedel: `${fmtMoney(fee)} TL`,
                    bedel_tablosu: tadilFeeTable(lic, 'Asgari', fee),
                    banka_tablosu: bankTable(),
                    dekont_aciklamasi: esc(`${ctx.project} ${v.tadilAdi} Tadil Bedeli`)
                }
            };
        }
    }
};

// ---------------------------------------------------------------------------
// Taslak metinlerinin işlenmesi (Ayarlar'da düzenlenenler + varsayılanlar)
// ---------------------------------------------------------------------------

/** Bu mail için geçerli konu ve gövde: Ayarlar'da kaydedilmiş varsa o, yoksa varsayılan. */
export function getTemplateParts(key) {
    const tpl = TEMPLATES[key];
    const saved = Store.mailTemplates && Store.mailTemplates[key];
    return {
        subject: saved && typeof saved.subject === 'string' ? saved.subject : tpl.defaultSubject,
        body: saved && typeof saved.body === 'string' ? saved.body : tpl.defaultBody
    };
}

/** {{degisken}} yer tutucularını değerleriyle değiştirir; bilinmeyenler olduğu gibi kalır (fark edilsin diye). */
function renderMailTemplate(text, vars) {
    return String(text || '').replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (m, k) => (k in vars ? vars[k] : m));
}

/** HTML parçasını düz metne çevirir (konu satırı için). */
function plainText(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return (d.textContent || '').trim();
}

/** Ayarlar'da düzenlenen taslak yalnızca ekibe aittir; yine de çalıştırılabilir içerik ayıklanır. */
function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    doc.querySelectorAll('script, style, iframe, object, embed, link, meta, base, form').forEach(n => n.remove());
    doc.body.querySelectorAll('*').forEach(node => {
        [...node.attributes].forEach(a => {
            const name = a.name.toLowerCase();
            if (name.startsWith('on')) node.removeAttribute(a.name);
            else if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(a.value)) node.removeAttribute(a.name);
        });
    });
    return doc.body.innerHTML;
}

// ---------------------------------------------------------------------------
// Arayüz
// ---------------------------------------------------------------------------

const MEMO_KEY = 'mailPrepMemo';
let bound = false;

function readMemo() {
    try { return JSON.parse(localStorage.getItem(MEMO_KEY) || '{}'); } catch (e) { return {}; }
}

function writeMemo(patch) {
    try { localStorage.setItem(MEMO_KEY, JSON.stringify({ ...readMemo(), ...patch })); } catch (e) { /* depolama kapalı: sorun değil */ }
}

const el = (id) => document.getElementById(id);

function currentTemplateKey() {
    const sel = el('mailPrepType');
    return sel && TEMPLATES[sel.value] ? sel.value : Object.keys(TEMPLATES)[0];
}

function renderFields(key) {
    const tpl = TEMPLATES[key];
    const host = el('mailPrepFields');
    if (!host) return;
    const memo = readMemo();

    host.innerHTML = tpl.fields.map(f => {
        const id = `mailPrepField_${f.id}`;
        if (f.type === 'checkbox') {
            return `<label class="mailprep-check"><input type="checkbox" id="${id}" ${f.default ? 'checked' : ''}> <span>${esc(f.label)}</span></label>`;
        }
        let input;
        if (f.type === 'select') {
            const chosen = (f.id === 'lisansTuru' || f.id === 'tadilTuru') ? memo['sel_' + f.id] : '';
            input = `<select id="${id}" class="glass-input">${f.options.map(o => `<option value="${esc(o)}" ${o === chosen ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
        } else {
            const remembered = f.id === 'harcamaBaslangic' ? (memo.harcamaBaslangic || '') : '';
            input = `<input type="${f.type}" id="${id}" class="form-input" ${f.type === 'number' ? 'step="0.01" min="0"' : ''}
                placeholder="${esc(f.placeholder || '')}" value="${esc(remembered)}">`;
        }
        return `<div class="form-group"><label for="${id}">${esc(f.label)}${f.required ? ' *' : ''}</label>${input}${f.hint ? `<p class="mailprep-hint">${esc(f.hint)}</p>` : ''}</div>`;
    }).join('');

    host.querySelectorAll('input, select').forEach(node => {
        node.addEventListener('input', recompute);
        node.addEventListener('change', recompute);
    });

    const hint = el('mailPrepTypeHint');
    if (hint) hint.textContent = tpl.hint || '';
    const settingsBtn = el('mailPrepTeaSettingsBtn');
    if (settingsBtn) settingsBtn.style.display = '';
}

/** Proje seçilince: süre sonu ve ünite adı otomatik gelir. */
function applyProjectDefaults() {
    const projectName = el('mailPrepProject')?.value;
    const project = getProject(projectName);
    if (!project) return;

    const sureSonu = el('mailPrepField_sureSonu');
    if (sureSonu) {
        const d = formatDateForInput(project.licenceExpiry || project.constructionDeadline);
        if (d) sureSonu.value = d;
    }
    const unite = el('mailPrepField_unite');
    if (unite) unite.value = defaultUnitFor(projectName);
}

function readValues(tpl) {
    const values = {};
    tpl.fields.forEach(f => {
        const node = el(`mailPrepField_${f.id}`);
        if (!node) return;
        if (f.type === 'checkbox') values[f.id] = node.checked;
        else if (f.type === 'number') values[f.id] = parseFloat(String(node.value).replace(',', '.')) || 0;
        else values[f.id] = (node.value || '').trim();
    });
    return values;
}

function recompute() {
    const tpl = TEMPLATES[currentTemplateKey()];
    const project = el('mailPrepProject')?.value || '';
    const result = el('mailPrepResult');
    const empty = el('mailPrepEmpty');
    if (!result || !empty) return;

    const values = readValues(tpl);

    // Zorunlu alanlar tamam mı?
    const missing = tpl.fields.some(f => {
        if (!f.required) return false;
        const v = values[f.id];
        return f.type === 'number' ? !(v > 0) : !v;
    });
    if (!project || missing) {
        result.style.display = 'none';
        empty.style.display = '';
        return;
    }

    const out = tpl.compute(values, {
        project,
        greeting: (el('mailPrepGreeting')?.value || '').trim(),
        company: getProject(project)?.company || ''
    });

    el('mailPrepAmountLabel').textContent = out.amountLabel;
    el('mailPrepAmount').textContent = `${fmtMoney(out.amount)} ₺`;
    const parts = getTemplateParts(currentTemplateKey());
    el('mailPrepSubject').value = plainText(renderMailTemplate(parts.subject, out.vars));
    el('mailPrepPreview').innerHTML = sanitizeHtml(renderMailTemplate(parts.body, out.vars));
    result.style.display = '';
    empty.style.display = 'none';
}

async function copyRich(html, text, okMessage) {
    try {
        if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': new Blob([html], { type: 'text/html' }),
                    'text/plain': new Blob([text], { type: 'text/plain' })
                })
            ]);
        } else {
            await navigator.clipboard.writeText(text);
        }
        showToast(okMessage, 'success');
    } catch (err) {
        showToast('Kopyalama başarısız oldu, metni elle seçip kopyalayabilirsiniz.', 'error');
    }
}

function tierRowHtml(t, isLast, canDelete) {
    return `<tr>
        <td><div class="mailfee-range">
            <input type="number" class="form-input mailfee-min" step="0.01" min="0" value="${t.min ?? ''}" required>
            <span>&lt; P ${isLast ? '' : '≤'}</span>
            ${isLast
                ? '<span class="mailfee-open">(üst sınır yok)</span>'
                : `<input type="number" class="form-input mailfee-max" step="0.01" min="0" value="${t.max ?? ''}" required>`}
            <span>MW</span>
        </div></td>
        <td><input type="number" class="form-input mailfee-fee" step="0.01" min="0" value="${t.fee ?? ''}" required></td>
        <td>${canDelete ? '<button type="button" class="tea-icon-btn mailfee-del" title="Bu aralığı sil">✕</button>' : ''}</td>
    </tr>`;
}

function fillTierRows(tiers) {
    const body = el('mailFeeTiersBody');
    if (!body) return;
    body.innerHTML = tiers.map((t, i) => tierRowHtml(t, i === tiers.length - 1, i !== tiers.length - 1 && tiers.length > 2)).join('');
}

/** Satır sınırlarını ve silme düğmelerini yeniden hizalar (üst sınır -> sonraki satırın alt sınırı). */
function syncTierRows() {
    const rows = [...(el('mailFeeTiersBody')?.querySelectorAll('tr') || [])];
    rows.forEach((tr, i) => {
        const del = tr.lastElementChild;
        const isLast = i === rows.length - 1;
        if (del) del.innerHTML = (!isLast && rows.length > 2) ? '<button type="button" class="tea-icon-btn mailfee-del" title="Bu aralığı sil">✕</button>' : '';
        if (i > 0) {
            const prevMax = rows[i - 1].querySelector('.mailfee-max')?.value;
            const minInput = tr.querySelector('.mailfee-min');
            if (minInput && prevMax !== undefined) minInput.value = prevMax;
        }
    });
}

function fillFeeSettingsForm(settings) {
    el('mailFeeYear').value = settings.year;
    el('mailFeeMinTadil').value = settings.minTadilFee;
    el('mailFeeRenewablePct').value = Math.round(settings.renewableRatio * 100);
    fillTierRows(settings.tiers.map((t, i, arr) => ({
        min: t.min != null ? t.min : (i === 0 ? 0 : arr[i - 1].max),
        max: t.max,
        fee: t.fee
    })));
    el('mailFeeBank').value = settings.payment.bank;
    el('mailFeeAccount').value = settings.payment.account;
    el('mailFeeIban').value = settings.payment.iban;
}

/** Formdaki bedel tablosunu okur; geçersizse hata metni döner. */
function readFeeSettingsForm() {
    const rows = [...(el('mailFeeTiersBody')?.querySelectorAll('tr') || [])];
    if (!rows.length) return { error: 'Bedel aralığı bulunamadı.' };
    const tiers = [];
    let prevMax = 0;
    for (let i = 0; i < rows.length; i++) {
        const tr = rows[i];
        const isLast = i === rows.length - 1;
        const min = parseFloat(tr.querySelector('.mailfee-min')?.value);
        const fee = parseFloat(tr.querySelector('.mailfee-fee')?.value);
        if (!(min >= 0)) return { error: `${i + 1}. satırın alt sınırı geçersiz.` };
        if (!(fee >= 0)) return { error: `${i + 1}. satırın bedeli geçersiz.` };
        if (Math.abs(min - prevMax) > 1e-9) {
            return { error: `${i + 1}. satırın alt sınırı (${min}), bir önceki satırın üst sınırına (${prevMax}) eşit olmalı; aralıklar kesintisiz devam etmeli.` };
        }
        if (isLast) {
            tiers.push({ min, max: null, fee });
        } else {
            const max = parseFloat(tr.querySelector('.mailfee-max')?.value);
            if (!(max > min)) return { error: `${i + 1}. satırın üst sınırı alt sınırdan büyük olmalı.` };
            tiers.push({ min, max, fee });
            prevMax = max;
        }
    }
    return {
        value: {
            year: parseInt(el('mailFeeYear').value, 10) || DEFAULT_MAIL_FEE_SETTINGS.year,
            source: '',
            minTadilFee: parseFloat(el('mailFeeMinTadil').value) || 0,
            renewableRatio: (parseFloat(el('mailFeeRenewablePct').value) || 0) / 100,
            tiers,
            payment: {
                bank: el('mailFeeBank').value.trim(),
                account: el('mailFeeAccount').value.trim(),
                iban: el('mailFeeIban').value.trim()
            }
        }
    };
}

function initFeeSettingsModal() {
    const settingsBtn = el('mailPrepTeaSettingsBtn');
    const settingsModal = el('teaFeeSettingsModal');
    const settingsForm = el('teaFeeSettingsForm');
    const settingsClose = el('teaFeeSettingsModalClose');
    const settingsCancel = el('teaFeeSettingsCancel');
    const closeSettingsModal = () => settingsModal && settingsModal.classList.remove('show');

    if (settingsBtn && settingsModal) {
        settingsBtn.onclick = () => {
            const table = getFeeTable();
            fillFeeSettingsForm({
                year: table.year,
                minTadilFee: table.minTadilFee,
                renewableRatio: table.renewableTadilRatio,
                tiers: table.tiers.map(t => ({ min: t.min, max: t.max === Infinity ? null : t.max, fee: t.fee })),
                payment: getPayment()
            });
            const s = Store.teaFeeSettings || {};
            el('teaSettingLastRate').value = s.lastMwRate ?? 5800;
            el('teaSettingNewRate').value = s.newMwRate ?? 11600;
            el('teaSettingVatRate').value = Math.round((s.vatRate ?? 0.20) * 100);
            el('teaSettingRecipientName').value = s.recipientName || 'Tübitak Bilgem';
            el('teaSettingBankBranch').value = s.bankBranch || 'Türkiye Cumhuriyeti Ziraat Bankası A.Ş. Gebze Kurumsal Şube';
            el('teaSettingIban').value = s.iban || 'TR96 0001 0020 8534 7551 9667 26';
            settingsModal.classList.add('show');
        };
    }
    if (settingsClose) settingsClose.onclick = closeSettingsModal;
    if (settingsCancel) settingsCancel.onclick = closeSettingsModal;

    const tiersBody = el('mailFeeTiersBody');
    if (tiersBody) {
        // Üst sınır yazılınca sonraki satırın alt sınırı kendiliğinden eşitlenir.
        tiersBody.addEventListener('input', (e) => {
            if (e.target.classList.contains('mailfee-max')) syncTierRows();
        });
        tiersBody.addEventListener('click', (e) => {
            const del = e.target.closest('.mailfee-del');
            if (!del) return;
            del.closest('tr').remove();
            syncTierRows();
        });
    }
    el('mailFeeAddTierBtn')?.addEventListener('click', () => {
        const rows = [...(tiersBody?.querySelectorAll('tr') || [])];
        if (rows.length < 1) return;
        const lastRow = rows[rows.length - 1];
        const prevRow = rows[rows.length - 2];
        const prevMax = prevRow ? prevRow.querySelector('.mailfee-max')?.value : '0';
        // Son (üst sınırsız) satırın önüne, alt sınırı bir önceki üst sınır olan yeni satır.
        const holder = document.createElement('tbody');
        holder.innerHTML = tierRowHtml({ min: prevMax, max: '', fee: '' }, false, true);
        tiersBody.insertBefore(holder.firstElementChild, lastRow);
        const lastMin = lastRow.querySelector('.mailfee-min');
        if (lastMin) lastMin.value = '';
        syncTierRows();
    });

    el('mailFeeResetBtn')?.addEventListener('click', () => {
        if (!confirm('Kurul Kararı 2026 değerleri forma yüklenecek (Kaydet\'e basana kadar kalıcı olmaz). Devam edilsin mi?')) return;
        fillFeeSettingsForm(DEFAULT_MAIL_FEE_SETTINGS);
    });

    if (settingsForm) {
        settingsForm.onsubmit = (e) => {
            e.preventDefault();
            const parsed = readFeeSettingsForm();
            if (parsed.error) {
                showToast(parsed.error, 'warning');
                return;
            }
            Store.setMailFeeSettings(parsed.value);
            Store.setTeaFeeSettings({
                lastMwRate: parseFloat(el('teaSettingLastRate').value) || 0,
                newMwRate: parseFloat(el('teaSettingNewRate').value) || 0,
                vatRate: (parseFloat(el('teaSettingVatRate').value) || 0) / 100,
                recipientName: el('teaSettingRecipientName').value.trim(),
                bankBranch: el('teaSettingBankBranch').value.trim(),
                iban: el('teaSettingIban').value.trim()
            });
            if (saveData()) {
                closeSettingsModal();
                showToast('Bedel ve ödeme ayarları güncellendi', 'success');
                recompute();
            }
        };
    }
}

/** Sayfa her açıldığında/veri yenilendiğinde: proje listesini tazele (seçimi koru). */
export function renderMailPrep() {
    const select = el('mailPrepProject');
    if (!select) return;
    const current = select.value;
    const names = [...new Set((Store.projects || []).map(p => p.name))].sort((a, b) => a.localeCompare(b, 'tr'));
    select.innerHTML = '<option value="">Proje Seçiniz...</option>' +
        names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
    if (names.includes(current)) select.value = current;
    recompute();
}

export function initMailPrep() {
    if (bound) return;
    const typeSelect = el('mailPrepType');
    if (!typeSelect) return;
    bound = true;

    typeSelect.innerHTML = Object.entries(TEMPLATES)
        .map(([key, t]) => `<option value="${key}">${esc(t.label)}</option>`).join('');

    const memo = readMemo();
    const greeting = el('mailPrepGreeting');
    if (greeting && memo.greeting) greeting.value = memo.greeting;

    renderFields(currentTemplateKey());

    typeSelect.addEventListener('change', () => {
        renderFields(currentTemplateKey());
        applyProjectDefaults();
        recompute();
    });
    el('mailPrepProject').addEventListener('change', () => {
        applyProjectDefaults();
        recompute();
    });
    greeting?.addEventListener('input', () => {
        writeMemo({ greeting: greeting.value.trim() });
        recompute();
    });
    // Harcama başlangıç ayı bir sonraki mail için hatırlanır
    el('mailPrepFields')?.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'mailPrepField_harcamaBaslangic') {
            writeMemo({ harcamaBaslangic: e.target.value });
        }
        if (e.target && (e.target.id === 'mailPrepField_lisansTuru' || e.target.id === 'mailPrepField_tadilTuru')) {
            writeMemo({ ['sel_' + e.target.id.replace('mailPrepField_', '')]: e.target.value });
        }
    });

    el('mailPrepCopyBtn')?.addEventListener('click', () => {
        const preview = el('mailPrepPreview');
        if (preview) copyRich(preview.innerHTML, preview.innerText, 'Mail metni kopyalandı');
    });
    el('mailPrepCopySubjectBtn')?.addEventListener('click', () => {
        const subject = el('mailPrepSubject')?.value || '';
        copyRich(esc(subject), subject, 'Konu kopyalandı');
    });

    initFeeSettingsModal();
    initMailTemplateSettings();
    renderMailPrep();
}

// ---------------------------------------------------------------------------
// Mail Hazırlığı > Taslak Ayarları
// ---------------------------------------------------------------------------

let tplBound = false;
let tplDirty = false;
let tplLastKey = null;
let tplRange = null; // editörde son imleç konumu (değişken eklemek için)

function tplKey() {
    const sel = el('mailTplSelect');
    return sel && TEMPLATES[sel.value] ? sel.value : Object.keys(TEMPLATES)[0];
}

function loadTplEditor() {
    const key = tplKey();
    const tpl = TEMPLATES[key];
    const parts = getTemplateParts(key);
    tplLastKey = key;
    el('mailTplSubject').value = parts.subject;
    el('mailTplEditor').innerHTML = parts.body;
    const custom = !!(Store.mailTemplates && Store.mailTemplates[key]);
    el('mailTplState').textContent = custom ? '✏️ Bu mailin taslağı özelleştirilmiş.' : 'Varsayılan taslak kullanılıyor.';
    el('mailTplVarList').innerHTML = tpl.variables
        .map(([k, d]) => `<div><code>{{${k}}}</code> — ${esc(d)}</div>`).join('');
    el('mailTplVarSelect').innerHTML = '<option value="">➕ Değişken ekle...</option>' +
        tpl.variables.map(([k, d]) => `<option value="${k}">${esc(k)} — ${esc(d)}</option>`).join('');
    el('mailTplPreview').style.display = 'none';
    tplDirty = false;
}

function insertTplToken(token) {
    const editor = el('mailTplEditor');
    editor.focus();
    const sel = window.getSelection();
    if (tplRange) {
        sel.removeAllRanges();
        sel.addRange(tplRange);
    }
    document.execCommand('insertText', false, token);
    tplDirty = true;
}

function previewTpl() {
    const key = tplKey();
    const tpl = TEMPLATES[key];
    const out = tpl.compute(tpl.sample.values, tpl.sample.ctx);
    const subject = plainText(renderMailTemplate(el('mailTplSubject').value, out.vars));
    const html = sanitizeHtml(renderMailTemplate(el('mailTplEditor').innerHTML, out.vars));
    const box = el('mailTplPreview');
    box.innerHTML = `<p><strong>Konu:</strong> ${esc(subject)}</p><hr>${html}`;
    box.style.display = 'block';
}

function saveTpl() {
    const key = tplKey();
    const tpl = TEMPLATES[key];
    const subject = el('mailTplSubject').value.trim();
    const body = sanitizeHtml(el('mailTplEditor').innerHTML).trim();
    if (!subject || !body) {
        showToast('Konu ve mail metni boş olamaz.', 'warning');
        return;
    }
    const known = new Set(tpl.variables.map(([k]) => k));
    const unknown = [...new Set([...`${subject}\n${body}`.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)].map(m => m[1]))]
        .filter(k => !known.has(k));
    if (unknown.length && !confirm(`Bu mailde tanınmayan değişken var: ${unknown.map(k => '{{' + k + '}}').join(', ')}.\nMailde olduğu gibi kalır. Yine de kaydedilsin mi?`)) {
        return;
    }
    Store.setMailTemplates({ ...(Store.mailTemplates || {}), [key]: { subject, body } });
    if (saveData()) {
        showToast('Mail taslağı kaydedildi. Değişiklik herkes için geçerli.', 'success');
        loadTplEditor();
        recompute();
    }
}

function resetTpl() {
    const key = tplKey();
    if (!(Store.mailTemplates && Store.mailTemplates[key])) {
        showToast('Bu mail zaten varsayılan taslağı kullanıyor.', 'info');
        loadTplEditor();
        return;
    }
    if (!confirm('Bu mailin özelleştirilmiş taslağı silinip varsayılan metne dönülecek. Devam edilsin mi?')) return;
    const next = { ...Store.mailTemplates };
    delete next[key];
    Store.setMailTemplates(next);
    if (saveData()) {
        showToast('Varsayılan taslağa dönüldü.', 'success');
        loadTplEditor();
        recompute();
    }
}

function initMailTemplateSettings() {
    const sel = el('mailTplSelect');
    if (!sel || tplBound) return;
    tplBound = true;

    sel.innerHTML = Object.entries(TEMPLATES).map(([k, t]) => `<option value="${k}">${esc(t.label)}</option>`).join('');
    sel.addEventListener('change', () => {
        if (tplDirty && !confirm('Kaydedilmemiş değişiklikler silinecek. Devam edilsin mi?')) {
            sel.value = tplLastKey;
            return;
        }
        loadTplEditor();
    });

    const editor = el('mailTplEditor');
    editor.addEventListener('input', () => { tplDirty = true; });
    el('mailTplSubject').addEventListener('input', () => { tplDirty = true; });
    const remember = () => {
        const s = window.getSelection();
        if (s.rangeCount && editor.contains(s.anchorNode)) tplRange = s.getRangeAt(0).cloneRange();
    };
    ['keyup', 'mouseup', 'focusout'].forEach(ev => editor.addEventListener(ev, remember));

    document.querySelectorAll('#mailTemplatesModal [data-tpl-cmd]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => e.preventDefault()); // editörün seçimini kaybetme
        btn.addEventListener('click', () => {
            editor.focus();
            document.execCommand(btn.getAttribute('data-tpl-cmd'));
            tplDirty = true;
        });
    });

    el('mailTplVarSelect').addEventListener('change', (e) => {
        const key = e.target.value;
        e.target.value = '';
        if (key) insertTplToken(`{{${key}}}`);
    });

    el('mailPrepTemplatesBtn')?.addEventListener('click', () => {
        sel.value = currentTemplateKey(); // sayfada seçili mail açılır
        loadTplEditor();
        el('mailTemplatesModal').classList.add('show');
    });

    el('mailTplSaveBtn').addEventListener('click', saveTpl);
    el('mailTplPreviewBtn').addEventListener('click', previewTpl);
    el('mailTplResetBtn').addEventListener('click', resetTpl);
}
