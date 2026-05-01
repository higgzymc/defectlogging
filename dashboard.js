document.addEventListener('DOMContentLoaded', () => {
    const defectsByMonthChartCtx = document.getElementById('defectsByMonthChart').getContext('2d');
    let defectsChartInstance;

    function renderDefectChart(defects) {
        const defectsByMonth = {};
        defects.forEach(defect => {
            const date = new Date(defect.timestamp);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            defectsByMonth[monthKey] = (defectsByMonth[monthKey] || 0) + 1;
        });

        const sortedMonthKeys = Object.keys(defectsByMonth).sort();
        const labels = sortedMonthKeys.map(monthKey => {
            const [year, month] = monthKey.split('-').map(Number);
            return new Date(year, month - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
        });
        const data = sortedMonthKeys.map(monthKey => defectsByMonth[monthKey]);

        if (defectsChartInstance) {
            defectsChartInstance.destroy();
        }

        defectsChartInstance = new Chart(defectsByMonthChartCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Number of Defects',
                    data: data,
                    backgroundColor: 'rgba(0, 123, 255, 0.7)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    function initializeFirestoreListener() {
        db.collection("defects").orderBy("timestamp", "desc")
            .onSnapshot((querySnapshot) => {
                const defects = querySnapshot.docs.map(doc => doc.data());
                renderDefectChart(defects);
            }, (error) => {
                console.error("Error fetching defects for chart: ", error);
            });
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            initializeFirestoreListener();
        }
    });
});
