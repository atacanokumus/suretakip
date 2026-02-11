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
    users: [], // List of user profiles { email, displayName, title, uid }
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

    setUsers(newUsers) {
        this.users = newUsers;
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
            this.jobs[index] = { ...this.jobs[index], ...data, updatedAt: new Date() };
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
