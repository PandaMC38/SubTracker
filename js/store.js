const STORAGE_KEY = 'subtracker_data';

export const Store = {
    /**
     * @typedef {Object} Subscription
     * @property {string} id
     * @property {string} name
     * @property {number} price
     * @property {string} cycle - 'monthly' | 'yearly'
     * @property {string} date - 'YYYY-MM-DD'
     * @property {string} category
     */

    /**
     * Récupère tous les abonnements du LocalStorage
     * @returns {Subscription[]}
     */
    getAll() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Erreur lecture Storage:', e);
            return [];
        }
    },

    /**
     * Ajoute ou met à jour un abonnement
     * @param {Subscription} sub 
     */
    save(sub) {
        const subscriptions = this.getAll();
        const index = subscriptions.findIndex(s => s.id === sub.id);
        
        if (index >= 0) {
            // Update
            subscriptions[index] = sub;
        } else {
            // Add
            subscriptions.push(sub);
        }

        this.persist(subscriptions);
    },

    /**
     * Supprime un abonnement par ID
     * @param {string} id 
     */
    delete(id) {
        let subscriptions = this.getAll();
        subscriptions = subscriptions.filter(s => s.id !== id);
        this.persist(subscriptions);
    },

    /**
     * Sauvegarde interne
     * @param {Subscription[]} data 
     */
    persist(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },

    /**
     * Génère un ID unique simple
     * @returns {string}
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};
