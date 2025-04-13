// main.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the dashboard
    initDashboard();
});

function initDashboard() {
    // Global variables
    let allStats = [];
    let filteredStats = [];
    let map;
    let markers = [];
    let heatmapLayer;
    
    // Initialize map
    initMap();
    
    // Initialize theme toggle
    initThemeToggle();
    
    // Load data
    loadData();
    
    // Set up event listeners
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('exportCSV').addEventListener('click', exportCSV);
    document.getElementById('refreshData').addEventListener('click', loadData);
    document.getElementById('heatmapToggle').addEventListener('change', toggleHeatmap);
}

function initMap() {
    // Initialize Leaflet map
    map = L.map('ipMap').setView([30.589, 114.2681], 4);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Initialize heatmap layer
    heatmapLayer = L.heatLayer([], {
        radius: 15,
        blur: 15,
        maxZoom: 17,
        gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red'}
    }).addTo(map);
}

function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        themeToggle.textContent = newTheme === 'dark' ? '🌞' : '🌓';
        localStorage.setItem('theme', newTheme);
    });
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.textContent = savedTheme === 'dark' ? '🌞' : '🌓';
}

function loadData() {
    // Show loading state
    document.querySelector('#ipTable tbody').innerHTML = `
        <tr>
            <td colspan="8" style="text-align: center; padding: 30px;">数据加载中...</td>
        </tr>
    `;
    
    // In a real application, this would fetch from your API
    // For demo purposes, we'll use the sample data provided
    const sampleData = {
        "device_id": "24f18c96d960fba6",
        "date": "2025-04-13",
        "open_count": 25,
        "report_time": "2025-04-13 03:36:00",
        "device_model": "PJA110",
        "android_version": "13",
        "manufacturer": "OnePlus",
        "sdk_version": 33,
        "ip_address": "117.151.235.247",
        "country": "China",
        "country_code": "CN",
        "region": "Hubei",
        "city": "Wuhan",
        "latitude": 30.589,
        "longitude": 114.2681,
        "timezone": "Asia/Shanghai",
        "isp": "China Mobile Communications Group Co., Ltd.",
        "threat_level": "medium",
        "bandwidth": 45.2,
        "protocols": ["HTTPS", "TCP"],
        "ports": [443, 8080],
        "asn": "AS9808",
        "asn_name": "China Mobile Communications Corporation"
    };
    
    // Process the data
    allStats = [sampleData]; // Normally this would be an array of data
    processData();
}

function processData() {
    // Process and normalize the data
    filteredStats = [...allStats];
    
    // Update UI
    updateDashboard();
    updateMap();
    updateTable();
}

function applyFilters() {
    // Get filter values
    const timeRange = document.getElementById('timeRange').value;
    const country = document.getElementById('countryFilter').value;
    const threatLevel = document.getElementById('threatLevel').value;
    const protocolType = document.getElementById('protocolType').value;
    const ipSearch = document.getElementById('ipSearch').value.toLowerCase();
    const realTime = document.getElementById('realTimeToggle').checked;
    
    // Apply filters
    filteredStats = allStats.filter(stat => {
        // Time range filter
        if (timeRange !== 'all') {
            const days = parseInt(timeRange.replace('d', '').replace('h', ''));
            const cutoffDate = new Date();
            
            if (timeRange.includes('h')) {
                cutoffDate.setHours(cutoffDate.getHours() - days);
            } else {
                cutoffDate.setDate(cutoffDate.getDate() - days);
            }
            
            const statDate = new Date(stat.report_time || stat.date);
            if (statDate < cutoffDate) return false;
        }
        
        // Country filter
        if (country !== 'all' && stat.country_code !== country) {
            return false;
        }
        
        // Threat level filter
        if (threatLevel !== 'all' && stat.threat_level !== threatLevel) {
            return false;
        }
        
        // Protocol filter
        if (protocolType !== 'all' && 
            (!stat.protocols || !stat.protocols.includes(protocolType))) {
            return false;
        }
        
        // IP search
        if (ipSearch && !stat.ip_address.includes(ipSearch)) {
            return false;
        }
        
        return true;
    });
    
    // Update UI
    updateDashboard();
    updateMap();
    updateTable();
}

function updateDashboard() {
    // Calculate metrics
    const totalIps = filteredStats.length;
    const highRiskIps = filteredStats.filter(s => s.threat_level === 'high').length;
    const countries = new Set(filteredStats.map(s => s.country)).size;
    const avgBandwidth = filteredStats.reduce((sum, s) => sum + (s.bandwidth || 0), 0) / (filteredStats.length || 1);
    
    // Update cards
    document.getElementById('totalIps').textContent = totalIps;
    document.getElementById('highRiskIps').textContent = highRiskIps;
    document.getElementById('countryCount').textContent = countries;
    document.getElementById('avgBandwidth').textContent = avgBandwidth.toFixed(2);
}

function updateMap() {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Add new markers
    filteredStats.forEach(stat => {
        if (stat.latitude && stat.longitude) {
            const marker = L.marker([stat.latitude, stat.longitude], {
                icon: getThreatLevelIcon(stat.threat_level)
            }).addTo(map);
            
            marker.bindPopup(`
                <b>IP:</b> ${stat.ip_address}<br>
                <b>位置:</b> ${stat.city}, ${stat.region}, ${stat.country}<br>
                <b>ISP:</b> ${stat.isp}<br>
                <b>威胁等级:</b> ${getThreatLevelText(stat.threat_level)}<br>
                <b>带宽:</b> ${stat.bandwidth || 'N/A'} Mbps
            `);
            
            markers.push(marker);
        }
    });
    
    // Update heatmap
    updateHeatmap();
    
    // Fit bounds if we have markers
    if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds());
    }
}

function getThreatLevelIcon(level) {
    const colors = {
        low: 'green',
        medium: 'orange',
        high: 'red'
    };
    
    return L.divIcon({
        className: 'threat-marker',
        html: `<div style="background-color: ${colors[level] || 'gray'}" class="marker-pin"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
}

function getThreatLevelText(level) {
    const levels = {
        low: '低风险',
        medium: '中风险',
        high: '高风险'
    };
    
    return levels[level] || '未知';
}

function updateHeatmap() {
    if (document.getElementById('heatmapToggle').checked) {
        const points = filteredStats
            .filter(stat => stat.latitude && stat.longitude)
            .map(stat => [stat.latitude, stat.longitude, stat.open_count || 1]);
        
        heatmapLayer.setLatLngs(points.map(p => [p[0], p[1], p[2]]));
        heatmapLayer.addTo(map);
    } else {
        map.removeLayer(heatmapLayer);
    }
}

function toggleHeatmap() {
    updateHeatmap();
}

function updateTable() {
    const tbody = document.querySelector('#ipTable tbody');
    tbody.innerHTML = '';
    
    if (filteredStats.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 30px;">没有找到匹配的数据</td>
            </tr>
        `;
        return;
    }
    
    // Sort by most recent
    const sortedStats = [...filteredStats].sort((a, b) => {
        return new Date(b.report_time || b.date) - new Date(a.report_time || a.date);
    });
    
    // Display first 100 records
    sortedStats.slice(0, 100).forEach(stat => {
        const row = document.createElement('tr');
        
        // IP Address
        const ipCell = document.createElement('td');
        ipCell.textContent = stat.ip_address;
        row.appendChild(ipCell);
        
        // Country
        const countryCell = document.createElement('td');
        countryCell.innerHTML = `
            <span class="flag-icon flag-icon-${stat.country_code.toLowerCase()}"></span>
            ${stat.country}
        `;
        row.appendChild(countryCell);
        
        // City
        const cityCell = document.createElement('td');
        cityCell.textContent = stat.city || 'N/A';
        row.appendChild(cityCell);
        
        // Coordinates
        const coordCell = document.createElement('td');
        if (stat.latitude && stat.longitude) {
            coordCell.textContent = `${stat.latitude.toFixed(4)}, ${stat.longitude.toFixed(4)}`;
        } else {
            coordCell.textContent = 'N/A';
        }
        row.appendChild(coordCell);
        
        // ISP
        const ispCell = document.createElement('td');
        ispCell.textContent = stat.isp || 'N/A';
        row.appendChild(ispCell);
        
        // Bandwidth
        const bwCell = document.createElement('td');
        bwCell.textContent = stat.bandwidth ? `${stat.bandwidth} Mbps` : 'N/A';
        row.appendChild(bwCell);
        
        // Threat Level
        const threatCell = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `badge badge-${stat.threat_level || 'unknown'}`;
        badge.textContent = getThreatLevelText(stat.threat_level);
        threatCell.appendChild(badge);
        row.appendChild(threatCell);
        
        // Last Active
        const lastActiveCell = document.createElement('td');
        lastActiveCell.textContent = stat.report_time || stat.date || 'N/A';
        row.appendChild(lastActiveCell);
        
        tbody.appendChild(row);
    });
}

function exportCSV() {
    if (filteredStats.length === 0) {
        alert('没有数据可导出');
        return;
    }
    
    // Create CSV content
    const headers = [
        'IP地址', '国家', '城市', '纬度', '经度', 
        'ISP', '带宽(Mbps)', '威胁等级', '最后活跃', 'ASN', '协议'
    ];
    
    const rows = filteredStats.map(stat => [
        stat.ip_address,
        stat.country,
        stat.city,
        stat.latitude,
        stat.longitude,
        stat.isp,
        stat.bandwidth,
        stat.threat_level,
        stat.report_time || stat.date,
        stat.asn,
        stat.protocols ? stat.protocols.join(', ') : ''
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ip_data_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Initialize charts
function initCharts() {
    // Threat level distribution
    const threatCtx = document.getElementById('threatChart').getContext('2d');
    new Chart(threatCtx, {
        type: 'doughnut',
        data: {
            labels: ['低风险', '中风险', '高风险'],
            datasets: [{
                data: [0, 0, 0], // Will be updated
                backgroundColor: [
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(255, 99, 132, 0.7)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((context.raw / total) * 100);
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Bandwidth distribution
    const bwCtx = document.getElementById('bandwidthChart').getContext('2d');
    new Chart(bwCtx, {
        type: 'bar',
        data: {
            labels: ['0-10', '10-50', '50-100', '100-500', '500+'],
            datasets: [{
                label: '带宽分布 (Mbps)',
                data: [0, 0, 0, 0, 0], // Will be updated
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Protocol distribution
    const protocolCtx = document.getElementById('protocolChart').getContext('2d');
    new Chart(protocolCtx, {
        type: 'pie',
        data: {
            labels: ['HTTP', 'HTTPS', 'FTP', 'SSH', '其他'],
            datasets: [{
                data: [0, 0, 0, 0, 0], // Will be updated
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

function updateCharts() {
    // Update threat level chart
    const threatCounts = {
        low: filteredStats.filter(s => s.threat_level === 'low').length,
        medium: filteredStats.filter(s => s.threat_level === 'medium').length,
        high: filteredStats.filter(s => s.threat_level === 'high').length
    };
    
    // Update bandwidth distribution chart
    const bwRanges = [0, 0, 0, 0, 0]; // 0-10, 10-50, 50-100, 100-500, 500+
    filteredStats.forEach(stat => {
        const bw = stat.bandwidth || 0;
        if (bw <= 10) bwRanges[0]++;
        else if (bw <= 50) bwRanges[1]++;
        else if (bw <= 100) bwRanges[2]++;
        else if (bw <= 500) bwRanges[3]++;
        else bwRanges[4]++;
    });
    
    // Update protocol distribution chart
    const protocolCounts = {
        http: 0,
        https: 0,
        ftp: 0,
        ssh: 0,
        other: 0
    };
    
    filteredStats.forEach(stat => {
        if (!stat.protocols) return;
        
        stat.protocols.forEach(proto => {
            const lowerProto = proto.toLowerCase();
            if (lowerProto.includes('http')) {
                if (lowerProto.includes('https')) protocolCounts.https++;
                else protocolCounts.http++;
            } else if (lowerProto.includes('ftp')) {
                protocolCounts.ftp++;
            } else if (lowerProto.includes('ssh')) {
                protocolCounts.ssh++;
            } else {
                protocolCounts.other++;
            }
        });
    });
    
    // In a real implementation, we would update the chart data here
    // For this demo, we'll just log the values
    console.log('Threat level counts:', threatCounts);
    console.log('Bandwidth ranges:', bwRanges);
    console.log('Protocol counts:', protocolCounts);
}
