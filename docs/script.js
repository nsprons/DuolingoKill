// 全局数据变量
let allStats = [];
let filteredStats = [];
let deviceModels = new Set();
let androidVersions = new Set();
let map = null;
let markers = [];
let isDarkMode = false;

// 图表实例
let totalOpensChart, devicesChart, androidChart, geoChart, trendChart;

// 初始化应用
function initApp() {
    // 初始化图表
    totalOpensChart = initBarChart('totalOpensChart', '总开启次数', 'rgba(67, 97, 238, 0.7)');
    devicesChart = initDoughnutChart('devicesChart', '设备分布');
    androidChart = initDoughnutChart('androidChart', 'Android版本分布');
    geoChart = initDoughnutChart('geoChart', '国家分布');
    trendChart = initLineChart('trendChart', '设备使用趋势');
    
    // 加载数据
    loadData();
    
    // 初始化事件监听
    initEventListeners();
    
    // 初始化地图容器
    initMapContainer();
    
    // 检查本地存储中的主题设置
    checkThemePreference();
}

// 加载数据
function loadData() {
    fetch('https://raw.githubusercontent.com/nspron/DuolingoKill/main/stats/device_stats.csv')
        .then(response => {
            if (!response.ok) throw new Error('网络响应不正常');
            return response.text();
        })
        .then(data => {
            // 解析CSV数据
            allStats = parseCSV(data).filter(entry => 
                entry.date && entry.device_id && entry.open_count
            );
            
            // 收集设备型号和Android版本
            allStats.forEach(stat => {
                if (stat.device_model) deviceModels.add(stat.device_model);
                if (stat.android_version) androidVersions.add(stat.android_version);
            });
            
            // 填充筛选器选项
            fillFilterOptions();
            
            // 应用初始筛选
            applyFilters();
        })
        .catch(error => {
            console.error('加载数据失败:', error);
            document.querySelector('#statsTable tbody').innerHTML = `
                <tr>
                    <td colspan="10" class="error">数据加载失败，请稍后再试</td>
                </tr>
            `;
        });
}

// 解析CSV数据
function parseCSV(text) {
    const rows = text.split('\n').filter(row => row.trim() !== '');
    const headers = rows.shift().split(',').map(h => h.replace(/^"|"$/g, ''));
    
    return rows.map(row => {
        // 使用正则表达式匹配CSV字段（处理带引号的字段）
        const values = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        const entry = {};
        headers.forEach((header, i) => {
            // 移除字段值的首尾引号（如果存在）
            entry[header] = values[i] ? values[i].replace(/^"|"$/g, '') : '';
        });
        return entry;
    });
}

// 初始化事件监听
function initEventListeners() {
    // 筛选器事件
    document.getElementById('dateRange').addEventListener('change', applyFilters);
    document.getElementById('deviceModel').addEventListener('change', applyFilters);
    document.getElementById('androidVersion').addEventListener('change', applyFilters);
    document.getElementById('deviceSearch').addEventListener('input', applyFilters);
    document.getElementById('ipSearch').addEventListener('input', applyFilters);
    document.getElementById('countryFilter').addEventListener('change', applyFilters);
    
    // 主题切换按钮
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // IP弹窗关闭按钮
    document.getElementById('ipModalClose').addEventListener('click', () => {
        document.getElementById('ipModal').style.display = 'none';
    });
    
    // 点击地图容器外关闭弹窗
    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('ipModal')) {
            document.getElementById('ipModal').style.display = 'none';
        }
    });
}

// 初始化地图容器
function initMapContainer() {
    const mapContainer = document.getElementById('mapContainer');
    mapContainer.innerHTML = '<div class="map-placeholder">地图加载中...</div>';
}

// 检查主题偏好
function checkThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        enableDarkMode();
    }
}

// 切换主题
function toggleTheme() {
    if (isDarkMode) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
    localStorage.setItem('theme', isDarkMode ? 'light' : 'dark');
}

// 启用暗黑模式
function enableDarkMode() {
    isDarkMode = true;
    document.body.classList.add('dark-mode');
    document.getElementById('themeToggle').textContent = '☀️ 亮色模式';
    updateChartThemes(true);
}

// 禁用暗黑模式
function disableDarkMode() {
    isDarkMode = false;
    document.body.classList.remove('dark-mode');
    document.getElementById('themeToggle').textContent = '🌙 暗黑模式';
    updateChartThemes(false);
}

// 更新图表主题
function updateChartThemes(isDark) {
    const textColor = isDark ? '#f8f9fa' : '#212529';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    
    // 更新所有图表选项
    const charts = [totalOpensChart, devicesChart, androidChart, geoChart, trendChart];
    charts.forEach(chart => {
        if (chart) {
            chart.options.scales.x.grid.color = gridColor;
            chart.options.scales.y.grid.color = gridColor;
            chart.options.scales.x.ticks.color = textColor;
            chart.options.scales.y.ticks.color = textColor;
            chart.update();
        }
    });
}

// 初始化柱状图
function initBarChart(canvasId, label, color) {
    return new Chart(
        document.getElementById(canvasId),
        {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: label,
                    data: [],
                    backgroundColor: color,
                    borderColor: color.replace('0.7', '1'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                        labels: {
                            color: '#f8f9fa'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${label}: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            color: '#212529'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#212529'
                        }
                    }
                }
            }
        }
    );
}

// 初始化环形图
function initDoughnutChart(canvasId, label) {
    return new Chart(
        document.getElementById(canvasId),
        {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    label: label,
                    data: [],
                    backgroundColor: [
                        'rgba(67, 97, 238, 0.7)',
                        'rgba(76, 201, 240, 0.7)',
                        'rgba(63, 55, 201, 0.7)',
                        'rgba(108, 117, 125, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#212529'
                        }
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
        }
    );
}

// 初始化折线图
function initLineChart(canvasId, label) {
    return new Chart(
        document.getElementById(canvasId),
        {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: label,
                    data: [],
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    borderColor: 'rgba(67, 97, 238, 1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                        labels: {
                            color: '#f8f9fa'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            color: '#212529'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#212529'
                        }
                    }
                }
            }
        }
    );
}

// 填充筛选器选项
function fillFilterOptions() {
    const deviceModelSelect = document.getElementById('deviceModel');
    const androidVersionSelect = document.getElementById('androidVersion');
    const countryFilter = document.getElementById('countryFilter');
    
    const countries = new Set();
    
    // 收集国家和设备信息
    allStats.forEach(stat => {
        if (stat.device_model) deviceModels.add(stat.device_model);
        if (stat.android_version) androidVersions.add(stat.android_version);
        if (stat.country) countries.add(stat.country);
    });
    
    // 添加设备型号选项
    deviceModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        deviceModelSelect.appendChild(option);
    });
    
    // 添加Android版本选项
    androidVersions.forEach(version => {
        const option = document.createElement('option');
        option.value = version;
        option.textContent = `Android ${version}`;
        androidVersionSelect.appendChild(option);
    });
    
    // 添加国家筛选选项
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countryFilter.appendChild(option);
    });
}

// 应用筛选条件
function applyFilters() {
    const dateRange = document.getElementById('dateRange').value;
    const deviceModel = document.getElementById('deviceModel').value;
    const androidVersion = document.getElementById('androidVersion').value;
    const deviceSearch = document.getElementById('deviceSearch').value.toLowerCase();
    const ipSearch = document.getElementById('ipSearch').value.toLowerCase();
    const countryFilter = document.getElementById('countryFilter').value;
    
    // 计算日期范围
    let minDate = null;
    if (dateRange !== 'all') {
        const days = parseInt(dateRange);
        minDate = new Date();
        minDate.setDate(minDate.getDate() - days);
    }
    
    // 筛选数据
    filteredStats = allStats.filter(stat => {
        // 日期筛选
        if (minDate && new Date(stat.date) < minDate) {
            return false;
        }
        
        // 设备型号筛选
        if (deviceModel !== 'all' && stat.device_model !== deviceModel) {
            return false;
        }
        
        // Android版本筛选
        if (androidVersion !== 'all' && stat.android_version !== androidVersion) {
            return false;
        }
        
        // 设备ID搜索
        if (deviceSearch && !stat.device_id.toLowerCase().includes(deviceSearch)) {
            return false;
        }
        
        // IP地址搜索
        if (ipSearch && (!stat.ip_address || !stat.ip_address.toLowerCase().includes(ipSearch))) {
            return false;
        }
        
        // 国家筛选
        if (countryFilter !== 'all' && stat.country !== countryFilter) {
            return false;
        }
        
        return true;
    });
    
    // 更新图表和数据展示
    updateCharts();
    updateTable();
}

// 更新图表数据
function updateCharts() {
    const today = new Date().toISOString().split('T')[0];
    
    // 按日期聚合数据
    const dailyStats = {};
    const deviceCounts = {};
    const versionCounts = {};
    const countryCounts = {};
    const locationPoints = [];
    let totalOpens = 0;
    let uniqueDevices = new Set();
    let uniqueCountries = new Set();
    let uniqueLocations = new Set();
    
    filteredStats.forEach(stat => {
        // 统计总开启次数
        totalOpens += parseInt(stat.open_count) || 0;
        
        // 记录唯一设备
        uniqueDevices.add(stat.device_id);
        
        // 记录唯一地理位置
        if (stat.country && stat.region && stat.city) {
            const locationKey = `${stat.country}-${stat.region}-${stat.city}`;
            uniqueLocations.add(locationKey);
            
            // 记录国家
            uniqueCountries.add(stat.country);
            if (!countryCounts[stat.country]) {
                countryCounts[stat.country] = 0;
            }
            countryCounts[stat.country] += parseInt(stat.open_count) || 0;
            
            // 收集坐标点
            if (stat.latitude && stat.longitude) {
                locationPoints.push({
                    lat: parseFloat(stat.latitude),
                    lng: parseFloat(stat.longitude),
                    city: stat.city,
                    region: stat.region,
                    country: stat.country,
                    count: parseInt(stat.open_count) || 1,
                    ip: stat.ip_address,
                    isp: stat.isp
                });
            }
        }
        
        // 按日期统计
        if (!dailyStats[stat.date]) {
            dailyStats[stat.date] = 0;
        }
        dailyStats[stat.date] += parseInt(stat.open_count) || 0;
        
        // 按设备统计
        if (!deviceCounts[stat.device_model]) {
            deviceCounts[stat.device_model] = 0;
        }
        deviceCounts[stat.device_model] += parseInt(stat.open_count) || 0;
        
        // 按Android版本统计
        if (!versionCounts[stat.android_version]) {
            versionCounts[stat.android_version] = 0;
        }
        versionCounts[stat.android_version] += parseInt(stat.open_count) || 0;
    });
    
    // 更新仪表板数据
    document.getElementById('totalOpens').textContent = totalOpens.toLocaleString();
    document.getElementById('uniqueDevices').textContent = uniqueDevices.size.toLocaleString();
    document.getElementById('androidVersions').textContent = Object.keys(versionCounts).length.toLocaleString();
    document.getElementById('uniqueLocations').textContent = uniqueLocations.size.toLocaleString();
    
    // 准备日期排序
    const dates = Object.keys(dailyStats).sort();
    
    // 更新总开启次数图表
    totalOpensChart.data.labels = dates;
    totalOpensChart.data.datasets[0].data = dates.map(date => dailyStats[date]);
    totalOpensChart.update();
    
    // 更新设备分布图表
    const topDevices = Object.entries(deviceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    devicesChart.data.labels = topDevices.map(d => d[0] || '未知设备');
    devicesChart.data.datasets[0].data = topDevices.map(d => d[1]);
    devicesChart.update();
    
    // 更新Android版本分布图表
    const topVersions = Object.entries(versionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    androidChart.data.labels = topVersions.map(v => `Android ${v[0]}` || '未知版本');
    androidChart.data.datasets[0].data = topVersions.map(v => v[1]);
    androidChart.update();
    
    // 更新国家分布图表
    const topCountries = Object.entries(countryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    geoChart.data.labels = topCountries.map(c => c[0] || '未知国家');
    geoChart.data.datasets[0].data = topCountries.map(c => c[1]);
    geoChart.update();
    
    // 更新趋势图表
    trendChart.data.labels = dates;
    trendChart.data.datasets[0].data = dates.map(date => dailyStats[date]);
    trendChart.update();
    
    // 更新地图
    updateMap(locationPoints);
}

// 更新地图
function updateMap(locationPoints) {
    const mapContainer = document.getElementById('mapContainer');
    mapContainer.innerHTML = ''; // 清除旧地图
    
    if (locationPoints.length === 0) {
        mapContainer.innerHTML = '<div class="map-placeholder">没有地理位置数据</div>';
        return;
    }
    
    // 计算中心点
    const centerLat = locationPoints.reduce((sum, point) => sum + point.lat, 0) / locationPoints.length;
    const centerLng = locationPoints.reduce((sum, point) => sum + point.lng, 0) / locationPoints.length;
    
    // 初始化地图
    map = L.map('mapContainer').setView([centerLat, centerLng], 3);
    
    // 添加地图图层
    const tileLayer = isDarkMode 
        ? L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        })
        : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });
    
    tileLayer.addTo(map);
    
    // 清除旧标记
    if (markers && markers.length > 0) {
        markers.forEach(marker => map.removeLayer(marker));
    }
    markers = [];
    
    // 创建自定义图标
    const customIcon = L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
    });
    
    // 添加新标记
    locationPoints.forEach(point => {
        const marker = L.marker([point.lat, point.lng], { icon: customIcon }).addTo(map);
        const popupContent = `
            <div class="map-popup">
                <h4>${point.city || '未知城市'}, ${point.region || '未知地区'}</h4>
                <p><strong>国家:</strong> ${point.country || '未知'}</p>
                <p><strong>IP:</strong> ${point.ip || '未知'}</p>
                <p><strong>ISP:</strong> ${point.isp || '未知'}</p>
                <p><strong>开启次数:</strong> ${point.count}</p>
                <button class="view-details" data-ip="${point.ip}">查看详情</button>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        
        // 添加点击事件监听
        marker.on('popupopen', () => {
            document.querySelector(`.view-details[data-ip="${point.ip}"]`)?.addEventListener('click', () => {
                const stat = filteredStats.find(s => s.ip_address === point.ip);
                if (stat) showIpDetails(stat);
            });
        });
        
        markers.push(marker);
    });
    
    // 如果有多个点，调整视图以包含所有标记
    if (locationPoints.length > 1) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds());
    }
}

// 显示IP详细信息
function showIpDetails(stat) {
    const ipModal = document.getElementById('ipModal');
    const ipDetails = document.getElementById('ipDetails');
    
    ipDetails.innerHTML = '';
    
    // 添加IP基本信息
    addIpDetail('IP地址', stat.ip_address || '未知');
    addIpDetail('国家', stat.country || '未知');
    addIpDetail('地区', stat.region || '未知');
    addIpDetail('城市', stat.city || '未知');
    addIpDetail('ISP', stat.isp || '未知');
    addIpDetail('经纬度', 
        (stat.latitude && stat.longitude) 
            ? `${stat.latitude}, ${stat.longitude}` 
            : '未知');
    addIpDetail('时区', stat.timezone || '未知');
    addIpDetail('设备ID', stat.device_id || '未知');
    addIpDetail('设备型号', stat.device_model || '未知');
    addIpDetail('Android版本', stat.android_version ? `Android ${stat.android_version}` : '未知');
    addIpDetail('报告时间', stat.report_time || '未知');
    addIpDetail('开启次数', stat.open_count || '0');
    
    // 显示弹窗
    ipModal.style.display = 'flex';
    
    function addIpDetail(label, value) {
        const detailItem = document.createElement('div');
        detailItem.className = 'ip-detail-item';
        detailItem.innerHTML = `
            <div class="ip-detail-label">${label}</div>
            <div class="ip-detail-value">${value}</div>
        `;
        ipDetails.appendChild(detailItem);
    }
}

// 更新表格数据
function updateTable() {
    const tbody = document.querySelector('#statsTable tbody');
    tbody.innerHTML = '';
    
    if (filteredStats.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="loading">没有找到匹配的数据</td>
            </tr>
        `;
        return;
    }
    
    // 按日期降序排序
    const sortedStats = [...filteredStats].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // 只显示前100条记录
    const displayStats = sortedStats.slice(0, 100);
    
    displayStats.forEach(stat => {
        const tr = document.createElement('tr');
        
        // 日期
        const dateTd = document.createElement('td');
        dateTd.textContent = stat.date;
        tr.appendChild(dateTd);
        
        // 设备ID
        const deviceTd = document.createElement('td');
        deviceTd.textContent = stat.device_id.slice(0, 8) + '...';
        deviceTd.title = stat.device_id;
        tr.appendChild(deviceTd);
        
        // 开启次数
        const countTd = document.createElement('td');
        countTd.textContent = stat.open_count;
        tr.appendChild(countTd);
        
        // 设备型号
        const modelTd = document.createElement('td');
        modelTd.textContent = stat.device_model || '--';
        tr.appendChild(modelTd);
        
        // Android版本
        const versionTd = document.createElement('td');
        versionTd.textContent = stat.android_version ? `Android ${stat.android_version}` : '--';
        tr.appendChild(versionTd);
        
        // IP地址
        const ipTd = document.createElement('td');
        if (stat.ip_address) {
            const ipLink = document.createElement('a');
            ipLink.href = '#';
            ipLink.textContent = stat.ip_address;
            ipLink.className = 'ip-link';
            ipLink.addEventListener('click', (e) => {
                e.preventDefault();
                showIpDetails(stat);
            });
            ipTd.appendChild(ipLink);
        } else {
            ipTd.textContent = '--';
        }
        tr.appendChild(ipTd);
        
        // 地理位置
        const geoTd = document.createElement('td');
        if (stat.city && stat.region && stat.country) {
            geoTd.textContent = `${stat.city}, ${stat.region}`;
            geoTd.title = stat.country;
        } else {
            geoTd.textContent = '--';
        }
        tr.appendChild(geoTd);
        
        // 制造商
        const manuTd = document.createElement('td');
        manuTd.textContent = stat.manufacturer || '--';
        tr.appendChild(manuTd);
        
        // 报告时间
        const timeTd = document.createElement('td');
        timeTd.textContent = stat.report_time ? stat.report_time.split(' ')[1] : '--';
        tr.appendChild(timeTd);
        
        // 状态
        const statusTd = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = 'badge ' + getStatusBadgeClass(stat.date);
        badge.textContent = getStatusText(stat.date);
        statusTd.appendChild(badge);
        tr.appendChild(statusTd);
        
        tbody.appendChild(tr);
    });
}

// 获取状态标签样式
function getStatusBadgeClass(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today - reportDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'badge-success';
    } else if (diffDays <= 7) {
        return 'badge-primary';
    } else if (diffDays <= 30) {
        return 'badge-warning';
    } else {
        return 'badge-danger';
    }
}

// 获取状态文本
function getStatusText(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today - reportDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return '今日活跃';
    } else if (diffDays <= 7) {
        return '7天内活跃';
    } else if (diffDays <= 30) {
        return '30天内活跃';
    } else {
        return '历史记录';
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', initApp);
