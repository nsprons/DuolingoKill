// main.js
document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let allStats = [];
    let filteredStats = [];
    let deviceModels = new Set();
    let androidVersions = new Set();
    let countries = new Set();
    let regions = new Set();
    let cities = new Set();
    let isDarkMode = false;
    
    // Initialize charts
    const totalOpensChart = initBarChart('totalOpensChart', '总开启次数', 'rgba(67, 97, 238, 0.7)');
    const devicesChart = initDoughnutChart('devicesChart', '设备分布');
    const androidChart = initDoughnutChart('androidChart', 'Android版本分布');
    const trendChart = initLineChart('trendChart', '设备使用趋势');
    const geoChart = initGeoChart('geoChart', '地理位置分布');
    const map = initMap('mapContainer');
    
    // Load data
    loadData();
    
    // Event listeners
    setupEventListeners();
    
    // Initialize theme
    initTheme();

    // Main functions
    function loadData() {
        fetch('https://raw.githubusercontent.com/nspron/DuolingoKill/main/stats/device_stats.csv')
            .then(response => {
                if (!response.ok) throw new Error('网络响应不正常');
                return response.text();
            })
            .then(data => {
                allStats = parseCSV(data);
                processStats(allStats);
                applyFilters();
            })
            .catch(error => {
                console.error('加载数据失败:', error);
                showError('数据加载失败，请稍后再试');
            });
    }

    function parseCSV(text) {
        const rows = text.split('\n').filter(row => row.trim() !== '');
        const headers = rows.shift().split(',').map(h => h.replace(/^"|"$/g, ''));
        
        return rows.map(row => {
            const values = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            const entry = {};
            headers.forEach((header, i) => {
                entry[header] = values[i] ? values[i].replace(/^"|"$/g, '') : '';
                
                // Convert numeric fields
                if (['open_count', 'sdk_version', 'latitude', 'longitude'].includes(header)) {
                    entry[header] = parseFloat(entry[header]) || 0;
                }
            });
            return entry;
        }).filter(entry => entry.date && entry.device_id && entry.open_count);
    }

    function processStats(stats) {
        stats.forEach(stat => {
            if (stat.device_model) deviceModels.add(stat.device_model);
            if (stat.android_version) androidVersions.add(stat.android_version);
            if (stat.country) countries.add(stat.country);
            if (stat.region) regions.add(stat.region);
            if (stat.city) cities.add(stat.city);
        });
        
        fillFilterOptions();
    }

    function setupEventListeners() {
        // Filters
        document.getElementById('dateRange').addEventListener('change', applyFilters);
        document.getElementById('deviceModel').addEventListener('change', applyFilters);
        document.getElementById('androidVersion').addEventListener('change', applyFilters);
        document.getElementById('country').addEventListener('change', applyFilters);
        document.getElementById('region').addEventListener('change', applyFilters);
        document.getElementById('city').addEventListener('change', applyFilters);
        document.getElementById('deviceSearch').addEventListener('input', applyFilters);
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', toggleTheme);
        
        // Tab switching
        document.querySelectorAll('.nav-tabs .nav-link').forEach(tab => {
            tab.addEventListener('click', switchTab);
        });
    }

    function initTheme() {
        isDarkMode = localStorage.getItem('darkMode') === 'true';
        applyTheme();
    }

    function toggleTheme() {
        isDarkMode = !isDarkMode;
        localStorage.setItem('darkMode', isDarkMode);
        applyTheme();
    }

    function applyTheme() {
        document.body.classList.toggle('dark-mode', isDarkMode);
        document.getElementById('themeToggle').innerHTML = isDarkMode ? 
            '<i class="fas fa-sun"></i> 浅色模式' : 
            '<i class="fas fa-moon"></i> 深色模式';
        
        // Update charts for theme
        updateCharts();
    }

    function fillFilterOptions() {
        fillSelect('deviceModel', deviceModels);
        fillSelect('androidVersion', androidVersions, v => `Android ${v}`);
        fillSelect('country', countries);
        fillSelect('region', regions);
        fillSelect('city', cities);
    }

    function fillSelect(elementId, values, formatter = v => v) {
        const select = document.getElementById(elementId);
        select.innerHTML = '<option value="all">全部</option>';
        
        Array.from(values).sort().forEach(value => {
            if (!value) return;
            const option = document.createElement('option');
            option.value = value;
            option.textContent = formatter(value);
            select.appendChild(option);
        });
    }

    function applyFilters() {
        const dateRange = document.getElementById('dateRange').value;
        const deviceModel = document.getElementById('deviceModel').value;
        const androidVersion = document.getElementById('androidVersion').value;
        const country = document.getElementById('country').value;
        const region = document.getElementById('region').value;
        const city = document.getElementById('city').value;
        const deviceSearch = document.getElementById('deviceSearch').value.toLowerCase();
        
        // Calculate date range
        let minDate = null;
        if (dateRange !== 'all') {
            const days = parseInt(dateRange);
            minDate = new Date();
            minDate.setDate(minDate.getDate() - days);
        }
        
        // Filter data
        filteredStats = allStats.filter(stat => {
            // Date filter
            if (minDate && new Date(stat.date) < minDate) return false;
            
            // Device model filter
            if (deviceModel !== 'all' && stat.device_model !== deviceModel) return false;
            
            // Android version filter
            if (androidVersion !== 'all' && stat.android_version !== androidVersion) return false;
            
            // Country filter
            if (country !== 'all' && stat.country !== country) return false;
            
            // Region filter
            if (region !== 'all' && stat.region !== region) return false;
            
            // City filter
            if (city !== 'all' && stat.city !== city) return false;
            
            // Device ID search
            if (deviceSearch && !stat.device_id.toLowerCase().includes(deviceSearch)) return false;
            
            return true;
        });
        
        updateUI();
    }

    function updateUI() {
        updateCharts();
        updateTable();
        updateMap();
        updateSummaryCards();
    }

    function updateCharts() {
        const today = new Date().toISOString().split('T')[0];
        
        // Aggregate data
        const dailyStats = {};
        const deviceCounts = {};
        const versionCounts = {};
        const geoCounts = {};
        let totalOpens = 0;
        let uniqueDevices = new Set();
        
        filteredStats.forEach(stat => {
            // Total opens
            totalOpens += stat.open_count || 0;
            
            // Unique devices
            uniqueDevices.add(stat.device_id);
            
            // Daily stats
            if (!dailyStats[stat.date]) dailyStats[stat.date] = 0;
            dailyStats[stat.date] += stat.open_count || 0;
            
            // Device stats
            if (!deviceCounts[stat.device_model]) deviceCounts[stat.device_model] = 0;
            deviceCounts[stat.device_model] += stat.open_count || 0;
            
            // Version stats
            if (!versionCounts[stat.android_version]) versionCounts[stat.android_version] = 0;
            versionCounts[stat.android_version] += stat.open_count || 0;
            
            // Geo stats
            const geoKey = `${stat.country || '未知'}|${stat.region || '未知'}|${stat.city || '未知'}`;
            if (!geoCounts[geoKey]) geoCounts[geoKey] = { count: 0, lat: stat.latitude, lng: stat.longitude };
            geoCounts[geoKey].count += stat.open_count || 0;
        });
        
        // Update dashboard numbers
        document.getElementById('totalOpens').textContent = totalOpens.toLocaleString();
        document.getElementById('uniqueDevices').textContent = uniqueDevices.size.toLocaleString();
        document.getElementById('androidVersions').textContent = Object.keys(versionCounts).length.toLocaleString();
        document.getElementById('locationsCount').textContent = Object.keys(geoCounts).length.toLocaleString();
        
        // Sort dates
        const dates = Object.keys(dailyStats).sort();
        
        // Update total opens chart
        updateBarChart(totalOpensChart, dates, dates.map(date => dailyStats[date]));
        
        // Update device distribution chart
        const topDevices = getTopItems(deviceCounts, 5);
        updateDoughnutChart(devicesChart, topDevices.labels, topDevices.values);
        
        // Update Android version chart
        const topVersions = getTopItems(versionCounts, 5, v => `Android ${v}`);
        updateDoughnutChart(androidChart, topVersions.labels, topVersions.values);
        
        // Update trend chart
        updateLineChart(trendChart, dates, dates.map(date => dailyStats[date]));
        
        // Update geo chart
        const topLocations = getTopItems(
            Object.fromEntries(Object.entries(geoCounts).map(([k, v]) => [k, v.count])), 
            5
        );
        updateDoughnutChart(geoChart, topLocations.labels, topLocations.values);
    }

    function getTopItems(items, limit, formatter = v => v) {
        return Object.entries(items)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .reduce((acc, [key, value]) => {
                acc.labels.push(formatter(key) || '未知');
                acc.values.push(value);
                return acc;
            }, { labels: [], values: [] });
    }

    function updateTable() {
        const tbody = document.querySelector('#statsTable tbody');
        tbody.innerHTML = '';
        
        if (filteredStats.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" class="loading">没有找到匹配的数据</td></tr>';
            return;
        }
        
        // Sort by date descending
        const sortedStats = [...filteredStats].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Show top 100 records
        sortedStats.slice(0, 100).forEach(stat => {
            const tr = document.createElement('tr');
            
            // Date
            addTableCell(tr, stat.date);
            
            // Device ID
            const deviceIdTd = document.createElement('td');
            deviceIdTd.innerHTML = `<span class="text-monospace">${stat.device_id.slice(0, 8)}...</span>`;
            deviceIdTd.title = stat.device_id;
            tr.appendChild(deviceIdTd);
            
            // Open count
            addTableCell(tr, stat.open_count);
            
            // Device model
            addTableCell(tr, stat.device_model || '--');
            
            // Android version
            addTableCell(tr, stat.android_version ? `Android ${stat.android_version}` : '--');
            
            // Manufacturer
            addTableCell(tr, stat.manufacturer || '--');
            
            // Location
            const locationTd = document.createElement('td');
            locationTd.innerHTML = `
                <div>${stat.city || '--'}</div>
                <small class="text-muted">${[stat.region, stat.country].filter(Boolean).join(', ') || '--'}</small>
            `;
            tr.appendChild(locationTd);
            
            // IP
            const ipTd = document.createElement('td');
            ipTd.innerHTML = stat.ip_address ? `
                <span class="text-monospace">${stat.ip_address}</span>
                <small class="text-muted d-block">${stat.isp || '未知ISP'}</small>
            ` : '--';
            tr.appendChild(ipTd);
            
            // Coordinates
            const coordTd = document.createElement('td');
            if (stat.latitude && stat.longitude) {
                coordTd.innerHTML = `
                    <span class="text-monospace">${stat.latitude.toFixed(4)}, ${stat.longitude.toFixed(4)}</span>
                    <button class="btn btn-sm btn-link p-0" onclick="focusOnMap(${stat.latitude}, ${stat.longitude})">
                        <i class="fas fa-map-marker-alt"></i>
                    </button>
                `;
            } else {
                coordTd.textContent = '--';
            }
            tr.appendChild(coordTd);
            
            // Report time
            addTableCell(tr, stat.report_time || '--');
            
            // Status
            const statusTd = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = 'badge ' + getStatusBadgeClass(stat.date);
            badge.textContent = getStatusText(stat.date);
            statusTd.appendChild(badge);
            tr.appendChild(statusTd);
            
            tbody.appendChild(tr);
        });
    }

    function addTableCell(row, content) {
        const td = document.createElement('td');
        td.textContent = content !== undefined && content !== null ? content : '--';
        row.appendChild(td);
    }

    function updateMap() {
        // Clear existing markers
        clearMap();
        
        // Add new markers
        filteredStats.forEach(stat => {
            if (stat.latitude && stat.longitude) {
                addMapMarker(stat.latitude, stat.longitude, {
                    title: `${stat.device_id} (${stat.open_count}次)`,
                    content: `
                        <strong>设备ID:</strong> ${stat.device_id}<br>
                        <strong>开启次数:</strong> ${stat.open_count}<br>
                        <strong>位置:</strong> ${stat.city || '未知'}, ${stat.region || '未知'}, ${stat.country || '未知'}<br>
                        <strong>IP:</strong> ${stat.ip_address || '未知'}<br>
                        <strong>时间:</strong> ${stat.report_time || '未知'}
                    `
                });
            }
        });
        
        // Fit bounds to show all markers
        fitMapBounds();
    }

    function updateSummaryCards() {
        // Calculate additional summary stats
        const today = new Date().toISOString().split('T')[0];
        const todayStats = filteredStats.filter(stat => stat.date === today);
        const todayOpens = todayStats.reduce((sum, stat) => sum + (stat.open_count || 0), 0);
        const todayDevices = new Set(todayStats.map(stat => stat.device_id)).size;
        
        // Update cards
        document.getElementById('todayOpens').textContent = todayOpens.toLocaleString();
        document.getElementById('todayDevices').textContent = todayDevices.toLocaleString();
        
        // Top device
        const deviceCounts = {};
        filteredStats.forEach(stat => {
            if (!deviceCounts[stat.device_model]) deviceCounts[stat.device_model] = 0;
            deviceCounts[stat.device_model] += stat.open_count || 0;
        });
        const topDevice = Object.entries(deviceCounts).sort((a, b) => b[1] - a[1])[0];
        document.getElementById('topDevice').textContent = topDevice ? `${topDevice[0]} (${topDevice[1].toLocaleString()}次)` : '无数据';
    }

    // Chart initialization functions
    function initBarChart(canvasId, label, color) {
        return new Chart(document.getElementById(canvasId), {
            type: 'bar',
            data: { labels: [], datasets: [{ label, data: [], backgroundColor: color }] },
            options: getChartOptions('bar')
        });
    }

    function initDoughnutChart(canvasId, label) {
        return new Chart(document.getElementById(canvasId), {
            type: 'doughnut',
            data: { labels: [], datasets: [{ label, data: [], backgroundColor: getChartColors() }] },
            options: getChartOptions('doughnut')
        });
    }

    function initLineChart(canvasId, label) {
        return new Chart(document.getElementById(canvasId), {
            type: 'line',
            data: { labels: [], datasets: [{ label, data: [], fill: true, tension: 0.3 }] },
            options: getChartOptions('line')
        });
    }

    function initGeoChart(canvasId, label) {
        return new Chart(document.getElementById(canvasId), {
            type: 'pie',
            data: { labels: [], datasets: [{ label, data: [], backgroundColor: getChartColors() }] },
            options: getChartOptions('pie')
        });
    }

    function getChartOptions(type) {
        const isDark = isDarkMode;
        const textColor = isDark ? '#f8f9fa' : '#212529';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
        
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: textColor }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${ctx.raw.toLocaleString()}`
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: textColor }
                }
            }
        };
        
        if (type === 'doughnut' || type === 'pie') {
            return {
                ...commonOptions,
                cutout: type === 'doughnut' ? '70%' : undefined,
                plugins: {
                    ...commonOptions.plugins,
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const percent = Math.round((ctx.raw / total) * 100);
                                return `${ctx.label}: ${ctx.raw.toLocaleString()} (${percent}%)`;
                            }
                        }
                    }
                }
            };
        }
        
        return commonOptions;
    }

    function getChartColors() {
        return [
            'rgba(67, 97, 238, 0.7)',
            'rgba(76, 201, 240, 0.7)',
            'rgba(63, 55, 201, 0.7)',
            'rgba(108, 117, 125, 0.7)',
            'rgba(255, 159, 64, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)'
        ];
    }

    // Chart update functions
    function updateBarChart(chart, labels, data) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update();
    }

    function updateDoughnutChart(chart, labels, data) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.data.datasets[0].backgroundColor = getChartColors().slice(0, labels.length);
        chart.update();
    }

    function updateLineChart(chart, labels, data) {
        const isDark = isDarkMode;
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.data.datasets[0].backgroundColor = isDark ? 'rgba(67, 97, 238, 0.2)' : 'rgba(67, 97, 238, 0.1)';
        chart.data.datasets[0].borderColor = isDark ? 'rgba(76, 201, 240, 1)' : 'rgba(67, 97, 238, 1)';
        chart.update();
    }

    // Map functions
    function initMap(containerId) {
        // This would be implemented using Leaflet or Google Maps API
        console.log(`Initializing map in ${containerId}`);
        return {
            addMarker: (lat, lng, options) => console.log(`Adding marker at ${lat},${lng}`),
            clear: () => console.log('Clearing map'),
            fitBounds: () => console.log('Fitting bounds')
        };
    }

    function addMapMarker(lat, lng, options) {
        map.addMarker(lat, lng, options);
    }

    function clearMap() {
        map.clear();
    }

    function fitMapBounds() {
        map.fitBounds();
    }

    function focusOnMap(lat, lng) {
        console.log(`Focusing map on ${lat},${lng}`);
    }

    // Helper functions
    function getStatusBadgeClass(date) {
        const diffDays = getDaysSinceReport(date);
        
        if (diffDays === 0) return 'badge-success';
        if (diffDays <= 7) return 'badge-primary';
        if (diffDays <= 30) return 'badge-warning';
        return 'badge-danger';
    }

    function getStatusText(date) {
        const diffDays = getDaysSinceReport(date);
        
        if (diffDays === 0) return '今日活跃';
        if (diffDays <= 7) return '7天内活跃';
        if (diffDays <= 30) return '30天内活跃';
        return '历史记录';
    }

    function getDaysSinceReport(date) {
        if (!date) return Infinity;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const reportDate = new Date(date);
        reportDate.setHours(0, 0, 0, 0);
        
        return Math.floor((today - reportDate) / (1000 * 60 * 60 * 24));
    }

    function showError(message) {
        const tbody = document.querySelector('#statsTable tbody');
        tbody.innerHTML = `<tr><td colspan="12" class="error">${message}</td></tr>`;
    }

    function switchTab(e) {
        e.preventDefault();
        const tabId = this.getAttribute('href').substring(1);
        document.querySelectorAll('.tab-pane').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.nav-link').forEach(tab => {
            tab.classList.remove('active');
        });
        
        this.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    }

    // Expose some functions to global scope for HTML event handlers
    window.focusOnMap = focusOnMap;
    window.toggleTheme = toggleTheme;
});

// Initialize map (would be implemented with actual map library)
function initMap(containerId) {
    console.log(`Initializing map in ${containerId}`);
    return {
        addMarker: (lat, lng, options) => console.log(`Adding marker at ${lat},${lng}`),
        clear: () => console.log('Clearing map'),
        fitBounds: () => console.log('Fitting bounds')
    };
}
