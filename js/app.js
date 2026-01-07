// ==========================================
// STORE (Data Logic)
// ==========================================
const STORAGE_KEY = 'subtracker_data';

const Store = {
    getAll() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Erreur lecture Storage:', e);
            return [];
        }
    },

    save(sub) {
        const subscriptions = this.getAll();
        const index = subscriptions.findIndex(s => s.id === sub.id);

        if (index >= 0) {
            subscriptions[index] = sub;
        } else {
            subscriptions.push(sub);
        }

        this.persist(subscriptions);
    },

    delete(id) {
        let subscriptions = this.getAll();
        subscriptions = subscriptions.filter(s => s.id !== id);
        this.persist(subscriptions);
    },

    persist(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

// ==========================================
// CHARTS (Visualization)
// ==========================================
let chartInstance = null;

const ChartManager = {
    init(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Check if Chart is loaded
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js library not loaded');
            return;
        }

        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#6c5ce7', '#00cec9', '#ff7675', '#a29bfe', '#fab1a0', '#fdcb6e', '#e17055'
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#a4b0be',
                            font: { family: "'Outfit', sans-serif", size: 12 },
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                }
            }
        });
    },

    update(subscriptions) {
        if (!chartInstance) return;

        const categories = {};
        subscriptions.forEach(sub => {
            if (!categories[sub.category]) categories[sub.category] = 0;
            let weight = Number(sub.price);
            if (sub.cycle === 'yearly') weight = weight / 12;
            categories[sub.category] += weight;
        });

        const labels = Object.keys(categories);
        const data = Object.values(categories);

        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = data;

        if (data.length === 0) {
            chartInstance.data.labels = ['Aucune dépense'];
            chartInstance.data.datasets[0].data = [1];
            chartInstance.data.datasets[0].backgroundColor = ['#2d3436'];
        } else {
            chartInstance.data.datasets[0].backgroundColor = [
                '#6c5ce7', '#00cec9', '#ff7675', '#a29bfe', '#fab1a0', '#fdcb6e', '#e17055'
            ];
        }

        chartInstance.update();
    }
};

// ==========================================
// NOTIFICATIONS
// ==========================================
const NotificationManager = {
    async requestPermission() {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') return true;
        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    },

    async send(title, body, scheduleTime = null) {
        if (await this.requestPermission()) {
            try {
                const reg = await navigator.serviceWorker.ready;

                // Option 1: Scheduled Notification (Offline capable - Experimental)
                if (scheduleTime && 'showTrigger' in Notification.prototype && 'TimestampTrigger' in window) {
                    await reg.showNotification(title, {
                        body: body,
                        icon: 'https://cdn-icons-png.flaticon.com/512/2933/2933116.png',
                        showTrigger: new TimestampTrigger(scheduleTime)
                    });
                    console.log('Notification programmée pour : ' + new Date(scheduleTime));
                    return;
                }

                // Option 2: Immediate Notification
                if (reg) {
                    await reg.showNotification(title, {
                        body: body,
                        icon: 'https://cdn-icons-png.flaticon.com/512/2933/2933116.png',
                        vibrate: [200, 100, 200]
                    });
                } else {
                    new Notification(title, {
                        body: body,
                        icon: 'https://cdn-icons-png.flaticon.com/512/2933/2933116.png'
                    });
                }
            } catch (e) {
                console.error('Notification Error', e);
                alert('Erreur technique notification : ' + e.message);
            }
        } else {
            alert('Veuillez autoriser les notifications.');
        }
    },

    checkReminders(subscriptions) {
        // ... (Existing check logic on load) ...
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        subscriptions.forEach(sub => {
            const nextDate = new Date(sub.date);
            nextDate.setHours(0, 0, 0, 0);

            // 1. Immediate check (J-2)
            const diffTime = nextDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays <= 2) {
                // On envoie direct si on lance l'app
                // Debounce pour ne pas spammer à chaque F5 ? (TODO amélioration)
                // Pour l'instant on laisse tel quel pour être sûr d'être vu
            }

            // 2. Schedule Future Notification (J-2) for next time
            // Si le navigateur supporte les triggers, on programme une notif pour "dans 2 jours avant la date"
            // (Logique simplifiée pour l'instant : on ne fait que l'immédiat pour garantir le fonctionnement)
            if (diffDays >= 0 && diffDays <= 2) {
                this.send(
                    `Rappel : ${sub.name}`,
                    `Paiement de ${sub.price}€ prévu le ${nextDate.toLocaleDateString()}`
                );
            }
        });
    }
};

// ==========================================
// SETTINGS & BACKUP
// ==========================================
const SettingsManager = {
    exportData() {
        const data = {
            subscriptions: Store.getAll(),
            version: '1.0',
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `subtracker-backup-${itemsDateStamp()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    importData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                if (json.subscriptions && Array.isArray(json.subscriptions)) {
                    Store.persist(json.subscriptions);
                    alert('Restauration réussie ! L\'application va redémarrer.');
                    window.location.reload();
                } else {
                    alert('Fichier invalide : Format incorrect.');
                }
            } catch (err) {
                console.error('Import Error', err);
                alert('Erreur lors de la lecture du fichier.');
            }
        };
        reader.readAsText(file);
    }
};

function itemsDateStamp() {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate()}`;
}

function itemsDateStamp() {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate()}`;
}

// ==========================================
// CATEGORIES
// ==========================================
const DEFAULT_CATEGORIES = [
    { name: 'Divertissement', color: '#ff7675' },
    { name: 'Logiciel', color: '#6c5ce7' },
    { name: 'Maison', color: '#00cec9' },
    { name: 'Santé', color: '#fdcb6e' },
    { name: 'Autre', color: '#b2bec3' }
];

const CategoryManager = {
    getAll() {
        try {
            const data = localStorage.getItem('subtracker_categories');
            return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
        } catch { return DEFAULT_CATEGORIES; }
    },

    save(categories) {
        localStorage.setItem('subtracker_categories', JSON.stringify(categories));
        this.renderSettingsList();
        this.renderSelectOptions();
    },

    add(name, color) {
        const categories = this.getAll();
        if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            alert('Cette catégorie existe déjà.');
            return;
        }
        categories.push({ name, color });
        this.save(categories);
    },

    delete(name) {
        let categories = this.getAll();
        categories = categories.filter(c => c.name !== name);
        this.save(categories);
    },

    renderSettingsList() {
        const container = document.getElementById('categories-list');
        if (!container) return;

        container.innerHTML = '';
        const categories = this.getAll();

        categories.forEach(cat => {
            const el = document.createElement('div');
            el.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 5px; background: rgba(0,0,0,0.1); margin-bottom: 5px; border-radius: 4px;';
            el.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display:block; width: 12px; height: 12px; border-radius: 50%; background-color: ${cat.color}"></span>
                    <span>${cat.name}</span>
                </div>
                <button class="btn-icon btn-delete-cat" data-name="${cat.name}" style="font-size: 1rem; color: #ff7675;">&times;</button>
            `;
            container.appendChild(el);
        });

        // Add listeners
        document.querySelectorAll('.btn-delete-cat').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.currentTarget.dataset.name;
                if (confirm(`Supprimer la catégorie "${name}" ?`)) {
                    CategoryManager.delete(name);
                }
            });
        });
    },

    renderSelectOptions() {
        const select = document.getElementById('sub-category');
        if (!select) return;

        const currentVal = select.value;
        select.innerHTML = '';
        const categories = this.getAll();

        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.name;
            opt.textContent = cat.name;
            select.appendChild(opt);
        });

        if (currentVal) select.value = currentVal;
    }
};

// ==========================================
// APP (Controller)
// ==========================================
let subscriptions = [];
const listContainer = document.getElementById('subscription-list');
const totalMonthlyEl = document.getElementById('total-monthly-amount');
const totalYearlyEl = document.getElementById('total-yearly-amount');
const addBtn = document.getElementById('add-sub-btn');
const notifyBtn = document.getElementById('notify-test-btn');
const settingsBtn = document.getElementById('settings-btn');

// Filters
const sortSelect = document.getElementById('sort-select');
const filterCycle = document.getElementById('filter-cycle');

const modalOverlay = document.getElementById('modal-overlay');
const settingsModalOverlay = document.getElementById('settings-modal-overlay'); // NEW

const closeModalBtn = document.getElementById('close-modal-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn'); // NEW

const form = document.getElementById('subscription-form');
const deleteBtn = document.getElementById('delete-btn');

// Export/Import btns
const exportBtn = document.getElementById('export-btn');
const importTriggerBtn = document.getElementById('import-trigger-btn');
const importFile = document.getElementById('import-file');

function init() {
    console.log('Starting App...');
    try {
        subscriptions = Store.getAll();
    } catch (e) { subscriptions = []; }

    setupEventListeners();
    renderList();
    updateTotals();

    try {
        ChartManager.init('expenses-chart');
        ChartManager.update(subscriptions);
    } catch (e) { console.error('Chart Warning', e); }

    // Check Reminders
    try {
        NotificationManager.checkReminders(subscriptions);
    } catch (e) { console.error('Notify Error', e); }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(e => console.log('SW Fail', e));
    }
}

function renderList() {
    try { ChartManager.update(subscriptions); } catch (e) { }

    listContainer.innerHTML = '';

    // 1. Filter
    let filtered = [...subscriptions];
    const cycleFilter = filterCycle ? filterCycle.value : 'all';
    if (cycleFilter !== 'all') {
        filtered = filtered.filter(s => s.cycle === cycleFilter);
    }

    // 2. Sort
    const sortMode = sortSelect ? sortSelect.value : 'date';
    filtered.sort((a, b) => {
        if (sortMode === 'date') return new Date(a.date) - new Date(b.date);
        if (sortMode === 'price_desc') return b.price - a.price;
        if (sortMode === 'price_asc') return a.price - b.price;
        if (sortMode === 'name') return a.name.localeCompare(b.name);
        return 0;
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = '<div class="empty-state"><p>Aucun abonnement trouvé.</p></div>';
        return;
    }

    filtered.forEach(sub => {
        const el = document.createElement('div');
        el.className = 'sub-card';
        el.innerHTML = `
            <div class="sub-info">
                <h3>${sub.name}</h3>
                <span class="sub-date">Renouvellement : ${formatDate(sub.date)}</span>
                <span class="sub-cycle-badge" style="color: grey">${sub.cycle === 'monthly' ? 'Mensuel' : 'Annuel'}</span>
            </div>
            <div class="sub-price">${formatPrice(sub.price, sub.currency)}</div>
        `;
        el.addEventListener('click', () => openModal(sub));
        listContainer.appendChild(el);
    });
}

function formatPrice(price) {
    try {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
    } catch { return price + ' €'; }
}

function formatDate(dateStr) {
    try {
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    } catch { return dateStr; }
}

function updateTotals() {
    const monthly = subscriptions.reduce((total, sub) => {
        const p = Number(sub.price) || 0;
        return sub.cycle === 'monthly' ? total + p : total + (p / 12);
    }, 0);

    totalMonthlyEl.textContent = monthly.toFixed(2);
    totalYearlyEl.textContent = (monthly * 12).toFixed(2) + ' €';
}

function openModal(sub = null) {
    modalOverlay.classList.remove('hidden');
    if (sub) {
        document.getElementById('modal-title').textContent = 'Modifier';
        document.getElementById('sub-id').value = sub.id;
        document.getElementById('sub-name').value = sub.name;
        document.getElementById('sub-price').value = sub.price;
        document.getElementById('sub-currency').value = sub.currency || 'EUR'; // NEW
        document.getElementById('sub-cycle').value = sub.cycle;
        document.getElementById('sub-category').value = sub.category;
        deleteBtn.classList.remove('hidden');

        // Secure date format YYYY-MM-DD
        try {
            // Ensure we only have the YYYY-MM-DD part
            let safeDate = sub.date;
            if (safeDate.includes('T')) safeDate = safeDate.split('T')[0];
            document.getElementById('sub-date').value = safeDate;
        } catch (e) {
            document.getElementById('sub-date').value = new Date().toISOString().split('T')[0];
        }

    } else {
        document.getElementById('modal-title').textContent = 'Nouveau';
        form.reset();
        document.getElementById('sub-id').value = '';
        deleteBtn.classList.add('hidden');

        // Default today local
        const local = new Date();
        local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
        document.getElementById('sub-date').value = local.toISOString().split('T')[0];
    }
}

function closeModal() {
    modalOverlay.classList.add('hidden');
}

function setupEventListeners() {
    if (addBtn) addBtn.addEventListener('click', () => openModal());
    if (notifyBtn) notifyBtn.addEventListener('click', () => {
        alert('Envoi de la notification de test...');
        NotificationManager.send('Test', 'Ceci est une notification de test !');
    });
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = {
                id: document.getElementById('sub-id').value || Store.generateId(),
                name: document.getElementById('sub-name').value,
                price: parseFloat(document.getElementById('sub-price').value),
                currency: document.getElementById('sub-currency').value, // NEW
                cycle: document.getElementById('sub-cycle').value,
                date: document.getElementById('sub-date').value,
                category: document.getElementById('sub-category').value
            };
            Store.save(formData);
            subscriptions = Store.getAll();
            renderList();
            updateTotals();
            closeModal();
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (confirm('Supprimer ?')) {
                Store.delete(document.getElementById('sub-id').value);
                subscriptions = Store.getAll();
                renderList();
                updateTotals();
                closeModal();
            }
        });
    }

    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            localStorage.setItem('subtracker_theme', isLight ? 'light' : 'dark');
            updateThemeIcon();
        });
    }

    // Settings Modal
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsModalOverlay.classList.remove('hidden');
        });
    }
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModalOverlay.classList.add('hidden');
        });
    }
    if (settingsModalOverlay) {
        settingsModalOverlay.addEventListener('click', (e) => {
            if (e.target === settingsModalOverlay) settingsModalOverlay.classList.add('hidden');
        });
    }

    // Backup / Restore
    if (exportBtn) exportBtn.addEventListener('click', () => SettingsManager.exportData());
    if (importTriggerBtn) importTriggerBtn.addEventListener('click', () => importFile.click());
    if (importFile) importFile.addEventListener('change', (e) => SettingsManager.importData(e.target.files[0]));

    // Filters & Sort
    if (sortSelect) sortSelect.addEventListener('change', renderList);
    if (filterCycle) filterCycle.addEventListener('change', renderList);

    // Category Management
    const addCatBtn = document.getElementById('add-cat-btn');
    const newCatName = document.getElementById('new-cat-name');
    const newCatColor = document.getElementById('new-cat-color');

    if (addCatBtn) {
        addCatBtn.addEventListener('click', () => {
            if (newCatName.value) {
                CategoryManager.add(newCatName.value, newCatColor.value);
                newCatName.value = '';
            }
        });
    }

    // Init Category View
    CategoryManager.renderSelectOptions();
    CategoryManager.renderSettingsList();
}

function updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        const isLight = document.body.classList.contains('light-theme');
        icon.textContent = isLight ? '☀️' : '🌙';
    }
}

// Init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Load Theme Preference First
        const savedTheme = localStorage.getItem('subtracker_theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark-theme');
        }
        updateThemeIcon();
        init();
    });
} else {
    init();
}
