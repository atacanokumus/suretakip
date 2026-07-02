import { Store } from './store.js';
import { saveData } from './data.js';
import { generateId, formatDate, escapeHtml, getStatus, convertToDate, validateString } from './utils.js';
import {
    showToast, getExpertInfoHtml
} from './ui.js';
import { auth } from './firebase-config.js';
import { initEmojiPicker } from './emoji.js';

// ==========================================
// Initialization & Migration
// ==========================================

const WORKFLOWS = {
    "Kurulu Güç / Ünite Tadili": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "KURUM_GORUS_TEIAS_EIGM", short: "TEİAŞ/EİGM Görüşü", long: "3. TEİAŞ ve EİGM Kurum Görüşleri" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Olur/Müzekkere", long: "4. Daire Başkanlığı Oluru / Müzekkere Yazımı" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Olur/Gündem", long: "5. Olur İmzalanması / Müzekkerenin Gündeme Alınması" },
        { type: "YUKUMLULUK_TANIMLAMA", short: "Yükümlülük Tanımlama", long: "6. Yükümlülük Tanımlanması" },
        { type: "YUKUMLULUK_TAMAMLAMA", short: "Yükümlülük Tamamlama", long: "7. Yükümlülüklerin Tamamlanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "8. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "9. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "10. Belgenin Dağıtımı" }
    ],
    "Bağlantı Noktası Tadili": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "KURUM_GORUS_TEIAS", short: "TEİAŞ Görüşü", long: "3. TEİAŞ Kurum Görüşü" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "4. Müzekkere Yazılması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "5. Müzekkerenin Gündeme Alınması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "6. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "7. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "8. Belgenin Dağıtımı" }
    ],
    "Depolama Ünitesi Tadili": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "KURUM_GORUS_TEIAS_EIGM", short: "TEİAŞ/EİGM Görüşü", long: "3. TEİAŞ / EİGM Kurum Görüşleri" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Olur Hazırlama", long: "4. Daire Başkanlığı Oluru Hazırlanması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Olur İmzalanması", long: "5. Olur İmzalanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "6. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "7. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "8. Belgenin Dağıtımı" }
    ],
    "Muhatap Yetkilisi Tanımlama": [
        { type: "EVRAK_EPDK_SUNULMASI", short: "EPDK'ya Sunum", long: "1. Evrağın EPDK’ya Sunulması" },
        { type: "MUHATAP_YETKILISI_TANIMLANMASI", short: "Yetkili Tanımlama", long: "2. Muhatap Yetkilisi Tanımlanması" }
    ],
    "Ortaklık / Yönetici Değişikliği": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "3. Müzekkere Yazılması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "4. Müzekkerenin Gündeme Alınması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "5. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "6. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "7. Belgenin Dağıtımı" }
    ],
    "Önlisans Başvurusu": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "KURUM_GORUS_TEIAS_EIGM", short: "TEİAŞ/EİGM Görüşü", long: "3. TEİAŞ / EİGM Kurum Görüşleri" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "4. Müzekkere Yazılması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "5. Müzekkerenin Gündeme Alınması" },
        { type: "YUKUMLULUK_TANIMLAMA", short: "Yükümlülük Tanımlama", long: "6. Yükümlülük Tanımlanması" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "7. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "8. Belgenin Dağıtımı" },
        { type: "YUKUMLULUK_TAMAMLAMA", short: "Yükümlülük Tamamlama", long: "9. Yükümlülüklerin Tamamlanması" }
    ],
    "Önlisans Süre Uzatımı": [
        { type: "BILGI_NOTU_TALEBI", short: "Bilgi Notu", long: "1. Bilgi Notu Talebi" },
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "2. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "3. Tadil Başvurusunun Yapılması" },
        { type: "KURUM_GORUS_KDB", short: "KDB Görüşü", long: "4. KDB Kurum Görüşü" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "5. Müzekkere Yazılması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "6. Müzekkerenin Gündeme Alınması" },
        { type: "DERC_EDILME", short: "Önlisans Derç", long: "7. Tadilin Önlisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "8. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "9. Belgenin Dağıtımı" }
    ],
    "Saha Koordinat Tadili": [
        { type: "BILGI_NOTU_TALEBI", short: "Bilgi Notu", long: "1. Bilgi Notu Talebi" },
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "2. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "3. Tadil Başvurusunun Yapılması" },
        { type: "KURUM_GORUS_TEIAS_EIGM", short: "TEİAŞ/EİGM Görüşü", long: "4. TEİAŞ / EİGM Kurum Görüşleri" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "5. Müzekkere Yazımı" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "6. Müzekkerenin Gündeme Alınması" },
        { type: "YUKUMLULUK_TANIMLAMA", short: "Yükümlülük Tanımlama", long: "7. Yükümlülük Tanımlanması" },
        { type: "YUKUMLULUK_TAMAMLAMA", short: "Yükümlülük Tamamlama", long: "8. Yükümlülüklerin Tamamlanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "9. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "10. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "11. Belgenin Dağıtımı" }
    ],
    "Tesis Tamamlama Süre Uzatımı": [
        { type: "BILGI_NOTU_TALEBI", short: "Bilgi Notu", long: "1. Bilgi Notu İstenmesi" },
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "2. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "3. Tadil Başvurusunun Yapılması" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "4. Müzekkere Yazımı" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "5. Müzekkerenin Gündeme Alınması" },
        { type: "DERC_EDILME", short: "Lisans Derç", long: "6. Tadilin Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "7. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "8. Belgenin Dağıtımı" }
    ],
    "Ünite Koordinat Tadili": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "KURUM_GORUS_EIGM", short: "EİGM Görüşü", long: "3. EİGM Kurum Görüşü" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Olur Hazırlama", long: "4. Daire Başkanlığı Oluru Hazırlanması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Olur İmzalanması", long: "5. Olur İmzalanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "6. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "7. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "8. Belgenin Dağıtımı" }
    ],
    "Üretim Lisansı Başvurusu": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "3. Müzekkere Yazımı" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "4. Müzekkerenin Gündeme Alınması" },
        { type: "DERC_EDILME", short: "Lisans Derç", long: "5. Tadilin Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "6. Belgenin Teslim Alınması" },
        { type: "TEMINAT_IADESI", short: "Teminat İadesi", long: "7. Teminat İadesinin İstenmesi" },
        { type: "DAGITIM", short: "Dağıtım", long: "8. Belgenin Dağıtımı" }
    ],
    "Hibrit Başvurusu": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "KURUM_GORUS_TEIAS_EIGM", short: "TEİAŞ/EİGM Görüşü", long: "3. TEİAŞ / EİGM Kurum Görüşleri" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Müzekkere", long: "4. Müzekkere Yazımı" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Gündem", long: "5. Müzekkerenin Gündeme Alınması" },
        { type: "YUKUMLULUK_TANIMLAMA", short: "Yükümlülük Tanımlama", long: "6. Yükümlülük Tanımlanması" },
        { type: "YUKUMLULUK_TAMAMLAMA", short: "Yükümlülük Tamamlama", long: "7. Yükümlülüklerin Tamamlanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "8. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "9. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "10. Belgenin Dağıtımı" }
    ],
    "İnvertör Tadili": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "KURUM_GORUS_TEIAS_EIGM", short: "TEİAŞ/EİGM Görüşü", long: "3. TEİAŞ / EİGM Kurum Görüşleri" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Olur Hazırlama", long: "4. Daire Başkanlığı Oluru Hazırlanması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Olur İmzalanması", long: "5. Olur İmzalanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "6. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "7. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "8. Belgenin Dağıtımı" }
    ],
    "Yıllık Elektrik Enerjisi Üretimi Miktarı Tadili": [
        { type: "TADIL_BEDELI", short: "Tadil Bedeli", long: "1. Tadil Bedeli Talebi" },
        { type: "BASVURU", short: "Başvuru", long: "2. Tadil Başvurusunun Yapılması" },
        { type: "OLUR_MUZEKKERE_YAZIMI", short: "Olur Hazırlama", long: "3. Daire Başkanlığı Oluru Hazırlanması" },
        { type: "OLUR_IMZALANMASI_VE_GUNDEM", short: "Olur İmzalanması", long: "4. Olur İmzalanması" },
        { type: "DERC_EDILME", short: "Tadil Derç", long: "5. Tadilin Önlisans/Lisansa Derç Edilmesi" },
        { type: "BELGE_TESLIM", short: "Belge Teslim", long: "6. Belgenin Teslim Alınması" },
        { type: "DAGITIM", short: "Dağıtım", long: "7. Belgenin Dağıtımı" }
    ]
};

const FALLBACK_STEPS = [
    { type: "BASVURU", short: "Başvuru Bilgisi", long: "1. Tadil Başvurusu Yapılması" },
    { type: "GENEL_DEGERLENDIRME", short: "Değerlendirme", long: "2. Kurum Değerlendirmesi / Görüş Süreci" },
    { type: "GENEL_SONUCLANDIRMA", short: "Sonuçlandırma", long: "3. Süreç Sonuçlandırma" }
];

export function getWorkflowSteps(job) {
    if (!job || !job.title) return FALLBACK_STEPS;
    const title = job.title.trim();
    return WORKFLOWS[title] || FALLBACK_STEPS;
}

export function getInitialStepData(type, isCompleted) {
    switch (type) {
        case 'TADIL_BEDELI':
            return { completed: isCompleted, date: '', amount: '' };
        case 'BASVURU':
            return { completed: isCompleted, date: '', number: '', mfilesId: '' };
        case 'KURUM_GORUS_TEIAS_EIGM':
            return {
                completed: isCompleted,
                teiasDondu: isCompleted, teiasCikisSayi: '', teiasCikisTarih: '', teiasSayi: '', teiasTarih: '',
                eigmDondu: isCompleted, eigmCikisSayi: '', eigmCikisTarih: '', eigmSayi: '', eigmTarih: ''
            };
        case 'KURUM_GORUS_TEIAS':
            return { completed: isCompleted, teiasDondu: isCompleted, teiasCikisSayi: '', teiasCikisTarih: '', teiasSayi: '', teiasTarih: '' };
        case 'KURUM_GORUS_EIGM':
            return { completed: isCompleted, eigmDondu: isCompleted, eigmCikisSayi: '', eigmCikisTarih: '', eigmSayi: '', eigmTarih: '' };
        case 'KURUM_GORUS_KDB':
            return { completed: isCompleted, kdbDondu: isCompleted, kdbCikisSayi: '', kdbCikisTarih: '', kdbSayi: '', kdbTarih: '' };
        case 'OLUR_MUZEKKERE_YAZIMI':
            return { completed: isCompleted, yazildi: isCompleted, date: '', number: '' };
        case 'OLUR_IMZALANMASI_VE_GUNDEM':
            return { completed: isCompleted, imzaDurumu: isCompleted ? 'imzalandı' : 'imzada', date: '', number: '' };
        case 'YUKUMLULUK_TANIMLAMA':
            return { completed: isCompleted, obligationIds: [], noObligation: isCompleted };
        case 'YUKUMLULUK_TAMAMLAMA':
            return { completed: isCompleted, sunuldu: isCompleted, date: '', number: '', submissions: {} };
        case 'DERC_EDILME':
            return { completed: isCompleted, dercEdildi: isCompleted, date: '', number: '' };
        case 'BELGE_TESLIM':
            return { completed: isCompleted, teslimAlindi: isCompleted, date: '' };
        case 'DAGITIM':
            return { completed: isCompleted, dagitildi: isCompleted, tip: 'email', detay: '' };
        case 'BILGI_NOTU_TALEBI':
            return { completed: isCompleted, date: '', detay: '' };
        case 'EVRAK_EPDK_SUNULMASI':
            return { completed: isCompleted, sunuldu: isCompleted, date: '', number: '' };
        case 'MUHATAP_YETKILISI_TANIMLANMASI':
            return { completed: isCompleted, date: '', detay: '' };
        case 'TEMINAT_IADESI':
            return { completed: isCompleted, date: '', number: '' };
        case 'GENEL_DEGERLENDIRME':
            return { completed: isCompleted, tamamlandi: isCompleted, date: '', number: '', aciklama: '' };
        case 'GENEL_SONUCLANDIRMA':
            return { completed: isCompleted, tamamlandi: isCompleted, sonuc: 'Onaylandı', date: '', number: '', detay: '' };
        default:
            return { completed: isCompleted };
    }
}

function ensureTadilSteps(job) {
    if (!job) return job;

    // 1. Migrate old Kurulu Güç 9-step to 10-step
    if (job.title === 'Kurulu Güç / Ünite Tadili' && job.steps && job.steps.step9 && !job.steps.step10) {
        const oldSteps = job.steps;
        job.steps = {
            step1: { completed: true, date: job.createdAt ? new Date(job.createdAt).toISOString().split('T')[0] : '', amount: 'Belirtilmedi' },
            step2: oldSteps.step1 || {},
            step3: oldSteps.step2 || {},
            step4: oldSteps.step3 || {},
            step5: oldSteps.step4 || {},
            step6: oldSteps.step5 || {},
            step7: oldSteps.step6 || {},
            step8: oldSteps.step7 || {},
            step9: oldSteps.step8 || {},
            step10: oldSteps.step9 || {}
        };
        job.currentStep = job.status === 'completed' ? 10 : (job.currentStep || 1) + 1;
        Store.updateJob(job.id, { steps: job.steps, currentStep: job.currentStep });
        return job;
    }

    const stepsConf = getWorkflowSteps(job);
    const expectedStepCount = stepsConf.length;
    const hasCorrectSteps = job.steps && job.steps[`step${expectedStepCount}`] && !job.steps[`step${expectedStepCount + 1}`];

    if (!job.steps || !hasCorrectSteps) {
        const isCompleted = job.status === 'completed';
        const newSteps = {};
        for (let i = 0; i < expectedStepCount; i++) {
            newSteps[`step${i+1}`] = getInitialStepData(stepsConf[i].type, isCompleted);
        }
        job.steps = newSteps;
        job.currentStep = isCompleted ? expectedStepCount : 1;
        Store.updateJob(job.id, { steps: job.steps, currentStep: job.currentStep });
    }

    return job;
}

// ==========================================
// Core Views & Renderers
// ==========================================

export function updateJobsView() {
    const listContainer = document.getElementById('jobsList');
    if (!listContainer) return;

    const assigneeFilter = document.getElementById('jobAssigneeFilter')?.value || 'all';
    const statusFilter = document.getElementById('jobStatusFilter')?.value || 'all';
    const projectFilter = document.getElementById('jobProjectFilter')?.value || 'all';

    let filteredJobs = Store.jobs || [];

    // Ensure all jobs have the new step structure
    filteredJobs.forEach(j => ensureTadilSteps(j));

    // Apply filters
    if (assigneeFilter === 'me' && auth.currentUser) {
        filteredJobs = filteredJobs.filter(j => j.assignee === auth.currentUser.email);
    } else if (assigneeFilter !== 'all' && assigneeFilter !== 'me') {
        filteredJobs = filteredJobs.filter(j => j.assignee === assigneeFilter);
    }

    if (projectFilter !== 'all') {
        filteredJobs = filteredJobs.filter(j => j.project === projectFilter);
    }

    if (statusFilter === 'pending') {
        filteredJobs = filteredJobs.filter(j => j.status !== 'completed');
    } else if (statusFilter === 'completed') {
        filteredJobs = filteredJobs.filter(j => j.status === 'completed');
    }

    // Sort by active status first, then by updated date
    filteredJobs.sort((a, b) => {
        const aCompleted = a.status === 'completed';
        const bCompleted = b.status === 'completed';
        if (aCompleted && !bCompleted) return 1;
        if (!aCompleted && bCompleted) return -1;
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });

    listContainer.innerHTML = '';
    updateJobStats();

    if (filteredJobs.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <span>💼</span>
                <p>Görüntülenecek tadil süreci bulunamadı.</p>
            </div>
        `;
        return;
    }

    filteredJobs.forEach(job => {
        listContainer.appendChild(createJobCard(job));
    });
}

function updateJobStats() {
    if (!Store.jobs) return;

    // Ensure steps are initialized for stats check
    Store.jobs.forEach(j => ensureTadilSteps(j));

    const myPending = Store.jobs.filter(j =>
        auth.currentUser && j.assignee === auth.currentUser.email && j.status !== 'completed'
    ).length;

    const allPending = Store.jobs.filter(j => j.status !== 'completed').length;
    const completed = Store.jobs.filter(j => j.status === 'completed').length;

    const elMy = document.getElementById('jobStatMyPending');
    const elAll = document.getElementById('jobStatAllPending');
    const elComp = document.getElementById('jobStatCompleted');

    if (elMy) elMy.textContent = myPending;
    if (elAll) elAll.textContent = allPending;
    if (elComp) elComp.textContent = completed;
}

function getLiveStatusText(job) {
    if (job.status === 'completed') return 'Süreç Tamamlandı ✅';

    const stepNum = job.currentStep || 1;
    const stepsConf = getWorkflowSteps(job);
    const stepConf = stepsConf[stepNum - 1];
    if (!stepConf) return 'Süreç Devam Ediyor...';

    const steps = job.steps;
    const sData = steps[`step${stepNum}`] || {};

    switch (stepConf.type) {
        case 'TADIL_BEDELI':
            return `Aşama ${stepNum}: Tadil Bedeli Talebi Giriliyor 💰`;
        case 'BASVURU':
            return `Aşama ${stepNum}: Başvuru Bilgileri Giriliyor 📝`;
        case 'KURUM_GORUS_TEIAS_EIGM':
            {
                const teias = sData.teiasDondu;
                const eigm = sData.eigmDondu;
                if (teias && !eigm) return `Aşama ${stepNum}: TEİAŞ Görüşü Alındı, EİGM Bekleniyor ⏳`;
                if (!teias && eigm) return `Aşama ${stepNum}: EİGM Görüşü Alındı, TEİAŞ Bekleniyor ⏳`;
                return `Aşama ${stepNum}: TEİAŞ ve EİGM Görüşleri Bekleniyor ⏳`;
            }
        case 'KURUM_GORUS_TEIAS':
            return `Aşama ${stepNum}: TEİAŞ Kurum Görüşü Bekleniyor ⚡`;
        case 'KURUM_GORUS_EIGM':
            return `Aşama ${stepNum}: EİGM Kurum Görüşü Bekleniyor 🔍`;
        case 'KURUM_GORUS_KDB':
            return `Aşama ${stepNum}: KDB Kurum Görüşü Bekleniyor 🔍`;
        case 'OLUR_MUZEKKERE_YAZIMI':
            return `Aşama ${stepNum}: Olur / Müzekkere Hazırlanıyor 📝`;
        case 'OLUR_IMZALANMASI_VE_GUNDEM':
            {
                const imza = sData.imzaDurumu || 'imzada';
                if (imza === 'kurulda') {
                    if (sData.date) {
                        return `Aşama ${stepNum}: ${formatDate(sData.date)} tarihli Kurul gündemine alındı. Kurul Kararı tebliği bekleniyor 🏛️`;
                    }
                    return `Aşama ${stepNum}: Müzekkerenin Gündeme Alınması Bekleniyor 🏛️`;
                }
                return `Aşama ${stepNum}: Olur İmzalanması Bekleniyor ✍️`;
            }
        case 'YUKUMLULUK_TANIMLAMA':
            return `Aşama ${stepNum}: Yükümlülük Tanımlaması Bekleniyor ⚠️`;
        case 'YUKUMLULUK_TAMAMLAMA':
            return `Aşama ${stepNum}: Yükümlülüklerin Tamamlanması / EPDK'ya Sunulması 📬`;
        case 'DERC_EDILME':
            return `Aşama ${stepNum}: Tadilin Lisansa Derç Edilmesi Bekleniyor 📄`;
        case 'BELGE_TESLIM':
            return `Aşama ${stepNum}: Belge Teslim Alınacak 🗝️`;
        case 'DAGITIM':
            return `Aşama ${stepNum}: Belgenin Dağıtımı Yapılacak 📦`;
        case 'BILGI_NOTU_TALEBI':
            return `Aşama ${stepNum}: Bilgi Notu Talebi Bekleniyor ℹ️`;
        case 'EVRAK_EPDK_SUNULMASI':
            return `Aşama ${stepNum}: Evrağın EPDK’ya Sunulması Bekleniyor 📬`;
        case 'MUHATAP_YETKILISI_TANIMLANMASI':
            return `Aşama ${stepNum}: Muhatap Yetkilisi Tanımlanması Bekleniyor 👤`;
        case 'TEMINAT_IADESI':
            return `Aşama ${stepNum}: Teminat İadesinin İstenmesi Bekleniyor 💰`;
        case 'GENEL_DEGERLENDIRME':
            return `Aşama ${stepNum}: Kurum Değerlendirmesi / Görüş Süreci 🔍`;
        case 'GENEL_SONUCLANDIRMA':
            return `Aşama ${stepNum}: Süreç Sonuçlandırılıyor ⚖️`;
        default:
            return `Aşama ${stepNum}: Süreç Devam Ediyor...`;
    }
}

function getStepTitle(job, stepNum) {
    const stepsConf = getWorkflowSteps(job);
    const stepConf = stepsConf[stepNum - 1];
    return stepConf ? stepConf.long : `Aşama ${stepNum}`;
}

function getStepShortTitle(job, stepNum) {
    const stepsConf = getWorkflowSteps(job);
    const stepConf = stepsConf[stepNum - 1];
    return stepConf ? stepConf.short : `Aşama ${stepNum}`;
}

function getDaysPassedText(dateVal) {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    const diffTime = today - target;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'bugün';
    return `${diffDays} gün geçti`;
}

function getStepDate(job, stepNum) {
    if (!job || !job.steps) return null;
    const sData = job.steps[`step${stepNum}`];
    if (!sData) return null;
    
    if (sData.date) return sData.date;
    if (sData.teiasTarih) return sData.teiasTarih;
    if (sData.eigmTarih) return sData.eigmTarih;
    if (sData.kdbTarih) return sData.kdbTarih;
    if (sData.teiasCikisTarih) return sData.teiasCikisTarih;
    if (sData.eigmCikisTarih) return sData.eigmCikisTarih;
    if (sData.kdbCikisTarih) return sData.kdbCikisTarih;
    return null;
}

function getStepTooltipText(job, stepNum) {
    const stepsConf = getWorkflowSteps(job);
    const stepConf = stepsConf[stepNum - 1];
    if (!stepConf) return `Aşama ${stepNum}`;

    const isCompleted = job.status === 'completed';
    const sData = job.steps ? job.steps[`step${stepNum}`] : null;
    const isStepDone = isCompleted || sData?.completed || (stepNum < (job.currentStep || 1));

    let titleText = `${stepConf.long}`;
    if (!isStepDone) {
        return `${titleText}\nHenüz bu aşamaya gelinmedi ⏳`;
    }

    if (!sData) return titleText;

    switch (stepConf.type) {
        case 'TADIL_BEDELI':
            return `${titleText}\n💰 Bedel: ${sData.amount || 'Belirtilmedi'} | Tarih: ${sData.date ? formatDate(sData.date) : '-'}`;
        case 'BASVURU':
            return `${titleText}\n📝 Başvuru No: ${sData.number || '-'} | Tarih: ${sData.date ? formatDate(sData.date) : '-'}${sData.mfilesId ? ' | M-Files: ' + sData.mfilesId : ''}`;
        case 'KURUM_GORUS_TEIAS_EIGM':
            {
                const tInfo = sData.teiasDondu ? `TEİAŞ: Cevaplandı (${sData.teiasSayi || 'Muaf'})` : (sData.teiasCikildi ? 'TEİAŞ: Görüşe Çıkıldı' : 'TEİAŞ: Bekleniyor');
                const eInfo = sData.eigmDondu ? `EİGM: Cevaplandı (${sData.eigmSayi || 'Muaf'})` : (sData.eigmCikildi ? 'EİGM: Görüşe Çıkıldı' : 'EİGM: Bekleniyor');
                return `${titleText}\n⚡ ${tInfo}\n🔍 ${eInfo}`;
            }
        case 'KURUM_GORUS_TEIAS':
            return `${titleText}\n⚡ TEİAŞ: ${sData.teiasDondu ? 'Cevaplandı (' + (sData.teiasSayi || 'Muaf') + ')' : (sData.teiasCikildi ? 'Görüşe Çıkıldı' : 'Bekleniyor')}`;
        case 'KURUM_GORUS_EIGM':
            return `${titleText}\n🔍 EİGM: ${sData.eigmDondu ? 'Cevaplandı (' + (sData.eigmSayi || 'Muaf') + ')' : (sData.eigmCikildi ? 'Görüşe Çıkıldı' : 'Bekleniyor')}`;
        case 'KURUM_GORUS_KDB':
            return `${titleText}\n🔍 KDB: ${sData.kdbDondu ? 'Cevaplandı (' + (sData.kdbSayi || 'Muaf') + ')' : (sData.kdbCikildi ? 'Görüşe Çıkıldı' : 'Bekleniyor')}`;
        case 'OLUR_MUZEKKERE_YAZIMI':
            return `${titleText}\n📝 Evrak Sayısı: ${sData.number || '-'} | Tarih: ${sData.date ? formatDate(sData.date) : '-'}`;
        case 'OLUR_IMZALANMASI_VE_GUNDEM':
            {
                const st = sData.imzaDurumu === 'imzalandı' ? '✅ İmzalandı' : (sData.imzaDurumu === 'kurulda' ? '🏛️ Gündemde' : '✍️ İmzada');
                return `${titleText}\nDurum: ${st} | Karar/Olur No: ${sData.number || '-'} | Tarih: ${sData.date ? formatDate(sData.date) : '-'}`;
            }
        case 'YUKUMLULUK_TANIMLAMA':
            if (sData.noObligation) return `${titleText}\n⚠️ Yükümlülük Yok (Doğrudan İlerlendi)`;
            return `${titleText}\n⚠️ ${(sData.obligationIds || []).length} Adet Yükümlülük Tanımlandı`;
        case 'YUKUMLULUK_TAMAMLAMA':
            return `${titleText}\n📬 Sunum Tarihi: ${sData.date ? formatDate(sData.date) : '-'} | Evrak No: ${sData.number || '-'}`;
        case 'DERC_EDILME':
            return `${titleText}\n📄 Derç Tarihi: ${sData.date ? formatDate(sData.date) : '-'} | Karar No: ${sData.number || '-'}`;
        case 'BELGE_TESLIM':
            return `${titleText}\n🗝️ Teslim Tarihi: ${sData.date ? formatDate(sData.date) : '-'}`;
        case 'DAGITIM':
            return `${titleText}\n📦 Gönderim Tipi: ${sData.tip || '-'} | Detay: ${sData.detay || '-'}`;
        case 'BILGI_NOTU_TALEBI':
            return `${titleText}\nℹ️ Talep Tarihi: ${sData.date ? formatDate(sData.date) : '-'} | Detay: ${sData.detay || '-'}`;
        case 'EVRAK_EPDK_SUNULMASI':
            return `${titleText}\n📬 Sunum Tarihi: ${sData.date ? formatDate(sData.date) : '-'} | Sayı/Barkod: ${sData.number || '-'}`;
        case 'MUHATAP_YETKILISI_TANIMLANMASI':
            return `${titleText}\n👤 Tanımlanma Tarihi: ${sData.date ? formatDate(sData.date) : '-'} | Detay: ${sData.detay || '-'}`;
        case 'TEMINAT_IADESI':
            return `${titleText}\n💰 İstek Tarihi: ${sData.date ? formatDate(sData.date) : '-'} | Evrak No: ${sData.number || '-'}`;
        default:
            return titleText;
    }
}

function generateProcessSummaryHtml(job) {
    if (!job || !job.steps) return '<p style="margin:0; color:var(--text-muted); font-size:12px;">Süreç verisi bulunamadı.</p>';

    const stepsConf = getWorkflowSteps(job);
    const summaryLines = [];

    stepsConf.forEach((stepConf, idx) => {
        const stepNum = idx + 1;
        const sData = job.steps[`step${stepNum}`];
        if (!sData) return;

        const isStepDone = job.status === 'completed' || sData.completed || (stepNum < job.currentStep);
        if (!isStepDone && !sData.date && !sData.teiasTarih && !sData.eigmTarih && !sData.kdbTarih && !sData.teiasCikildi && !sData.eigmCikildi && !sData.kdbCikildi) return;

        let lineText = '';
        switch (stepConf.type) {
            case 'TADIL_BEDELI':
                if (sData.date || sData.amount) {
                    lineText = `<strong>${sData.date ? formatDate(sData.date) : 'Belirtilmeyen bir tarihte'}</strong> ${escapeHtml(sData.amount || 'belirtilmeyen')} TL tutarında tadil bedeli talep edildi.`;
                }
                break;
            case 'BASVURU':
                if (sData.date || sData.number) {
                    lineText = `<strong>${sData.date ? formatDate(sData.date) : 'Belirtilmeyen tarihte'}</strong> ${escapeHtml(sData.number || '')} sayılı tadil başvurusu yapıldı.`;
                }
                break;
            case 'KURUM_GORUS_TEIAS_EIGM':
                {
                    const parts = [];
                    if (sData.teiasCikildi || sData.teiasCikisTarih) {
                        parts.push(`TEİAŞ görüşüne ${sData.teiasCikisTarih ? formatDate(sData.teiasCikisTarih) + ' tarihinde' : ''} çıkıldı`);
                    }
                    if (sData.teiasDondu) {
                        parts.push(`TEİAŞ görüşü ${sData.teiasTarih ? formatDate(sData.teiasTarih) + ' tarihinde' : ''} cevaplandı (${escapeHtml(sData.teiasSayi || 'Muaf')})`);
                    }
                    if (sData.eigmCikildi || sData.eigmCikisTarih) {
                        parts.push(`EİGM görüşüne ${sData.eigmCikisTarih ? formatDate(sData.eigmCikisTarih) + ' tarihinde' : ''} çıkıldı`);
                    }
                    if (sData.eigmDondu) {
                        parts.push(`EİGM görüşü ${sData.eigmTarih ? formatDate(sData.eigmTarih) + ' tarihinde' : ''} cevaplandı (${escapeHtml(sData.eigmSayi || 'Muaf')})`);
                    }
                    if (parts.length > 0) lineText = parts.join(', ') + '.';
                }
                break;
            case 'KURUM_GORUS_TEIAS':
                {
                    const parts = [];
                    if (sData.teiasCikildi || sData.teiasCikisTarih) {
                        parts.push(`TEİAŞ görüşüne ${sData.teiasCikisTarih ? formatDate(sData.teiasCikisTarih) + ' tarihinde' : ''} çıkıldı`);
                    }
                    if (sData.teiasDondu) {
                        parts.push(`TEİAŞ görüşü ${sData.teiasTarih ? formatDate(sData.teiasTarih) + ' tarihinde' : ''} cevaplandı (${escapeHtml(sData.teiasSayi || 'Muaf')})`);
                    }
                    if (parts.length > 0) lineText = parts.join(', ') + '.';
                }
                break;
            case 'KURUM_GORUS_EIGM':
                {
                    const parts = [];
                    if (sData.eigmCikildi || sData.eigmCikisTarih) {
                        parts.push(`EİGM görüşüne ${sData.eigmCikisTarih ? formatDate(sData.eigmCikisTarih) + ' tarihinde' : ''} çıkıldı`);
                    }
                    if (sData.eigmDondu) {
                        parts.push(`EİGM görüşü ${sData.eigmTarih ? formatDate(sData.eigmTarih) + ' tarihinde' : ''} cevaplandı (${escapeHtml(sData.eigmSayi || 'Muaf')})`);
                    }
                    if (parts.length > 0) lineText = parts.join(', ') + '.';
                }
                break;
            case 'KURUM_GORUS_KDB':
                {
                    const parts = [];
                    if (sData.kdbCikildi || sData.kdbCikisTarih) {
                        parts.push(`KDB görüşüne ${sData.kdbCikisTarih ? formatDate(sData.kdbCikisTarih) + ' tarihinde' : ''} çıkıldı`);
                    }
                    if (sData.kdbDondu) {
                        parts.push(`KDB görüşü ${sData.kdbTarih ? formatDate(sData.kdbTarih) + ' tarihinde' : ''} cevaplandı (${escapeHtml(sData.kdbSayi || 'Muaf')})`);
                    }
                    if (parts.length > 0) lineText = parts.join(', ') + '.';
                }
                break;
            case 'OLUR_MUZEKKERE_YAZIMI':
                if (sData.date || sData.number) {
                    lineText = `<strong>${sData.date ? formatDate(sData.date) : 'Belirtilmeyen tarihte'}</strong> ${escapeHtml(sData.number || '')} sayılı Olur / Müzekkere yazıldı.`;
                }
                break;
            case 'OLUR_IMZALANMASI_VE_GUNDEM':
                if (sData.date || sData.number || sData.imzaDurumu === 'imzalandı') {
                    lineText = `<strong>${sData.date ? formatDate(sData.date) : 'Belirtilmeyen tarihte'}</strong> ${escapeHtml(sData.number || '')} sayılı karar/olur imzalandı ve tamamlandı.`;
                }
                break;
            case 'YUKUMLULUK_TANIMLAMA':
                if (sData.noObligation) {
                    lineText = `Herhangi bir yükümlülük çıkmadı, doğrudan sonraki aşamaya ilerlendi.`;
                } else if ((sData.obligationIds || []).length > 0) {
                    lineText = `${sData.obligationIds.length} adet yükümlülük tanımlandı.`;
                }
                break;
            case 'YUKUMLULUK_TAMAMLAMA':
                if (sData.sunuldu || sData.date || sData.number) {
                    lineText = `<strong>${sData.date ? formatDate(sData.date) : 'Belirtilmeyen tarihte'}</strong> ${escapeHtml(sData.number || '')} evrak sayısı ile yükümlülük belgeleri EPDK'ya sunuldu.`;
                }
                break;
            case 'DERC_EDILME':
                if (sData.date || sData.number) {
                    lineText = `<strong>${sData.date ? formatDate(sData.date) : 'Belirtilmeyen tarihte'}</strong> ${escapeHtml(sData.number || '')} sayılı karar ile lisansa derç edildi.`;
                }
                break;
            case 'BELGE_TESLIM':
                if (sData.date) {
                    lineText = `<strong>${formatDate(sData.date)}</strong> tarihinde lisans belgesi teslim alındı.`;
                }
                break;
            case 'DAGITIM':
                if (sData.dagitildi || sData.tip) {
                    lineText = `Lisans belgesi ${escapeHtml(sData.tip || 'kargo')} ile dağıtıldı (${escapeHtml(sData.detay || '')}).`;
                }
                break;
            default:
                if (sData.date) {
                    lineText = `<strong>${formatDate(sData.date)}</strong> tarihinde ${escapeHtml(stepConf.short)} aşaması tamamlandı.`;
                }
                break;
        }

        if (lineText) {
            summaryLines.push(`<div class="summary-line-item" style="margin-bottom:6px; display:flex; align-items:flex-start; gap:6px;"><span style="color:var(--accent-light);">•</span> <div><strong>${stepNum}. ${escapeHtml(stepConf.short)}:</strong> ${lineText}</div></div>`);
        }
    });

    if (summaryLines.length === 0) {
        return '<p style="margin:0; color:var(--text-muted); font-size:12px; font-style:italic;">Henüz bir aşama verisi girilmedi. İş akışı başlangıç aşamasındadır.</p>';
    }

    return summaryLines.join('');
}

function getNextStepText(job) {
    if (job.status === 'completed') {
        return 'Süreç Tamamlandı 🎉';
    }
    const stepsConf = getWorkflowSteps(job);
    const stepCount = stepsConf.length;
    const current = job.currentStep || 1;
    if (current >= stepCount) {
        return 'Son Aşamadasınız 🏁';
    }
    const nextStepNum = current + 1;
    return `Sıradaki Aşama: ${nextStepNum}. ${getStepTitle(job, nextStepNum)}`;
}

function createJobCard(job) {
    const card = document.createElement('div');
    const isCompleted = job.status === 'completed';
    card.className = `job-card ${isCompleted ? 'completed' : ''}`;
    card.onclick = (e) => {
        showJobDetailModal(job);
    };

    const stepsConf = getWorkflowSteps(job);
    const stepCount = stepsConf.length;

    // Calculate completed steps count
    let completedStepsCount = 0;
    for (let i = 1; i <= stepCount; i++) {
        if (job.steps[`step${i}`]?.completed) completedStepsCount++;
    }
    const progressPercent = Math.round((completedStepsCount / stepCount) * 100);

    // Metro Line Rail Progress Percentage
    let progressRailPercent = 0;
    if (isCompleted) {
        progressRailPercent = 100;
    } else if (stepCount > 1) {
        progressRailPercent = ((job.currentStep - 1) / (stepCount - 1)) * 100;
    }

    // Calculate active segment highlight
    let activeSegmentHtml = '';
    if (!isCompleted && job.currentStep > 1 && stepCount > 1) {
        const prevPercent = ((job.currentStep - 2) / (stepCount - 1)) * 100;
        const segmentWidth = (1 / (stepCount - 1)) * 100;
        activeSegmentHtml = `
            <div class="metro-rail-active-segment" style="left: ${prevPercent}%; width: ${segmentWidth}%;">
                <div class="metro-rail-pulse-line"></div>
            </div>
        `;
    }

    // Metro Stepper HTML & Interval Badges
    let metroStationsHtml = '';
    let intervalBadgesHtml = '';

    for (let i = 1; i <= stepCount; i++) {
        const stepDone = isCompleted || job.steps[`step${i}`]?.completed || (i < job.currentStep);
        const stepActive = !isCompleted && job.currentStep === i;
        
        let stateClass = '';
        if (stepDone) stateClass = 'completed';
        if (stepActive) stateClass = 'active';

        const labelPosClass = (i % 2 !== 0) ? 'label-top' : 'label-bottom';
        const positionPercent = stepCount > 1 ? ((i - 1) / (stepCount - 1)) * 100 : 0;
        const tooltipText = getStepTooltipText(job, i);
        
        metroStationsHtml += `
            <div class="metro-station ${stateClass}" style="left: ${positionPercent}%;">
                <span class="metro-station-dot" title="${escapeHtml(tooltipText)}">
                    ${stepActive ? '<span class="metro-train-icon">🚇</span>' : ''}
                    <span class="metro-station-number">${i}</span>
                </span>
                <span class="metro-station-label ${labelPosClass}" title="${escapeHtml(tooltipText)}">
                    ${escapeHtml(getStepShortTitle(job, i))}
                </span>
            </div>
        `;

        // Calculate interval days between step i and step i+1 if both dates exist
        if (i < stepCount) {
            const dateI = getStepDate(job, i);
            const dateI1 = getStepDate(job, i + 1);
            if (dateI && dateI1) {
                const d1 = new Date(dateI);
                const d2 = new Date(dateI1);
                if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                    d1.setHours(0,0,0,0);
                    d2.setHours(0,0,0,0);
                    const diffDays = Math.max(0, Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)));
                    const nextPosPercent = stepCount > 1 ? (i / (stepCount - 1)) * 100 : 0;
                    const midPercent = (positionPercent + nextPosPercent) / 2;
                    intervalBadgesHtml += `
                        <div class="metro-interval-badge" style="left: ${midPercent}%;" title="${i}. ve ${i+1}. aşamalar arası ${diffDays} gün geçti">
                            ${diffDays} gün
                        </div>
                    `;
                }
            }
        }
    }

    const projectData = Store.getProjectByName(job.project);
    const companyLabel = projectData ? projectData.company : 'Firma';

    // Find Application Date (Başvuru Tarihi)
    let appDateStr = null;
    if (job.steps) {
        for (let k = 1; k <= stepCount; k++) {
            const sConf = stepsConf[k - 1];
            if (sConf && (sConf.type === 'BASVURU' || sConf.type === 'EVRAK_EPDK_SUNULMASI')) {
                const stepData = job.steps[`step${k}`];
                if (stepData && (stepData.completed || stepData.date)) {
                    appDateStr = stepData.date;
                    break;
                }
            }
        }
    }

    let appDateHtml = '';
    if (appDateStr) {
        const daysAgoText = getDaysPassedText(appDateStr);
        appDateHtml = `<div class="job-date-row" title="Başvuru Tarihi">📝 <strong>Başvuru:</strong> ${formatDate(appDateStr)} ${daysAgoText ? `<span class="days-badge">(${daysAgoText})</span>` : ''}</div>`;
    } else {
        appDateHtml = `<div class="job-date-row" style="color:var(--text-muted);" title="Başvuru henüz yapılmadı">📝 <strong>Başvuru:</strong> Yapılmadı</div>`;
    }

    const lastUpdateDateStr = job.updatedAt || job.createdAt;
    const lastUpdateDaysAgoText = getDaysPassedText(lastUpdateDateStr);
    const lastUpdateDateFormatted = lastUpdateDateStr ? new Date(lastUpdateDateStr).toLocaleDateString('tr-TR') : '-';

    card.innerHTML = `
        <!-- Column 1: Project Info -->
        <div class="job-info-col">
            <span class="company-tag">${escapeHtml(companyLabel)}</span>
            <h3 class="job-title" title="${escapeHtml(job.project)}">${escapeHtml(job.project)}</h3>
            <span class="tadil-badge">${escapeHtml(job.title)}</span>
        </div>

        <!-- Column 2: Stepper & Current Status -->
        <div class="job-stepper-col">
            <div class="metro-line-wrapper">
                <div class="metro-rail-bg"></div>
                <div class="metro-rail-progress" style="width: ${progressRailPercent}%;"></div>
                ${activeSegmentHtml}
                ${intervalBadgesHtml}
                <div class="metro-stations-container">
                    ${metroStationsHtml}
                </div>
            </div>
            <div class="live-status-container">
                <div class="live-status-desc ${(!isCompleted && (job.currentStep % 2 === 0)) ? 'pulse' : ''}">
                    ${escapeHtml(getLiveStatusText(job))}
                </div>
                <div class="next-station-desc">
                    ➡️ ${escapeHtml(getNextStepText(job))}
                </div>
            </div>
        </div>

        <!-- Column 3: Progress & Date Metrics -->
        <div class="job-meta-col">
            <div class="progress-box-mini">
                <div class="progress-val-circle">%${progressPercent}</div>
                <span class="progress-label-mini">İlerleme</span>
            </div>
            
            <div class="job-date-metrics">
                ${appDateHtml}
                <div class="job-date-row" title="Son Güncellenme Tarihi">
                    🔄 <strong>Güncelleme:</strong> ${lastUpdateDateFormatted} ${lastUpdateDaysAgoText ? `<span class="days-badge">(${lastUpdateDaysAgoText})</span>` : ''}
                </div>
            </div>
        </div>
    `;
    return card;
}

// ==========================================
// Event Handlers (CRUD & Modals)
// ==========================================

export function initJobsEventHandlers() {
    const addBtn = document.getElementById('jobsPageAddBtn');
    const headerAddBtn = document.getElementById('addJobBtn');
    const modal = document.getElementById('addJobModal');
    const closeBtn = document.getElementById('addJobModalClose');
    const form = document.getElementById('addJobForm');

    const openModal = () => {
        // Populate Projects Dropdown
        const projectSelect = document.getElementById('jobProjectSelect');
        if (projectSelect) {
            const allProjects = (Store.projects || []).map(p => p.name).sort();
            projectSelect.innerHTML = '<option value="">Proje Seçiniz...</option>' +
                allProjects.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
        }

        // Populate Assignees Dropdown
        const assigneeSelect = document.getElementById('jobAssigneeSelect');
        if (assigneeSelect) {
            let html = '<option value="">Atanacak Kişi Seçiniz...</option>';
            if (auth.currentUser) {
                html += `<option value="${auth.currentUser.email}">Bana Ata (${Store.getUserName(auth.currentUser.email)})</option>`;
            }
            Store.users.forEach(u => {
                if (u.email !== auth.currentUser?.email) {
                    html += `<option value="${u.email}">${escapeHtml(u.displayName || u.email)}</option>`;
                }
            });
            assigneeSelect.innerHTML = html;
        }

        // Set default date to today
        const applyDateInput = document.getElementById('tadilApplyDate');
        if (applyDateInput) {
            applyDateInput.value = new Date().toISOString().split('T')[0];
        }

        modal.classList.add('show');
    };

    if (addBtn) addBtn.onclick = openModal;
    if (headerAddBtn) headerAddBtn.onclick = openModal;
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('show');

    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();

            const title = validateString(document.getElementById('jobTitle').value);
            const project = document.getElementById('jobProjectSelect').value;
            const description = validateString(document.getElementById('jobDescription').value);

            if (!project || !title) {
                showToast('Lütfen zorunlu alanları doldurun.', 'warning');
                return;
            }

            const stepsConf = getWorkflowSteps({ title: title });
            const steps = {};
            stepsConf.forEach((stepConf, idx) => {
                const sNum = idx + 1;
                steps[`step${sNum}`] = getInitialStepData(stepConf.type, false);
            });

            const currentStep = 1;
            const currentUserEmail = auth.currentUser?.email || 'Herkes';

            const newTadil = {
                id: generateId(),
                title: title,
                project: project,
                assignee: currentUserEmail,
                priority: 'medium',
                dueDate: null, // Workflow based
                description: description,
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: currentUserEmail,
                comments: [],
                currentStep: currentStep,
                steps: steps
            };

            Store.addJob(newTadil);
            if (saveData()) {
                modal.classList.remove('show');
                form.reset();
                updateJobsView();
                showToast('Tadil başvuru iş akışı başarıyla başlatıldı! 🚀', 'success');
            }
        };
    }

    // Standard Filters
    ['jobAssigneeFilter', 'jobStatusFilter', 'jobProjectFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateJobsView);
    });

    // Event listener for opening details from external clicks
    window.addEventListener('show-job-detail', (e) => {
        const id = e.detail.id;
        const job = Store.jobs.find(item => item.id == id);
        if (job) showJobDetailModal(job);
    });

    refreshJobFilters();
}

export function refreshJobFilters() {
    const projectFilter = document.getElementById('jobProjectFilter');
    if (projectFilter) {
        const currentVal = projectFilter.value;
        const allProjects = (Store.projects || []).map(p => p.name).sort();
        projectFilter.innerHTML = '<option value="all">Tüm Projeler</option>' +
            allProjects.map(p => `<option value="${escapeHtml(p)}" ${p === currentVal ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('');
    }

    const assigneeFilterList = document.getElementById('jobAssigneeFilter');
    if (assigneeFilterList) {
        const currentVal = assigneeFilterList.value;
        let html = `
            <option value="all" ${currentVal === 'all' ? 'selected' : ''}>Tümü</option>
            <option value="me" ${currentVal === 'me' ? 'selected' : ''}>Bana Atananlar</option>
        `;
        Store.users.forEach(u => {
            if (u.email !== auth.currentUser?.email) {
                html += `<option value="${u.email}" ${u.email === currentVal ? 'selected' : ''}>${escapeHtml(u.displayName || u.email)}</option>`;
            }
        });
        assigneeFilterList.innerHTML = html;
    }
}

// ==========================================
// Specialized Stepper Modal Details
// ==========================================

function showJobDetailModal(jobData) {
    const job = Store.jobs.find(j => j.id == jobData.id);
    if (!job) return;

    ensureTadilSteps(job);

    const modal = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    if (!modal || !title || !body) return;

    title.textContent = 'Tadil İş Akışı Takibi';

    const stepsConf = getWorkflowSteps(job);
    const stepCount = stepsConf.length;
    const stepsArray = Array.from({ length: stepCount }, (_, i) => i + 1);

    body.innerHTML = `
        <div class="job-detail-panel">
            <header class="detail-header" style="border-bottom:none; padding-bottom:5px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="stage-badge stage-${job.currentStep}" style="font-size:12px; font-weight:bold;">Aşama ${job.currentStep}/${stepCount}</span>
                    <button class="btn btn-sm btn-danger" id="deleteTadilBtn" style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); color:#ef4444;">🗑️ Sil</button>
                </div>
                <h2 style="font-family:'Outfit'; font-size:22px; margin-top:8px;">${escapeHtml(job.project)}</h2>
                <p style="color:var(--text-muted); font-size:14px; margin-top:4px;">📋 ${escapeHtml(job.title)}</p>
            </header>

            ${getExpertInfoHtml(job.project)}

            <!-- İş Akışı Geçmişi Özeti Panel -->
            <div class="tadil-summary-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px; margin-top: 12px; margin-bottom: 15px;">
                <h4 style="margin:0 0 10px 0; font-size:13.5px; font-weight:700; color:var(--accent-light); display:flex; align-items:center; gap:6px;">
                    📜 İş Akışı Geçmişi Özeti
                </h4>
                <div class="tadil-summary-timeline" style="font-size:12px; line-height:1.6; color:var(--text-primary);">
                    ${generateProcessSummaryHtml(job)}
                </div>
            </div>

            <!-- Multi-step Stepper Component -->
            <div class="tadil-accordion-container">
                ${stepsArray.map(num => renderAccordionStep(job, num)).join('')}
            </div>

            <!-- Comments Engine -->
            <div class="comments-section" style="margin-top:15px; border-top:1px solid rgba(255,255,255,0.05); padding-top:15px;">
                <h3 style="font-size:15px; font-family:'Outfit'; margin-bottom:10px;">💬 Notlar ve Güncellemeler</h3>
                <div class="comments-list" id="jobCommentsList" style="max-height:180px;">
                    ${(job.comments || []).length > 0 ? job.comments.map(c => `
                        <div class="comment-item" style="padding:10px; margin-bottom:8px; border-radius:10px;">
                            <div class="comment-meta" style="margin-bottom:4px; font-size:10px;">
                                <strong>${Store.getUserName(c.user)}</strong>
                                <span>${new Date(c.timestamp).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div class="comment-text" style="font-size:12px;">${escapeHtml(c.text)}</div>
                        </div>
                    `).join('') : '<p class="no-comments" style="font-size:12px; color:var(--text-muted);">Henüz not girilmemiş.</p>'}
                </div>
                <div class="add-comment-wrapper" style="display:flex; gap:10px; margin-top:10px;">
                    <textarea id="jobCommentInput" placeholder="Güncelleme notu yazın..." rows="1" class="modern-textarea" style="padding:8px 12px; min-height:40px;"></textarea>
                    <button id="addJobCommentBtn" class="btn btn-primary" style="padding:0 15px; height:40px; font-size:13px; font-weight:600;">Gönder</button>
                </div>
            </div>
        </div>
    `;

    modal.classList.add('show');

    // Auto-scroll to current active step in detail modal
    setTimeout(() => {
        const activeItem = modal.querySelector('.step-accordion-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 300);

    // Bind Comments Action
    const sendCommentBtn = document.getElementById('addJobCommentBtn');
    if (sendCommentBtn) {
        sendCommentBtn.onclick = () => {
            const input = document.getElementById('jobCommentInput');
            const text = input.value.trim();
            if (text) {
                addJobComment(job.id, text);
                const updatedJob = Store.jobs.find(j => j.id == job.id);
                if (updatedJob) showJobDetailModal(updatedJob);
            }
        };
    }

    // Bind Accordion Headers Toggle
    document.querySelectorAll('.step-header-clickable').forEach(header => {
        header.onclick = () => {
            const stepNum = header.getAttribute('data-step');
            const item = document.getElementById(`stepItem-${stepNum}`);
            if (item.classList.contains('locked')) {
                showToast('Bu aşama henüz kilitli. Önceki aşamaları tamamlayın.', 'info');
                return;
            }
            item.classList.toggle('expanded');
        };
    });

    // Bind Delete Button
    document.getElementById('deleteTadilBtn').onclick = () => {
        if (confirm('Bu tadil sürecini tamamen silmek istediğinize emin misiniz?')) {
            const index = Store.jobs.findIndex(j => j.id == job.id);
            if (index > -1) {
                Store.jobs.splice(index, 1);
                saveData();
                updateJobsView();
                modal.classList.remove('show');
                showToast('Tadil süreci silindi.', 'info');
            }
        }
    };

    // Bind individual Step Forms Save Buttons
    for (let i = 1; i <= stepCount; i++) {
        const btn = document.getElementById(`saveStepBtn-${i}`);
        if (btn) {
            btn.onclick = () => saveStepData(job.id, i);
        }
    }

    // Auto-initialize emoji picker on comment input
    setTimeout(() => initEmojiPicker('jobCommentInput'), 100);
}

function renderAccordionStep(job, stepNum) {
    const stepKey = `step${stepNum}`;
    const stepData = job.steps[stepKey];
    const isCompleted = stepData?.completed;
    const isActive = job.currentStep === stepNum && job.status !== 'completed';
    const isLocked = stepNum > (job.currentStep || 1) && job.status !== 'completed';

    let stateClass = 'locked';
    let badgeText = '🔒 Kilitli';
    if (isCompleted) {
        stateClass = 'completed';
        badgeText = '✓ Tamamlandı';
    } else if (isActive) {
        stateClass = 'active expanded'; // Auto-expanded if active
        badgeText = '⚡ Aktif';
    }

    const stepName = getStepTitle(job, stepNum);

    return `
        <div class="step-accordion-item ${stateClass}" id="stepItem-${stepNum}">
            <div class="step-accordion-header step-header-clickable" data-step="${stepNum}">
                <div class="header-left">
                    <span class="step-number-badge">${stepNum}</span>
                    <span class="step-name-text">${escapeHtml(stepName)}</span>
                </div>
                <span class="step-status-badge">${badgeText}</span>
            </div>
            <div class="step-accordion-content">
                <div class="step-form-wrapper">
                    ${renderStepFields(job, stepNum)}
                    ${!isLocked ? `<button class="btn btn-primary btn-block btn-sm save-step-btn" id="saveStepBtn-${stepNum}" style="margin-top: 15px;">Aşamayı Kaydet & İlerlet</button>` : ''}
                    ${(isCompleted || job.status === 'completed') ? `
                        <button type="button" class="btn btn-sm btn-block rollback-step-btn" onclick="rollbackJobToStep('${job.id}', ${stepNum})" style="margin-top: 10px; background: rgba(156, 163, 175, 0.05); border: 1px solid rgba(156, 163, 175, 0.15); color: #9ca3af; font-style: italic; font-weight: 500; padding: 6px 12px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; border-radius: 8px; font-size: 11px;">
                            🔄 Bu Aşamaya Geri Dön
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderStepFields(job, stepNum) {
    const steps = job.steps;
    const stepsConf = getWorkflowSteps(job);
    const stepConf = stepsConf[stepNum - 1];
    if (!stepConf) return '';

    const sData = steps[`step${stepNum}`] || {};

    switch (stepConf.type) {
        case 'TADIL_BEDELI':
            return `
                <div class="form-row">
                    <div class="form-group">
                        <label>Tadil Bedeli Talep Tarihi</label>
                        <input type="date" id="tadilBedeliTarih-${stepNum}" value="${sData.date || ''}" class="modern-input">
                    </div>
                    <div class="form-group">
                        <label>Talep Edilen Bedel (TL)</label>
                        <input type="text" id="tadilBedeliAmount-${stepNum}" value="${escapeHtml(sData.amount || '')}" class="modern-input" placeholder="Örn: 15,000 TL">
                    </div>
                </div>
            `;
        case 'BASVURU':
            return `
                <div class="form-row">
                    <div class="form-group">
                        <label>Başvuru Tarihi</label>
                        <input type="date" id="date-${stepNum}" value="${sData.date || ''}" class="modern-input">
                    </div>
                    <div class="form-group">
                        <label>Başvuru Sayısı</label>
                        <input type="text" id="number-${stepNum}" value="${escapeHtml(sData.number || '')}" class="modern-input" placeholder="Örn: 10452">
                    </div>
                </div>
                <div class="form-group" style="margin-top:10px;">
                    <label>M-Files ID</label>
                    <input type="text" id="mfilesId-${stepNum}" value="${escapeHtml(sData.mfilesId || '')}" class="modern-input" placeholder="Örn: 12345">
                </div>
            `;
        case 'KURUM_GORUS_TEIAS_EIGM':
            return `
                <div class="gorus-box" style="border:1px solid rgba(255,255,255,0.05); padding:12px; border-radius:10px; background:rgba(0,0,0,0.15); margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h5 style="color:var(--accent-light); margin:0; font-size:13px; font-weight:bold;">TEİAŞ Görüş Süreci</h5>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="quickCompleteGorus('${job.id}', 'teias', ${stepNum})" style="font-size:10px; padding:2px 6px; background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.1);">Sayı/Tarih Olmadan Tamamla</button>
                    </div>
                    <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                        <input type="checkbox" id="teiasCikildi-${stepNum}" ${sData.teiasCikildi ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                        <label for="teiasCikildi-${stepNum}" style="font-weight:bold; color:var(--text-primary); margin-bottom:0; cursor:pointer; font-size:12px;">TEİAŞ Görüşüne Çıkıldı</label>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Görüşe Çıkış Tarihi</label>
                            <input type="date" id="teiasCikisTarih-${stepNum}" value="${sData.teiasCikisTarih || ''}" class="modern-input">
                        </div>
                        <div class="form-group">
                            <label>Görüşe Çıkış Sayısı</label>
                            <input type="text" id="teiasCikisSayi-${stepNum}" value="${escapeHtml(sData.teiasCikisSayi || '')}" class="modern-input" placeholder="Örn: 10452">
                        </div>
                    </div>
                    <div class="form-row" style="margin-top:10px;">
                        <div class="form-group">
                            <label>Cevap Tarihi</label>
                            <input type="date" id="teiasTarih-${stepNum}" value="${sData.teiasTarih || ''}" class="modern-input">
                        </div>
                        <div class="form-group">
                            <label>Cevap Sayısı</label>
                            <input type="text" id="teiasSayi-${stepNum}" value="${escapeHtml(sData.teiasSayi || '')}" class="modern-input" placeholder="Örn: 24785">
                        </div>
                    </div>
                    <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-top:12px; margin-bottom:0;">
                        <input type="checkbox" id="teiasDondu-${stepNum}" ${sData.teiasDondu ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                        <label for="teiasDondu-${stepNum}" style="font-weight:bold; color:#10b981; margin-bottom:0; cursor:pointer; font-size:12px;">TEİAŞ Görüşü Cevaplandı / Tamamlandı</label>
                    </div>
                </div>
                <div class="gorus-box" style="border:1px solid rgba(255,255,255,0.05); padding:12px; border-radius:10px; background:rgba(0,0,0,0.15);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h5 style="color:var(--accent-light); margin:0; font-size:13px; font-weight:bold;">EİGM Görüş Süreci</h5>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="quickCompleteGorus('${job.id}', 'eigm', ${stepNum})" style="font-size:10px; padding:2px 6px; background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.1);">Sayı/Tarih Olmadan Tamamla</button>
                    </div>
                    <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                        <input type="checkbox" id="eigmCikildi-${stepNum}" ${sData.eigmCikildi ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                        <label for="eigmCikildi-${stepNum}" style="font-weight:bold; color:var(--text-primary); margin-bottom:0; cursor:pointer; font-size:12px;">EİGM Görüşüne Çıkıldı</label>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Görüşe Çıkış Tarihi</label>
                            <input type="date" id="eigmCikisTarih-${stepNum}" value="${sData.eigmCikisTarih || ''}" class="modern-input">
                        </div>
                        <div class="form-group">
                            <label>Görüşe Çıkış Sayısı</label>
                            <input type="text" id="eigmCikisSayi-${stepNum}" value="${escapeHtml(sData.eigmCikisSayi || '')}" class="modern-input" placeholder="Örn: E-45214">
                        </div>
                    </div>
                    <div class="form-row" style="margin-top:10px;">
                        <div class="form-group">
                            <label>Cevap Tarihi</label>
                            <input type="date" id="eigmTarih-${stepNum}" value="${sData.eigmTarih || ''}" class="modern-input">
                        </div>
                        <div class="form-group">
                            <label>Cevap Sayısı</label>
                            <input type="text" id="eigmSayi-${stepNum}" value="${escapeHtml(sData.eigmSayi || '')}" class="modern-input" placeholder="Örn: 98754">
                        </div>
                    </div>
                    <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-top:12px; margin-bottom:0;">
                        <input type="checkbox" id="eigmDondu-${stepNum}" ${sData.eigmDondu ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                        <label for="eigmDondu-${stepNum}" style="font-weight:bold; color:#10b981; margin-bottom:0; cursor:pointer; font-size:12px;">EİGM Görüşü Cevaplandı / Tamamlandı</label>
                    </div>
                </div>
            `;
        case 'KURUM_GORUS_TEIAS':
            return `
                <div class="gorus-box" style="border:1px solid rgba(255,255,255,0.05); padding:12px; border-radius:10px; background:rgba(0,0,0,0.15);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h5 style="color:var(--accent-light); margin:0; font-size:13px; font-weight:bold;">TEİAŞ Görüş Süreci</h5>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="quickCompleteGorus('${job.id}', 'teias', ${stepNum})" style="font-size:10px; padding:2px 6px; background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.1);">Sayı/Tarih Olmadan Tamamla</button>
                    </div>
                    <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                        <input type="checkbox" id="teiasCikildi-${stepNum}" ${sData.teiasCikildi ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                        <label for="teiasCikildi-${stepNum}" style="font-weight:bold; color:var(--text-primary); margin-bottom:0; cursor:pointer; font-size:12px;">TEİAŞ Görüşüne Çıkıldı</label>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Görüşe Çıkış Tarihi</label>
                            <input type="date" id="teiasCikisTarih-${stepNum}" value="${sData.teiasCikisTarih || ''}" class="modern-input">
                        </div>
                        <div class="form-group">
                            <label>Görüşe Çıkış Sayısı</label>
                            <input type="text" id="teiasCikisSayi-${stepNum}" value="${escapeHtml(sData.teiasCikisSayi || '')}" class="modern-input" placeholder="Örn: 10452">
                        </div>
                    </div>
                    <div class="form-row" style="margin-top:10px;">
                        <div class="form-group">
                            <label>Cevap Tarihi</label>
                            <input type="date" id="teiasTarih-${stepNum}" value="${sData.teiasTarih || ''}" class="modern-input">
                        </div>
                        <div class="form-group">
                            <label>Cevap Sayısı</label>
                            <input type="text" id="teiasSayi-${stepNum}" value="${escapeHtml(sData.teiasSayi || '')}" class="modern-input" placeholder="Örn: 24785">
                        </div>
                    </div>
                    <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-top:12px; margin-bottom:0;">
                        <input type="checkbox" id="teiasDondu-${stepNum}" ${sData.teiasDondu ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                        <label for="teiasDondu-${stepNum}" style="font-weight:bold; color:#10b981; margin-bottom:0; cursor:pointer; font-size:12px;">TEİAŞ Görüşü Cevaplandı / Tamamlandı</label>
                    </div>
                </div>
            `;
        case 'KURUM_GORUS_EIGM':
            return `
                <div class="gorus-box" style="border:1px solid rgba(255,255,255,0.05); padding:12px; border-radius:10px; background:rgba(0,0,0,0.15);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h5 style="color:var(--accent-light); margin:0; font-size:13px; font-weight:bold;">EİGM Görüş Süreci</h5>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="quickCompleteGorus('${job.id}', 'eigm', ${stepNum})" style="font-size:10px; padding:2px 6px; background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.1);">Sayı/Tarih Olmadan Tamamla</button>
                    </div>
                    <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                        <input type="checkbox" id="eigmCikildi-${stepNum}" ${sData.eigmCikildi ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                        <label for="eigmCikildi-${stepNum}" style="font-weight:bold; color:var(--text-primary); margin-bottom:0; cursor:pointer; font-size:12px;">EİGM Görüşüne Çıkıldı</label>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Görüşe Çıkış Tarihi</label>
                            <input type="date" id="eigmCikisTarih-${stepNum}" value="${sData.eigmCikisTarih || ''}" class="modern-input">
                        </div>
                        <div class="form-group">
                            <label>Görüşe Çıkış Sayısı</label>
                            <input type="text" id="eigmCikisSayi-${stepNum}" value="${escapeHtml(sData.eigmCikisSayi || '')}" class="modern-input" placeholder="Örn: E-45214">
                        </div>
                    </div>
                    <div class="form-row" style="margin-top:10px;">
                        <div class="form-group">
                            <label>Cevap Tarihi</label>
                            <input type="date" id="eigmTarih-${stepNum}" value="${sData.eigmTarih || ''}" class="modern-input">
                        </div>
                        <div class="form-group">
                            <label>Cevap Sayısı</label>
                            <input type="text" id="eigmSayi-${stepNum}" value="${escapeHtml(sData.eigmSayi || '')}" class="modern-input" placeholder="Örn: 98754">
                        </div>
                    </div>
                    <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-top:12px; margin-bottom:0;">
                        <input type="checkbox" id="eigmDondu-${stepNum}" ${sData.eigmDondu ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                        <label for="eigmDondu-${stepNum}" style="font-weight:bold; color:#10b981; margin-bottom:0; cursor:pointer; font-size:12px;">EİGM Görüşü Cevaplandı / Tamamlandı</label>
                    </div>
                </div>
            `;
        case 'KURUM_GORUS_KDB':
            return `
                <div class="gorus-box" style="border:1px solid rgba(255,255,255,0.05); padding:12px; border-radius:10px; background:rgba(0,0,0,0.15);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h5 style="color:var(--accent-light); margin:0; font-size:13px; font-weight:bold;">KDB Görüş Süreci</h5>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="quickCompleteGorus('${job.id}', 'kdb', ${stepNum})" style="font-size:10px; padding:2px 6px; background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.1);">Sayı/Tarih Olmadan Tamamla</button>
                    </div>
                    <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                        <input type="checkbox" id="kdbCikildi-${stepNum}" ${sData.kdbCikildi ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                        <label for="kdbCikildi-${stepNum}" style="font-weight:bold; color:var(--text-primary); margin-bottom:0; cursor:pointer; font-size:12px;">KDB Görüşüne Çıkıldı</label>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Görüşe Çıkış Tarihi</label>
                            <input type="date" id="kdbCikisTarih-${stepNum}" value="${sData.kdbCikisTarih || ''}" class="modern-input">
                        </div>
                        <div class="form-group">
                            <label>Görüşe Çıkış Sayısı</label>
                            <input type="text" id="kdbCikisSayi-${stepNum}" value="${escapeHtml(sData.kdbCikisSayi || '')}" class="modern-input" placeholder="Örn: K-12345">
                        </div>
                    </div>
                    <div class="form-row" style="margin-top:10px;">
                        <div class="form-group">
                            <label>Cevap Tarihi</label>
                            <input type="date" id="kdbTarih-${stepNum}" value="${sData.kdbTarih || ''}" class="modern-input">
                        </div>
                        <div class="form-group">
                            <label>Cevap Sayısı</label>
                            <input type="text" id="kdbSayi-${stepNum}" value="${escapeHtml(sData.kdbSayi || '')}" class="modern-input" placeholder="Örn: 54321">
                        </div>
                    </div>
                    <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-top:12px; margin-bottom:0;">
                        <input type="checkbox" id="kdbDondu-${stepNum}" ${sData.kdbDondu ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                        <label for="kdbDondu-${stepNum}" style="font-weight:bold; color:#10b981; margin-bottom:0; cursor:pointer; font-size:12px;">KDB Görüşü Cevaplandı / Tamamlandı</label>
                    </div>
                </div>
            `;
        case 'OLUR_MUZEKKERE_YAZIMI':
            return `
                <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <input type="checkbox" id="yazildi-${stepNum}" ${sData.yazildi ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                    <label for="yazildi-${stepNum}" style="font-weight:bold; color:var(--accent-light); margin-bottom:0; cursor:pointer;">Olur / Müzekkere Yazıldı</label>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Yazım Tarihi</label>
                        <input type="date" id="date-${stepNum}" value="${sData.date || ''}" class="modern-input">
                    </div>
                    <div class="form-group">
                        <label>Evrak Sayısı</label>
                        <input type="text" id="number-${stepNum}" value="${escapeHtml(sData.number || '')}" class="modern-input" placeholder="Örn: E-45214">
                    </div>
                </div>
            `;
        case 'OLUR_IMZALANMASI_VE_GUNDEM':
            return `
                <div class="form-group">
                    <label>İmza Durumu</label>
                    <select id="imzaDurumu-${stepNum}" class="modern-select">
                        <option value="imzada" ${sData.imzaDurumu === 'imzada' ? 'selected' : ''}>✍️ İmzada</option>
                        <option value="kurulda" ${sData.imzaDurumu === 'kurulda' ? 'selected' : ''}>🏛️ Kurul Gündeminde</option>
                        <option value="imzalandı" ${sData.imzaDurumu === 'imzalandı' ? 'selected' : ''}>✅ İmzalandı</option>
                    </select>
                </div>
                <div class="form-row" style="margin-top:10px;">
                    <div class="form-group">
                        <label>Karar / Olur Tarihi</label>
                        <input type="date" id="date-${stepNum}" value="${sData.date || ''}" class="modern-input">
                    </div>
                    <div class="form-group">
                        <label>Karar / Olur Sayısı</label>
                        <input type="text" id="number-${stepNum}" value="${escapeHtml(sData.number || '')}" class="modern-input" placeholder="Örn: 10452-1">
                    </div>
                </div>
            `;
        case 'YUKUMLULUK_TANIMLAMA':
            {
                const obIds = sData.obligationIds || [];
                let obligationsListHtml = '';
                if (obIds.length > 0) {
                    obligationsListHtml = `
                        <div class="linked-obligations-title" style="font-weight:bold; font-size:12px; color:var(--accent-light); margin-bottom:8px;">Tanımlanan Yükümlülükler:</div>
                        <div class="linked-obligations-list" style="display:flex; flex-direction:column; gap:6px; margin-bottom:12px;">
                            ${obIds.map(id => {
                                const ob = Store.obligations.find(o => o.id == id);
                                if (!ob) return '';
                                return `
                                    <div class="linked-obligation-item" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                                        <div style="text-align:left; font-size:12px;">
                                            <div style="font-weight:600; color:#fff;">${escapeHtml(ob.obligationType)}</div>
                                            <div style="color:var(--text-muted); font-size:11px; margin-top:2px;">${escapeHtml(ob.obligationDescription)}</div>
                                            <div style="color:#fbbf24; font-size:10px; margin-top:2px;">📅 Son Tarih: ${new Date(ob.deadline).toLocaleDateString('tr-TR')}</div>
                                        </div>
                                        <button type="button" class="btn btn-sm btn-danger" onclick="removeObligationFromTadil('${job.id}', '${ob.id}')" style="padding:2px 6px; font-size:10px; background:rgba(239,68,68,0.1); border-color:rgba(239,68,68,0.2); color:#ef4444;">Kaldır</button>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `;
                } else {
                    obligationsListHtml = `<p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">Henüz yükümlülük tanımlanmadı.</p>`;
                }

                return `
                    ${obligationsListHtml}
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="openAddObligationForTadil('${job.id}', '${escapeHtml(job.project)}')" style="font-size:12px; font-weight:600; background:rgba(99,102,241,0.15); border-color:rgba(99,102,241,0.3); color:#818cf8; flex-grow:1; display:flex; align-items:center; justify-content:center; gap:4px; padding: 6px 12px;">
                            ➕ Tanımlanan Yükümlülük Ekleyin
                        </button>
                    </div>
                    <div style="border-top:1px solid rgba(255,255,255,0.05); padding-top:12px; margin-top:12px; display:flex; justify-content:space-between; gap:10px;">
                        <button type="button" class="btn btn-sm" onclick="completeStepWithoutObligations('${job.id}', ${stepNum})" style="font-size:11.5px; font-weight:600; flex-grow:1; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.25); color:#f59e0b; padding: 8px 12px; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer; transition:all 0.2s;">
                            ⚠️ Yükümlülük Yok, Doğrudan İlerle
                        </button>
                    </div>
                `;
            }
        case 'YUKUMLULUK_TAMAMLAMA':
            {
                const tanimlamaIdx = stepsConf.findIndex(s => s.type === 'YUKUMLULUK_TANIMLAMA');
                const tanimlamaStepNum = tanimlamaIdx !== -1 ? tanimlamaIdx + 1 : null;
                const obIds6 = tanimlamaStepNum ? (steps[`step${tanimlamaStepNum}`]?.obligationIds || []) : [];
                const submissions = sData.submissions || {};

                if (obIds6.length === 0) {
                    return `
                        <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                            <input type="checkbox" id="sunuldu-${stepNum}" ${sData.sunuldu ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                            <label for="sunuldu-${stepNum}" style="font-weight:bold; color:var(--accent-light); margin-bottom:0; cursor:pointer;">Tadille İlgili Evraklar EPDK'ya Sunuldu</label>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Sunum Tarihi</label>
                                <input type="date" id="date-${stepNum}" value="${sData.date || ''}" class="modern-input">
                            </div>
                            <div class="form-group">
                                <label>Sunum Evrak Sayısı</label>
                                <input type="text" id="number-${stepNum}" value="${escapeHtml(sData.number || '')}" class="modern-input" placeholder="Örn: E-45214">
                            </div>
                        </div>
                    `;
                }

                return obIds6.map(id => {
                    const ob = Store.obligations.find(o => o.id == id);
                    if (!ob) return '';
                    const sub = submissions[id] || {};
                    return `
                        <div class="obligation-submission-row" style="background:rgba(255,255,255,0.02); padding:15px; border-radius:12px; border:1px solid rgba(255,255,255,0.05); margin-bottom:15px;">
                            <div style="font-size:13px; font-weight:600; color:#fff; margin-bottom:4px; text-align:left;">🏭 ${escapeHtml(ob.obligationType)}</div>
                            <div style="font-size:11px; color:var(--text-muted); margin-bottom:12px; text-align:left;">📄 ${escapeHtml(ob.obligationDescription)}</div>
                            
                            <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                                <input type="checkbox" id="sunuldu-${stepNum}-${ob.id}" ${sub.sunuldu ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                                <label for="sunuldu-${stepNum}-${ob.id}" style="font-weight:bold; color:var(--accent-light); margin-bottom:0; cursor:pointer; font-size:12px;">EPDK'ya Sunuldu</label>
                            </div>
                            <div class="form-row" style="margin-top:10px;">
                                <div class="form-group">
                                    <label style="font-size:11px; color:var(--text-muted);">Sunum Tarihi</label>
                                    <input type="date" id="date-${stepNum}-${ob.id}" value="${sub.date || ''}" class="modern-input">
                                </div>
                                <div class="form-group">
                                    <label style="font-size:11px; color:var(--text-muted);">Sunum Evrak Sayısı</label>
                                    <input type="text" id="number-${stepNum}-${ob.id}" value="${escapeHtml(sub.number || '')}" class="modern-input" placeholder="Örn: E-98765">
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        case 'DERC_EDILME':
            return `
                <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <input type="checkbox" id="dercEdildi-${stepNum}" ${sData.dercEdildi ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                    <label for="dercEdildi-${stepNum}" style="font-weight:bold; color:var(--accent-light); margin-bottom:0; cursor:pointer;">Tadil Kararı Lisansa Derç Edildi</label>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Derç Edilme Tarihi</label>
                        <input type="date" id="date-${stepNum}" value="${sData.date || ''}" class="modern-input">
                    </div>
                    <div class="form-group">
                        <label>Karar / Lisans Sayısı</label>
                        <input type="text" id="number-${stepNum}" value="${escapeHtml(sData.number || '')}" class="modern-input" placeholder="Örn: Karar no">
                    </div>
                </div>
            `;
        case 'BELGE_TESLIM':
            return `
                <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <input type="checkbox" id="teslimAlindi-${stepNum}" ${sData.teslimAlindi ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                    <label for="teslimAlindi-${stepNum}" style="font-weight:bold; color:var(--accent-light); margin-bottom:0; cursor:pointer;">Tadil Edilmiş Belge Teslim Alındı</label>
                </div>
                <div class="form-group">
                    <label>Teslim Alınma Tarihi</label>
                    <input type="date" id="date-${stepNum}" value="${sData.date || ''}" class="modern-input">
                </div>
            `;
        case 'DAGITIM':
            return `
                <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <input type="checkbox" id="dagitildi-${stepNum}" ${sData.dagitildi ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                    <label for="dagitildi-${stepNum}" style="font-weight:bold; color:var(--accent-light); margin-bottom:0; cursor:pointer;">Lisans Belgesi Dağıtımı Yapıldı</label>
                </div>
                <div class="form-group">
                    <label>Gönderim Tipi</label>
                    <select id="tip-${stepNum}" class="modern-select">
                        <option value="kargo" ${sData.tip === 'kargo' ? 'selected' : ''}>📦 Kargo</option>
                        <option value="email" ${sData.tip === 'email' ? 'selected' : ''}>📧 E-Posta / KEP</option>
                        <option value="elden" ${sData.tip === 'elden' ? 'selected' : ''}>👤 Elden Teslim</option>
                    </select>
                </div>
            `;
        case 'BILGI_NOTU_TALEBI':
            return `
                <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <input type="checkbox" id="bilgiNotuAlindi-${stepNum}" ${sData.completed ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                    <label for="bilgiNotuAlindi-${stepNum}" style="font-weight:bold; color:var(--accent-light); margin-bottom:0; cursor:pointer;">Bilgi Notu Alındı / Tamamlandı</label>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Talep Tarihi</label>
                        <input type="date" id="date-${stepNum}" value="${sData.date || ''}" class="modern-input">
                    </div>
                    <div class="form-group">
                        <label>Kişi ve Detaylar</label>
                        <input type="text" id="detay-${stepNum}" value="${escapeHtml(sData.detay || '')}" class="modern-input" placeholder="Örn: Ahmet Bey'den istendi">
                    </div>
                </div>
            `;
        case 'EVRAK_EPDK_SUNULMASI':
            return `
                <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <input type="checkbox" id="sunuldu-${stepNum}" ${sData.sunuldu ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                    <label for="sunuldu-${stepNum}" style="font-weight:bold; color:var(--accent-light); margin-bottom:0; cursor:pointer;">Evrak EPDK'ya Sunuldu</label>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Sunum Tarihi</label>
                        <input type="date" id="date-${stepNum}" value="${sData.date || ''}" class="modern-input">
                    </div>
                    <div class="form-group">
                        <label>Sayı / Barkod Numarası</label>
                        <input type="text" id="number-${stepNum}" value="${escapeHtml(sData.number || '')}" class="modern-input" placeholder="Örn: Barkod no / Sayı">
                    </div>
                </div>
            `;
        case 'MUHATAP_YETKILISI_TANIMLANMASI':
            return `
                <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <input type="checkbox" id="tanimlandi-${stepNum}" ${sData.completed ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                    <label for="tanimlandi-${stepNum}" style="font-weight:bold; color:var(--accent-light); margin-bottom:0; cursor:pointer;">Muhatap Yetkilisi Tanımlandı</label>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Tanımlanma Tarihi</label>
                        <input type="date" id="date-${stepNum}" value="${sData.date || ''}" class="modern-input">
                    </div>
                    <div class="form-group">
                        <label>Yetkili Kişi ve Notlar</label>
                        <input type="text" id="detay-${stepNum}" value="${escapeHtml(sData.detay || '')}" class="modern-input" placeholder="Örn: Mehmet Caner (İmza Sirküleri)">
                    </div>
                </div>
            `;
        case 'TEMINAT_IADESI':
            return `
                <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <input type="checkbox" id="teminatIadesi-${stepNum}" ${sData.completed ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                    <label for="teminatIadesi-${stepNum}" style="font-weight:bold; color:var(--accent-light); margin-bottom:0; cursor:pointer;">Teminat İadesi Talep Edildi / İstendi</label>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>İstek Tarihi</label>
                        <input type="date" id="date-${stepNum}" value="${sData.date || ''}" class="modern-input">
                    </div>
                    <div class="form-group">
                        <label>Evrak Sayısı / Barkod No</label>
                        <input type="text" id="number-${stepNum}" value="${escapeHtml(sData.number || '')}" class="modern-input" placeholder="Örn: E-98754-Barkod">
                    </div>
                </div>
            `;
        case 'GENEL_DEGERLENDIRME':
            return `
                <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <input type="checkbox" id="tamamlandi-${stepNum}" ${sData.tamamlandi ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                    <label for="tamamlandi-${stepNum}" style="font-weight:bold; color:var(--accent-light); margin-bottom:0; cursor:pointer;">Kurum Değerlendirmeleri Tamamlandı</label>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Evrak Tarihi</label>
                        <input type="date" id="date-${stepNum}" value="${sData.date || ''}" class="modern-input">
                    </div>
                    <div class="form-group">
                        <label>Evrak Sayısı</label>
                        <input type="text" id="number-${stepNum}" value="${escapeHtml(sData.number || '')}" class="modern-input" placeholder="Örn: E-45214">
                    </div>
                </div>
                <div class="form-group" style="margin-top:10px;">
                    <label>Açıklama / İnceleme Notları</label>
                    <textarea id="aciklama-${stepNum}" rows="2" class="modern-textarea" placeholder="Kurum görüşleri veya süreç hakkında notlar...">${escapeHtml(sData.aciklama || '')}</textarea>
                </div>
            `;
        case 'GENEL_SONUCLANDIRMA':
            return `
                <div class="form-group checkbox-group" style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <input type="checkbox" id="tamamlandi-${stepNum}" ${sData.tamamlandi ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;">
                    <label for="tamamlandi-${stepNum}" style="font-weight:bold; color:var(--accent-light); margin-bottom:0; cursor:pointer;">Tadil Sonuçlandırıldı ve Karar Derç Edildi</label>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Karar Sonucu</label>
                        <select id="sonuc-${stepNum}" class="modern-select">
                            <option value="Onaylandı" ${sData.sonuc === 'Onaylandı' ? 'selected' : ''}>🟢 Onaylandı</option>
                            <option value="Reddedildi" ${sData.sonuc === 'Reddedildi' ? 'selected' : ''}>🔴 Reddedildi</option>
                            <option value="İptal Edildi" ${sData.sonuc === 'İptal Edildi' ? 'selected' : ''}>⚪ İptal Edildi</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Karar / Olur Tarihi</label>
                        <input type="date" id="date-${stepNum}" value="${sData.date || ''}" class="modern-input">
                    </div>
                </div>
                <div class="form-row" style="margin-top:10px;">
                    <div class="form-group">
                        <label>Karar / Olur Sayısı</label>
                        <input type="text" id="number-${stepNum}" value="${escapeHtml(sData.number || '')}" class="modern-input" placeholder="Örn: 98754">
                    </div>
                    <div class="form-group">
                        <label>Kargo Takip / Detay No</label>
                        <input type="text" id="detay-${stepNum}" value="${escapeHtml(sData.detay || '')}" class="modern-input" placeholder="Örn: Elden teslim / KEP / Kargo Kodu">
                    </div>
                </div>
            `;
        default:
            return '';
    }
}

// Client-side helper for live calculation of obligation date inside step 5 modal
window.calculateTadilObligationDate = function (daysVal) {
    const days = parseInt(daysVal, 10);
    const dateInputStep4 = document.getElementById('date-4'); // Imza date
    const targetInput = document.getElementById('sonTarih-5');

    if (!targetInput) return;
    if (isNaN(days) || !dateInputStep4 || !dateInputStep4.value) {
        return;
    }

    const baseDate = new Date(dateInputStep4.value);
    const targetDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    targetInput.value = targetDate.toISOString().split('T')[0];
};

window.quickCompleteGorus = function(jobId, type, stepNum) {
    const job = Store.jobs.find(j => j.id == jobId);
    if (!job) return;

    const cikildiChk = document.getElementById(`${type}Cikildi-${stepNum}`);
    if (cikildiChk) cikildiChk.checked = true;

    const checkbox = document.getElementById(`${type}Dondu-${stepNum}`);
    if (checkbox) checkbox.checked = true;

    saveStepData(jobId, stepNum);
};

function saveStepData(jobId, stepNum) {
    const job = Store.jobs.find(j => j.id == jobId);
    if (!job) return;

    const steps = { ...job.steps };
    let currentStep = job.currentStep || 1;
    let status = job.status || 'pending';
    
    const stepsConf = getWorkflowSteps(job);
    const stepConf = stepsConf[stepNum - 1];
    if (!stepConf) return;

    switch (stepConf.type) {
        case 'TADIL_BEDELI':
            {
                const dateVal = document.getElementById(`tadilBedeliTarih-${stepNum}`).value;
                const amountVal = document.getElementById(`tadilBedeliAmount-${stepNum}`).value.trim();
                if (!dateVal || !amountVal) {
                    showToast('Tarih ve bedel alanları zorunludur.', 'warning');
                    return;
                }
                steps[`step${stepNum}`] = { completed: true, date: dateVal, amount: amountVal };
                if (currentStep === stepNum) currentStep = stepNum + 1;
            }
            break;

        case 'BASVURU':
            {
                const dateVal = document.getElementById(`date-${stepNum}`).value;
                const numberVal = document.getElementById(`number-${stepNum}`).value.trim();
                const mfilesVal = document.getElementById(`mfilesId-${stepNum}`).value.trim();
                if (!dateVal || !numberVal) {
                    showToast('Tarih ve sayı alanları zorunludur.', 'warning');
                    return;
                }
                steps[`step${stepNum}`] = { completed: true, date: dateVal, number: numberVal, mfilesId: mfilesVal };
                if (currentStep === stepNum) currentStep = stepNum + 1;
            }
            break;

        case 'KURUM_GORUS_TEIAS_EIGM':
            {
                const teiasCikildi = document.getElementById(`teiasCikildi-${stepNum}`)?.checked || false;
                let teias = document.getElementById(`teiasDondu-${stepNum}`).checked;
                const teiasCikisSayi = document.getElementById(`teiasCikisSayi-${stepNum}`).value.trim();
                const teiasCikisTarih = document.getElementById(`teiasCikisTarih-${stepNum}`).value;
                const teiasSayi = document.getElementById(`teiasSayi-${stepNum}`).value.trim();
                const teiasTarih = document.getElementById(`teiasTarih-${stepNum}`).value;

                const eigmCikildi = document.getElementById(`eigmCikildi-${stepNum}`)?.checked || false;
                let eigm = document.getElementById(`eigmDondu-${stepNum}`).checked;
                const eigmCikisSayi = document.getElementById(`eigmCikisSayi-${stepNum}`).value.trim();
                const eigmCikisTarih = document.getElementById(`eigmCikisTarih-${stepNum}`).value;
                const eigmSayi = document.getElementById(`eigmSayi-${stepNum}`).value.trim();
                const eigmTarih = document.getElementById(`eigmTarih-${stepNum}`).value;

                if (teiasCikisTarih && teiasTarih) teias = true;
                if (eigmCikisTarih && eigmTarih) eigm = true;

                const isCompletedVal = teias && eigm;

                steps[`step${stepNum}`] = {
                    completed: isCompletedVal,
                    teiasCikildi: teiasCikildi || teias || !!teiasCikisTarih || !!teiasCikisSayi,
                    teiasDondu: teias, teiasCikisSayi, teiasCikisTarih, teiasSayi, teiasTarih,
                    eigmCikildi: eigmCikildi || eigm || !!eigmCikisTarih || !!eigmCikisSayi,
                    eigmDondu: eigm, eigmCikisSayi, eigmCikisTarih, eigmSayi, eigmTarih
                };

                if (isCompletedVal) {
                    if (currentStep === stepNum) currentStep = stepNum + 1;
                } else {
                    if (currentStep > stepNum) currentStep = stepNum;
                }
            }
            break;

        case 'KURUM_GORUS_TEIAS':
            {
                const teiasCikildi = document.getElementById(`teiasCikildi-${stepNum}`)?.checked || false;
                let teias = document.getElementById(`teiasDondu-${stepNum}`).checked;
                const teiasCikisSayi = document.getElementById(`teiasCikisSayi-${stepNum}`).value.trim();
                const teiasCikisTarih = document.getElementById(`teiasCikisTarih-${stepNum}`).value;
                const teiasSayi = document.getElementById(`teiasSayi-${stepNum}`).value.trim();
                const teiasTarih = document.getElementById(`teiasTarih-${stepNum}`).value;

                if (teiasCikisTarih && teiasTarih) teias = true;

                steps[`step${stepNum}`] = {
                    completed: teias,
                    teiasCikildi: teiasCikildi || teias || !!teiasCikisTarih || !!teiasCikisSayi,
                    teiasDondu: teias, teiasCikisSayi, teiasCikisTarih, teiasSayi, teiasTarih
                };

                if (teias) {
                    if (currentStep === stepNum) currentStep = stepNum + 1;
                } else {
                    if (currentStep > stepNum) currentStep = stepNum;
                }
            }
            break;

        case 'KURUM_GORUS_EIGM':
            {
                const eigmCikildi = document.getElementById(`eigmCikildi-${stepNum}`)?.checked || false;
                let eigm = document.getElementById(`eigmDondu-${stepNum}`).checked;
                const eigmCikisSayi = document.getElementById(`eigmCikisSayi-${stepNum}`).value.trim();
                const eigmCikisTarih = document.getElementById(`eigmCikisTarih-${stepNum}`).value;
                const eigmSayi = document.getElementById(`eigmSayi-${stepNum}`).value.trim();
                const eigmTarih = document.getElementById(`eigmTarih-${stepNum}`).value;

                if (eigmCikisTarih && eigmTarih) eigm = true;

                steps[`step${stepNum}`] = {
                    completed: eigm,
                    eigmCikildi: eigmCikildi || eigm || !!eigmCikisTarih || !!eigmCikisSayi,
                    eigmDondu: eigm, eigmCikisSayi, eigmCikisTarih, eigmSayi, eigmTarih
                };

                if (eigm) {
                    if (currentStep === stepNum) currentStep = stepNum + 1;
                } else {
                    if (currentStep > stepNum) currentStep = stepNum;
                }
            }
            break;

        case 'KURUM_GORUS_KDB':
            {
                const kdbCikildi = document.getElementById(`kdbCikildi-${stepNum}`)?.checked || false;
                let kdb = document.getElementById(`kdbDondu-${stepNum}`).checked;
                const kdbCikisSayi = document.getElementById(`kdbCikisSayi-${stepNum}`).value.trim();
                const kdbCikisTarih = document.getElementById(`kdbCikisTarih-${stepNum}`).value;
                const kdbSayi = document.getElementById(`kdbSayi-${stepNum}`).value.trim();
                const kdbTarih = document.getElementById(`kdbTarih-${stepNum}`).value;

                if (kdbCikisTarih && kdbTarih) kdb = true;

                steps[`step${stepNum}`] = {
                    completed: kdb,
                    kdbCikildi: kdbCikildi || kdb || !!kdbCikisTarih || !!kdbCikisSayi,
                    kdbDondu: kdb, kdbCikisSayi, kdbCikisTarih, kdbSayi, kdbTarih
                };

                if (kdb) {
                    if (currentStep === stepNum) currentStep = stepNum + 1;
                } else {
                    if (currentStep > stepNum) currentStep = stepNum;
                }
            }
            break;

        case 'OLUR_MUZEKKERE_YAZIMI':
            {
                const dateVal = document.getElementById(`date-${stepNum}`).value;
                const numberVal = document.getElementById(`number-${stepNum}`).value.trim();

                if (!dateVal || !numberVal) {
                    showToast('Yazım tarihi ve evrak sayısı zorunludur.', 'warning');
                    return;
                }
                const chk = document.getElementById(`yazildi-${stepNum}`);
                if (chk) chk.checked = true;

                steps[`step${stepNum}`] = { completed: true, yazildi: true, date: dateVal, number: numberVal };
                if (currentStep === stepNum) currentStep = stepNum + 1;
            }
            break;

        case 'OLUR_IMZALANMASI_VE_GUNDEM':
            {
                const imzaDurumuInput = document.getElementById(`imzaDurumu-${stepNum}`).value;
                const dateVal = document.getElementById(`date-${stepNum}`).value;
                const numberVal = document.getElementById(`number-${stepNum}`).value.trim();

                const isCompletedStep = imzaDurumuInput === 'imzalandı' || (dateVal && numberVal);

                if (isCompletedStep) {
                    if (!dateVal || !numberVal) {
                        showToast('İmzalandı aşaması için karar/olur tarihi ve sayısı zorunludur.', 'warning');
                        return;
                    }
                    const selectEl = document.getElementById(`imzaDurumu-${stepNum}`);
                    if (selectEl) selectEl.value = 'imzalandı';

                    steps[`step${stepNum}`] = { completed: true, imzaDurumu: 'imzalandı', date: dateVal, number: numberVal };
                    if (currentStep === stepNum) currentStep = stepNum + 1;
                } else {
                    steps[`step${stepNum}`] = { completed: false, imzaDurumu: imzaDurumuInput, date: dateVal, number: numberVal };
                    if (currentStep > stepNum) currentStep = stepNum;
                }
            }
            break;

        case 'YUKUMLULUK_TANIMLAMA':
            {
                const stepDataVal = steps[`step${stepNum}`] || {};
                const currentObIds = stepDataVal.obligationIds || [];

                if (currentObIds.length > 0) {
                    steps[`step${stepNum}`] = { completed: true, obligationIds: currentObIds, noObligation: false };
                    if (currentStep === stepNum) currentStep = stepNum + 1;
                } else {
                    showToast('Lütfen yükümlülük tanımlayın veya "Yükümlülük Yok, Doğrudan İlerle" seçeneğini kullanın.', 'info');
                    return;
                }
            }
            break;

        case 'YUKUMLULUK_TAMAMLAMA':
            {
                const tanimlamaIdx = stepsConf.findIndex(s => s.type === 'YUKUMLULUK_TANIMLAMA');
                const tanimlamaStepNum = tanimlamaIdx !== -1 ? tanimlamaIdx + 1 : null;
                const obIds6Save = tanimlamaStepNum ? (steps[`step${tanimlamaStepNum}`]?.obligationIds || []) : [];

                if (obIds6Save.length === 0) {
                    const dateVal = document.getElementById(`date-${stepNum}`).value;
                    const numberVal = document.getElementById(`number-${stepNum}`).value.trim();

                    if (!dateVal || !numberVal) {
                        showToast('Sunum tarihi ve evrak sayısı zorunludur.', 'warning');
                        return;
                    }
                    const chk = document.getElementById(`sunuldu-${stepNum}`);
                    if (chk) chk.checked = true;

                    steps[`step${stepNum}`] = { completed: true, sunuldu: true, date: dateVal, number: numberVal };
                    if (currentStep === stepNum) currentStep = stepNum + 1;
                } else {
                    const newSubmissions = {};
                    let allObligationsSunuldu = true;

                    for (const id of obIds6Save) {
                        const chkEl = document.getElementById(`sunuldu-${stepNum}-${id}`);
                        const dateEl = document.getElementById(`date-${stepNum}-${id}`);
                        const numEl = document.getElementById(`number-${stepNum}-${id}`);

                        let isSunuldu = chkEl ? chkEl.checked : false;
                        const dateVal = dateEl ? dateEl.value : '';
                        const numVal = numEl ? numEl.value.trim() : '';

                        if (dateVal && numVal) {
                            isSunuldu = true;
                            if (chkEl) chkEl.checked = true;
                        }

                        newSubmissions[id] = {
                            sunuldu: isSunuldu,
                            date: dateVal,
                            number: numVal
                        };

                        if (!isSunuldu || !dateVal || !numVal) {
                            allObligationsSunuldu = false;
                        }
                    }

                    steps[`step${stepNum}`] = {
                        completed: allObligationsSunuldu,
                        submissions: newSubmissions
                    };

                    if (allObligationsSunuldu) {
                        if (currentStep === stepNum) currentStep = stepNum + 1;
                    } else {
                        if (currentStep > stepNum) currentStep = stepNum;
                        showToast('Evrak bilgileri kaydedildi. Tüm yükümlülükler sunulana kadar süreç bu aşamada kalacaktır.', 'info');
                    }
                }
            }
            break;

        case 'DERC_EDILME':
            {
                const isDercEdildi = document.getElementById(`dercEdildi-${stepNum}`).checked;
                const dateVal = document.getElementById(`date-${stepNum}`).value;
                const numberVal = document.getElementById(`number-${stepNum}`).value.trim();

                steps[`step${stepNum}`] = { completed: isDercEdildi, dercEdildi: isDercEdildi, date: dateVal, number: numberVal };
                if (isDercEdildi) {
                    if (currentStep === stepNum) currentStep = stepNum + 1;
                } else {
                    if (currentStep > stepNum) currentStep = stepNum;
                }
            }
            break;

        case 'BELGE_TESLIM':
            {
                const dateVal = document.getElementById(`date-${stepNum}`).value;

                if (!dateVal) {
                    showToast('Teslim alınma tarihi zorunludur.', 'warning');
                    return;
                }
                const chk = document.getElementById(`teslimAlindi-${stepNum}`);
                if (chk) chk.checked = true;

                steps[`step${stepNum}`] = { completed: true, teslimAlindi: true, date: dateVal };
                if (currentStep === stepNum) currentStep = stepNum + 1;
            }
            break;

        case 'DAGITIM':
            {
                const isDagitildi = document.getElementById(`dagitildi-${stepNum}`).checked;
                const tipVal = document.getElementById(`tip-${stepNum}`).value;

                steps[`step${stepNum}`] = { completed: isDagitildi, dagitildi: isDagitildi, tip: tipVal, detay: '' };

                if (isDagitildi) {
                    if (stepNum === stepsConf.length) {
                        status = 'completed';
                        job.completedAt = new Date();
                        showToast('Tüm tadil ve iş akışı aşamaları başarıyla tamamlandı! 🎉', 'success');
                    } else {
                        if (currentStep === stepNum) currentStep = stepNum + 1;
                    }
                } else {
                    if (currentStep > stepNum) currentStep = stepNum;
                }
            }
            break;

        case 'BILGI_NOTU_TALEBI':
            {
                const dateVal = document.getElementById(`date-${stepNum}`).value;
                const detayVal = document.getElementById(`detay-${stepNum}`).value.trim();

                if (!dateVal) {
                    showToast('Talep tarihi zorunludur.', 'warning');
                    return;
                }
                const chk = document.getElementById(`bilgiNotuAlindi-${stepNum}`);
                if (chk) chk.checked = true;

                steps[`step${stepNum}`] = { completed: true, date: dateVal, detay: detayVal };
                if (currentStep === stepNum) currentStep = stepNum + 1;
            }
            break;

        case 'EVRAK_EPDK_SUNULMASI':
            {
                const dateVal = document.getElementById(`date-${stepNum}`).value;
                const numberVal = document.getElementById(`number-${stepNum}`).value.trim();

                if (!dateVal || !numberVal) {
                    showToast('Tarih ve sayı/barkod alanları zorunludur.', 'warning');
                    return;
                }
                const chk = document.getElementById(`sunuldu-${stepNum}`);
                if (chk) chk.checked = true;

                steps[`step${stepNum}`] = { completed: true, sunuldu: true, date: dateVal, number: numberVal };
                if (currentStep === stepNum) currentStep = stepNum + 1;
            }
            break;

        case 'MUHATAP_YETKILISI_TANIMLANMASI':
            {
                const dateVal = document.getElementById(`date-${stepNum}`).value;
                const detayVal = document.getElementById(`detay-${stepNum}`).value.trim();

                if (!dateVal) {
                    showToast('Tarih alanı zorunludur.', 'warning');
                    return;
                }
                const chk = document.getElementById(`tanimlandi-${stepNum}`);
                if (chk) chk.checked = true;

                steps[`step${stepNum}`] = { completed: true, date: dateVal, detay: detayVal };

                if (stepNum === stepsConf.length) {
                    status = 'completed';
                    job.completedAt = new Date();
                    showToast('Süreç başarıyla tamamlandı! 🎉', 'success');
                } else {
                    if (currentStep === stepNum) currentStep = stepNum + 1;
                }
            }
            break;

        case 'TEMINAT_IADESI':
            {
                const dateVal = document.getElementById(`date-${stepNum}`).value;
                const numberVal = document.getElementById(`number-${stepNum}`).value.trim();

                if (!dateVal || !numberVal) {
                    showToast('Tarih ve Sayı / Barkod alanları zorunludur.', 'warning');
                    return;
                }
                const chk = document.getElementById(`teminatIadesi-${stepNum}`);
                if (chk) chk.checked = true;

                steps[`step${stepNum}`] = { completed: true, date: dateVal, number: numberVal };
                if (currentStep === stepNum) currentStep = stepNum + 1;
            }
            break;

        case 'GENEL_DEGERLENDIRME':
            {
                const dateVal = document.getElementById(`date-${stepNum}`).value;
                const numberVal = document.getElementById(`number-${stepNum}`).value.trim();
                const aciklamaVal = document.getElementById(`aciklama-${stepNum}`).value.trim();

                if (!dateVal || !numberVal) {
                    showToast('Tarih ve sayı alanları zorunludur.', 'warning');
                    return;
                }
                const chk = document.getElementById(`tamamlandi-${stepNum}`);
                if (chk) chk.checked = true;

                steps[`step${stepNum}`] = { completed: true, tamamlandi: true, date: dateVal, number: numberVal, aciklama: aciklamaVal };
                if (currentStep === stepNum) currentStep = stepNum + 1;
            }
            break;

        case 'GENEL_SONUCLANDIRMA':
            {
                const sonucVal = document.getElementById(`sonuc-${stepNum}`).value;
                const dateVal = document.getElementById(`date-${stepNum}`).value;
                const numberVal = document.getElementById(`number-${stepNum}`).value.trim();
                const detayVal = document.getElementById(`detay-${stepNum}`).value.trim();

                if (!dateVal || !numberVal) {
                    showToast('Karar tarihi ve sayısı zorunludur.', 'warning');
                    return;
                }
                const chk = document.getElementById(`tamamlandi-${stepNum}`);
                if (chk) chk.checked = true;

                steps[`step${stepNum}`] = { completed: true, tamamlandi: true, sonuc: sonucVal, date: dateVal, number: numberVal, detay: detayVal };
                status = 'completed';
                job.completedAt = new Date();
                showToast('Tadil süreci başarıyla tamamlandı! 🎉', 'success');
            }
            break;
    }

    // Workflow state machine: Lock all steps after the current step
    const totalSteps = stepsConf.length;
    for (let k = currentStep + 1; k <= totalSteps; k++) {
        // Skip locking of YUKUMLULUK_TAMAMLAMA if the YUKUMLULUK_TANIMLAMA step before it has noObligation = true
        const prevTanimlamaIdx = stepsConf.findIndex((s, sIdx) => s.type === 'YUKUMLULUK_TANIMLAMA' && sIdx < (k - 1));
        if (prevTanimlamaIdx !== -1) {
            const tanimStepKey = `step${prevTanimlamaIdx + 1}`;
            if (steps[tanimStepKey]?.noObligation) {
                continue;
            }
        }
        if (steps[`step${k}`]) {
            steps[`step${k}`].completed = false;
        }
    }

    // Save Updates
    const success = Store.updateJob(jobId, {
        steps,
        currentStep,
        status,
        updatedAt: new Date(),
        updatedBy: auth.currentUser?.email || 'System'
    });

    if (success && saveData()) {
        showToast(`Aşama ${stepNum} başarıyla kaydedildi.`, 'success');
        updateJobsView();

        // Reload detail modal to refresh states
        const updated = Store.jobs.find(j => j.id == jobId);
        if (updated) {
            showJobDetailModal(updated);
        }
    }
}

// ==========================================
// Comment Management
// ==========================================

function addJobComment(jobId, text) {
    const job = Store.jobs.find(j => j.id == jobId);
    if (!job) return;

    const newComment = {
        user: auth.currentUser?.email || 'Anonim',
        text: text,
        timestamp: new Date().toISOString()
    };

    const comments = Array.isArray(job.comments) ? [...job.comments] : [];
    comments.push(newComment);

    const success = Store.updateJob(jobId, { comments, updatedAt: new Date() });
    if (success && saveData()) {
        showToast('Not kaydedildi.', 'success');
    }
}

// Register global functions on window scope for Step 5 Yükümlülük bindings
window.showJobDetailModal = showJobDetailModal;

window.openAddObligationForTadil = function(jobId, projectName) {
    window.activeTadilJobIdForObligation = jobId;
    
    const overlay = document.getElementById('modalOverlay');
    const splitInput = document.getElementById('tadilProjectName');
    
    if (splitInput) {
        splitInput.value = projectName;
    }
    
    // Clear other fields in the split form
    const linkInput = document.getElementById('tadilProjectLink');
    const typeInput = document.getElementById('tadilObligationType');
    const descInput = document.getElementById('tadilObligationDescription');
    const dateInput = document.getElementById('tadilDeadline');
    const notesInput = document.getElementById('tadilNotes');
    
    if (linkInput) linkInput.value = '';
    if (typeInput) typeInput.value = '';
    if (descInput) descInput.value = '';
    if (dateInput) dateInput.value = '';
    if (notesInput) notesInput.value = '';
    
    if (overlay) {
        overlay.classList.add('split-active');
        
        // Dynamic scroll to split panel on mobile
        setTimeout(() => {
            const panel = document.getElementById('tadilObligationPanel');
            if (panel && window.innerWidth <= 768) {
                panel.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    }
};

window.removeObligationFromTadil = function(jobId, obId) {
    if (confirm('Bu yükümlülüğü silmek istediğinize emin misiniz?')) {
        // Remove from Store.obligations
        Store.obligations = Store.obligations.filter(o => o.id !== obId);
        
        // Remove from Job steps
        const job = Store.jobs.find(j => j.id == jobId);
        if (job) {
            const stepsConf = getWorkflowSteps(job);
            const tanimIdx = stepsConf.findIndex(s => s.type === 'YUKUMLULUK_TANIMLAMA');
            if (tanimIdx !== -1) {
                const stepKey = `step${tanimIdx + 1}`;
                if (job.steps[stepKey] && job.steps[stepKey].obligationIds) {
                    job.steps[stepKey].obligationIds = job.steps[stepKey].obligationIds.filter(id => id !== obId);
                    Store.updateJob(job.id, { steps: job.steps });
                }
            }
        }
        
        if (saveData()) {
            window.dispatchEvent(new CustomEvent('refresh-views'));
            showToast('Yükümlülük kaldırıldı.', 'info');
            
            const updated = Store.jobs.find(j => j.id == jobId);
            if (updated) showJobDetailModal(updated);
        }
    }
};

window.completeStepWithoutObligations = function(jobId, stepNum) {
    const job = Store.jobs.find(j => j.id == jobId);
    if (job) {
        const stepsConf = getWorkflowSteps(job);
        
        // Find if there is a YUKUMLULUK_TAMAMLAMA step in this job
        const tamamlamaIdx = stepsConf.findIndex(s => s.type === 'YUKUMLULUK_TAMAMLAMA');
        let nextIncompleteStep = stepNum + 1;
        if (tamamlamaIdx !== -1) {
            const tamStepNum = tamamlamaIdx + 1;
            const skipText = (tamStepNum === stepNum + 1) ? `Aşama ${tamStepNum}'yı` : `Aşama ${tamStepNum}'yı (Yükümlülük Tamamlama)`;
            if (!confirm(`Yükümlülük olmadığını belirterek doğrudan ilerlemek istediğinize emin misiniz? (Bu işlem ${skipText} otomatik olarak atlayacaktır.)`)) {
                return;
            }
        } else {
            if (!confirm('Yükümlülük olmadığını belirterek doğrudan ilerlemek istediğinize emin misiniz?')) {
                return;
            }
        }

        ensureTadilSteps(job);
        
        // Mark YUKUMLULUK_TANIMLAMA step as completed with noObligation: true
        job.steps[`step${stepNum}`] = { completed: true, obligationIds: [], noObligation: true };
        
        // Auto-complete YUKUMLULUK_TAMAMLAMA step if it exists
        if (tamamlamaIdx !== -1) {
            const tamStepNum = tamamlamaIdx + 1;
            job.steps[`step${tamStepNum}`] = { completed: true, sunuldu: false, date: '', number: '', submissions: {} };
        }
        
        // Find next incomplete step to set as currentStep
        let currentStep = stepNum + 1;
        for (let i = 1; i <= stepsConf.length; i++) {
            if (!job.steps[`step${i}`]?.completed) {
                currentStep = i;
                break;
            }
        }
        
        job.currentStep = currentStep;
        
        Store.updateJob(job.id, {
            steps: job.steps,
            currentStep: job.currentStep
        });
        
        if (saveData()) {
            window.dispatchEvent(new CustomEvent('refresh-views'));
            showToast('Yükümlülük olmadığını belirttiniz. İlerlendi.', 'success');
            
            const updated = Store.jobs.find(j => j.id == jobId);
            if (updated) showJobDetailModal(updated);
        }
    }
};

window.rollbackJobToStep = function(jobId, stepNum) {
    const job = Store.jobs.find(j => j.id == jobId);
    if (!job) return;

    const stepName = getStepTitle(job, stepNum);
    if (!confirm(`Süreci ${stepNum}. Aşama olan "${stepName}" adımına geri çekmek ve sonraki tüm aşamaları sıfırlamak istediğinize emin misiniz?`)) {
        return;
    }

    ensureTadilSteps(job);

    const stepsConf = getWorkflowSteps(job);
    const totalSteps = stepsConf.length;

    // Reset status back to pending
    job.status = 'pending';
    job.completedAt = null;
    job.currentStep = stepNum;

    // Set stepNum and all subsequent steps to completed: false and reset variables dynamically using getInitialStepData
    for (let k = stepNum; k <= totalSteps; k++) {
        const stepKey = `step${k}`;
        const stepConf = stepsConf[k - 1];
        if (stepConf) {
            job.steps[stepKey] = getInitialStepData(stepConf.type, false);
        }
    }

    const success = Store.updateJob(job.id, {
        status: job.status,
        completedAt: job.completedAt,
        currentStep: job.currentStep,
        steps: job.steps,
        updatedAt: new Date(),
        updatedBy: auth.currentUser?.email || 'System'
    });

    if (success && saveData()) {
        window.dispatchEvent(new CustomEvent('refresh-views'));
        showToast(`Süreç ${stepNum}. Aşamaya geri çekildi (Rollback).`, 'info');
        
        const updated = Store.jobs.find(j => j.id == jobId);
        if (updated) showJobDetailModal(updated);
    }
};
