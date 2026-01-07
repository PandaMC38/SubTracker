let chartInstance = null;

export const ChartManager = {
    init(canvasId) {
        const ctx = document.getElementById(canvasId).getContext('2d');

        // Config initiale
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
                            font: {
                                family: "'Outfit', sans-serif",
                                size: 12
                            },
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 30, 35, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function (context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(context.parsed);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * @param {Array} subscriptions 
     */
    update(subscriptions) {
        if (!chartInstance) return;

        // Regrouper par catégorie
        const categories = {};

        subscriptions.forEach(sub => {
            if (!categories[sub.category]) {
                categories[sub.category] = 0;
            }
            // Normalisation mensuelle pour le poids visuel
            let weight = sub.price;
            if (sub.cycle === 'yearly') {
                weight = sub.price / 12;
            }
            categories[sub.category] += Number(weight);
        });

        const labels = Object.keys(categories);
        const data = Object.values(categories);

        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = data;

        // Empêcher le graphique vide d'être moche
        if (data.length === 0) {
            chartInstance.data.labels = ['Aucune dépense'];
            chartInstance.data.datasets[0].data = [1];
            chartInstance.data.datasets[0].backgroundColor = ['#2d3436'];
        } else {
            // Restore colors if logic changed
            // Note: colors are static in init for now, logic could be smarter to assign color per category
            chartInstance.data.datasets[0].backgroundColor = [
                '#6c5ce7', '#00cec9', '#ff7675', '#a29bfe', '#fab1a0', '#fdcb6e', '#e17055'
            ];
        }

        chartInstance.update();
    }
};
