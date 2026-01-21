// Company and Project Mapping Data
// Proje-Sirket.txt dosyasından çıkarılmıştır

const COMPANY_DATA = [
    { parentCompany: 'BEYÇELİK', company: 'YGT', project: 'ADARES RES' },
    { parentCompany: 'GALATA WIND', company: 'GALATA WIND', project: 'AKBELEN RES' },
    { parentCompany: 'ARTIBİR', company: 'DAVEN', project: 'AKSALUR RES' },
    { parentCompany: 'GALATA WIND', company: 'GÖKOVA', project: 'ALAPINAR RES' },
    { parentCompany: 'GALATA WIND', company: 'GALATA WIND', project: 'BAKACAK RES' },
    { parentCompany: 'EFOR HOLDİNG', company: 'BALIKESİR ELEKTRİK', project: 'BALIKESİR-2 RES' },
    { parentCompany: 'METGÜN', company: 'BİODEN', project: 'BAŞMAKÇI BES' },
    { parentCompany: 'GALATA WIND', company: 'GALATA WIND', project: 'BAŞPINAR GES' },
    { parentCompany: 'GMC', company: 'GMC', project: 'BEKTAŞLI GES' },
    { parentCompany: 'ARTIBİR', company: 'NESMA', project: 'BEYDAĞI GES' },
    { parentCompany: 'YMZ', company: 'YMZ', project: 'BOĞLAN GES' },
    { parentCompany: 'ARTIBİR', company: 'DAVEN', project: 'CAMİLİYAYLA RES' },
    { parentCompany: 'GALATA WIND', company: 'GALATA WIND', project: 'ÇAMLICA RES' },
    { parentCompany: 'ÇANDARLI', company: 'ÇANDARLI', project: 'ÇANDARLI RES' },
    { parentCompany: 'ÇANDARLI', company: 'ÇANDARLI', project: 'ÇANDARLI GES' },
    { parentCompany: 'ARTIBİR', company: 'NESMA', project: 'ÇATAL RES' },
    { parentCompany: 'EGESA', company: 'TEMO', project: 'ÇATTEPE RES' },
    { parentCompany: 'ARTIBİR', company: 'DAVEN', project: 'ÇAVUŞKÖY RES' },
    { parentCompany: 'ARTIBİR', company: 'DAVEN', project: 'ÇUBUK RES' },
    { parentCompany: 'ARTIBİR', company: 'DAVEN', project: 'DAĞAHMETÇE RES' },
    { parentCompany: 'DAVİNCİ', company: 'DEMETER', project: 'DEMETER' },
    { parentCompany: 'EFOR HOLDİNG', company: 'SİVRİHİSAR YENİLENEBİLİR', project: 'ESKİŞEHİR GES' },
    { parentCompany: 'EVRENCİK', company: 'EVRENCİK', project: 'EVRENCİK RES' },
    { parentCompany: 'GALATA WIND', company: 'GALATA WIND', project: 'FULACIK RES' },
    { parentCompany: 'YEL', company: 'YEL', project: 'GÜNEYLİ RES' },
    { parentCompany: 'OR ENERJİ', company: 'OR ENERJİ', project: 'ILGARDERE RES' },
    { parentCompany: 'ARTIBİR', company: 'NESMA', project: 'ISPARTA RES' },
    { parentCompany: 'ARTIBİR', company: 'DAVEN', project: 'İNDERESİ RES' },
    { parentCompany: 'HARPUT', company: 'HARPUT', project: 'HARPUT EDT GES' },
    { parentCompany: 'HARPUT', company: 'HARPUT', project: 'HARPUT EDT 2 GES' },
    { parentCompany: 'DAVİNCİ', company: 'HESTİA', project: 'HESTİA' },
    { parentCompany: 'ARTIBİR', company: 'NESMA', project: 'KARATAY RES' },
    { parentCompany: 'ARTIBİR', company: 'NESMA', project: 'KARLIK RES' },
    { parentCompany: 'YMZ', company: 'YMZ', project: 'KAYNAK GES' },
    { parentCompany: 'ARTIBİR', company: 'DAVEN', project: 'KORUKÖY RES' },
    { parentCompany: 'GALATA WIND', company: 'GALATA WIND', project: 'KURTULUŞ RES' },
    { parentCompany: 'GALATA WIND', company: 'GALATA WIND', project: 'MERSİN RES' },
    { parentCompany: 'METGÜN', company: 'YANDER', project: 'MERSİNLİ RES' },
    { parentCompany: 'HARPUT', company: 'NECAT', project: 'NECAT EDT GES' },
    { parentCompany: 'ARTIBİR', company: 'NESMA', project: 'POZANTI RES' },
    { parentCompany: 'GAMA', company: 'GARET', project: 'SARES RES' },
    { parentCompany: 'ARTIBİR', company: 'DAVEN', project: 'SERMAYECİK RES' },
    { parentCompany: 'ARTIBİR', company: 'NESMA', project: 'SEYDAN RES' },
    { parentCompany: 'HARPUT', company: 'ERKAM', project: 'SEYİRCEK RES' },
    { parentCompany: 'GMC', company: 'GMC', project: 'SOLHAN GES' },
    { parentCompany: 'SUGA', company: 'SUGA', project: 'SUGA BES' },
    { parentCompany: 'ARTIBİR', company: 'DAVEN', project: 'SÜRMELİ RES' },
    { parentCompany: 'GALATA WIND', company: 'GALATA WIND', project: 'ŞAH RES' },
    { parentCompany: 'GALATA WIND', company: 'GALATA WIND', project: 'TAŞPINAR RES' },
    { parentCompany: 'GALATA WIND', company: 'GALATA WIND', project: 'TAŞPINAR GES' },
    { parentCompany: 'ALP', company: 'ALP', project: 'TINAZTEPE GES' },
    { parentCompany: 'ALP', company: 'ALP', project: 'TINAZTEPE HES' },
    { parentCompany: 'BEYÇELİK', company: 'SABAŞ', project: 'TURGUTTEPE RES' },
    { parentCompany: 'ARTIBİR', company: 'DAVEN', project: 'UĞRAK RES' },
    { parentCompany: 'YILDIRIM', company: 'ELFA', project: 'UMURLAR GES' },
    { parentCompany: 'YILDIRIM', company: 'ELFA', project: 'UMURLAR RES' },
    { parentCompany: 'BEYÇELİK', company: 'BAK', project: 'YAHYALI GES' },
    { parentCompany: 'BEYÇELİK', company: 'BAK', project: 'YAHYALI RES' },
    { parentCompany: 'GALATA WIND', company: 'GALATA WIND', project: 'YAKUPLAR RES' },
    { parentCompany: 'BEYÇELİK', company: 'BER', project: 'YARIŞ RES' },
    { parentCompany: 'ARTIBİR', company: 'DAVEN', project: 'YAZIR RES' },
    { parentCompany: 'EFOR HOLDİNG', company: 'YELLİCE ENERJİ', project: 'YELLİCE RES' },
    { parentCompany: 'GYM', company: 'GYM', project: 'YENİ GES' }
];

// Fuzzy matching helper - proje adına göre firma bilgisi bulur
function matchProjectToCompany(projectName) {
    if (!projectName) return null;

    const normalized = projectName.toUpperCase().trim();

    // Exact match
    const exactMatch = COMPANY_DATA.find(item =>
        item.project.toUpperCase() === normalized
    );
    if (exactMatch) return exactMatch;

    // Partial match (proje adı içeriyor)
    const partialMatch = COMPANY_DATA.find(item =>
        normalized.includes(item.project.toUpperCase()) ||
        item.project.toUpperCase().includes(normalized)
    );

    return partialMatch || null;
}
