/**
 * Centralized state management for EPDK Süre Takip Platformu
 */

/**
 * Global store object
 */
export const Store = {
    obligations: [],
    lastUpdate: null,

    /**
     * Updates the obligations array and triggers a save
     * @param {Array} newObligations 
     */
    setObligations(newObligations) {
        this.obligations = newObligations;
        this.lastUpdate = new Date().toISOString();
    },

    /**
     * Clears all data from the store
     */
    clear() {
        this.obligations = [];
        this.lastUpdate = null;
    }
};
