/**
 * Centralized state management for EPDK Süre Takip Platformu
 */

/**
 * Global store object
 */
export const Store = {
    obligations: [],
    jobs: [], // New collection for Job Tracking
    projects: [], // Phase 3: Centralized Project Definitions { id, name, company, parent, expert: { name, phone } }
    teaApplications: [], // TÜBİTAK RAPSİM TEA başvuruları { id, projectName, monthYear, label, mfilesLink, notes }
    teaFeeSettings: {
        lastMwRate: 5800, newMwRate: 11600, vatRate: 0.20,
        recipientName: 'Tübitak Bilgem',
        bankBranch: 'Türkiye Cumhuriyeti Ziraat Bankası A.Ş. Gebze Kurumsal Şube',
        iban: 'TR96 0001 0020 8534 7551 9667 26'
    }, // TEA başvuru bedeli hesaplayıcısının birim fiyatları ve ödeme bilgileri (düzenlenebilir)
    users: [], // List of user profiles { email, displayName, title, uid }
    // Tadil iş akışı tanımları: { [title]: [{ type, short, long }, ...] }.
    // Editable via the workflow builder; seeded once from DEFAULT_WORKFLOWS in
    // js/jobs.js if Firestore has no "workflows" field yet (see js/data.js).
    workflows: {},
    // Aşama tipi -> { owner: 'us'|'external', difficulty: 1|2|3|5|8|13 }.
    // Ayarlar sayfasındaki "Aşama Sorumluluk & Zorluk" kartından düzenlenir;
    // burada değeri olmayan bir tip js/step_meta.js içindeki varsayılana düşer.
    stepMeta: {},
    lastUpdate: null,

    /**
     * Updates the obligations array and triggers a save
     * @param {Array} newObligations 
     */
    setObligations(newObligations) {
        this.obligations = newObligations;
        this.lastUpdate = new Date().toISOString();
    },

    setJobs(newJobs) {
        this.jobs = newJobs;
        this.lastUpdate = new Date().toISOString();
    },

    setProjects(newProjects) {
        this.projects = newProjects;
        this.lastUpdate = new Date().toISOString();
    },

    setTeaApplications(newTeaApplications) {
        this.teaApplications = newTeaApplications || [];
        this.lastUpdate = new Date().toISOString();
    },

    setTeaFeeSettings(newSettings) {
        this.teaFeeSettings = { ...this.teaFeeSettings, ...newSettings };
        this.lastUpdate = new Date().toISOString();
    },

    setUsers(newUsers) {
        this.users = newUsers;
        this.lastUpdate = new Date().toISOString();
    },

    setWorkflows(newWorkflows) {
        this.workflows = newWorkflows || {};
        this.lastUpdate = new Date().toISOString();
    },

    setStepMeta(newStepMeta) {
        this.stepMeta = newStepMeta || {};
        this.lastUpdate = new Date().toISOString();
    },

    /**
     * Updates a single obligation and triggers update
     */
    updateObligation(id, data) {
        const index = this.obligations.findIndex(o => o.id == id);
        if (index !== -1) {
            this.obligations[index] = { ...this.obligations[index], ...data, updatedAt: new Date() };
            this.lastUpdate = new Date().toISOString();
            return true;
        }
        return false;
    },

    updateJob(id, data) {
        const index = this.jobs.findIndex(j => j.id == id);
        if (index !== -1) {
            let updatedJob = { ...this.jobs[index], ...data, updatedAt: new Date() };
            
            // Auto-update steps if status is updated externally (e.g. from project modal toggle)
            if (data.status && !data.steps && updatedJob.steps) {
                const steps = { ...updatedJob.steps };
                if (data.status === 'completed') {
                    for (let i = 1; i <= 9; i++) {
                        steps[`step${i}`] = { ...steps[`step${i}`], completed: true };
                    }
                    updatedJob.currentStep = 9;
                } else {
                    // Reset steps 2-9 if changed back to pending
                    for (let i = 2; i <= 9; i++) {
                        steps[`step${i}`] = { ...steps[`step${i}`], completed: false };
                    }
                    updatedJob.currentStep = 2;
                }
                updatedJob.steps = steps;
            }

            this.jobs[index] = updatedJob;
            this.lastUpdate = new Date().toISOString();
            return true;
        }
        return false;
    },

    updateProject(id, data) {
        const index = this.projects.findIndex(p => p.id == id);
        if (index !== -1) {
            this.projects[index] = { ...this.projects[index], ...data, updatedAt: new Date() };
            this.lastUpdate = new Date().toISOString();
            return true;
        }
        return false;
    },

    getProjectByName(name) {
        if (!name) return null;
        return this.projects.find(p => p.name.toLowerCase() === name.toLowerCase());
    },

    getUserName(email) {
        if (!email) return 'Bilinmiyor';
        const user = this.users.find(u => u.email === email);
        return user && user.displayName ? user.displayName : email.split('@')[0];
    },

    getUserPhoto(email) {
        if (!email) return null;
        const user = this.users.find(u => u.email === email);
        return user ? user.photoURL : null;
    },

    addJob(job) {
        this.jobs.push(job);
        this.lastUpdate = new Date().toISOString();
    },

    deleteJob(id) {
        const initialLength = this.jobs.length;
        this.jobs = this.jobs.filter(j => j.id != id);
        this.lastUpdate = new Date().toISOString();
        return this.jobs.length < initialLength;
    },

    /**
     * Clears all data from the store
     */
    clear() {
        this.obligations = [];
        this.jobs = [];
        this.lastUpdate = null;
    }
};
