// 全局数据变量
let allStats = [];
let filteredStats = [];
let deviceModels = new Set();
let androidVersions = new Set();
let manufacturers = new Set();
let countries = new Set();
let regions = new Set();
let cities = new Set();
let map = null;
let markers = [];
let isDarkMode = false;

// 初始化图表
const totalOpensChart = initBarChart('totalOpensChart', '总开启次数', 'rgba(67, 97, 238, 0.7)');
const devicesChart = initDoughnutChart('devicesChart', '设备分布');
const androidChart = initDoughnutChart('androidChart', 'Android版本分布');
const geoChart = initDoughnutChart('geoChart', '国家分布');
const trendChart = initLineChart('trendChart', '设备使用趋势');
const manufacturerChart = initBarChart('manufacturerChart', '制造商分布', 'rgba(76, 201, 240, 0.7)');

// 加载数据
function loadData() {
    fetch('https://raw.githubusercontent.com/nspron/DuolingoKill/main/stats/device_stats.csv')
        .then(response => {
            if (!response.ok) throw new Error('网络响应不正常');
            return response.text();
        })
        .then(data => {
            // 改进的CSV解析函数
            const parseCSV = (text) => {
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
            };

            // 解析CSV数据
            allStats = parseCSV(data).filter(entry => 
                entry.date && entry.device_id && entry.open_count
            );
            
            // 收集各种筛选选项
            allStats.forEach(stat => {
                if (stat.device_model) deviceModels.add(stat.device_model);
                if (stat.android_version) androidVersions.add(stat.android_version);
                if (stat.manufacturer) manufacturers.add(stat.manufacturer);
                if (stat.country) countries.add(stat.country);
                if (stat.region) regions.add(stat.region);
                if (stat.city) cities.add(stat.city);
            });
            
            // 填充筛选器选项
            fillFilterOptions();
            
            // 应用初始筛选
            applyFilters();
            
            // 初始化地图
            initMap();
            
            // 初始化黑暗模式切换按钮
            initDarkModeToggle();
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

// 初始化地图
function initMap() {
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer) return;
    
    // 创建地图容器
    mapContainer.innerHTML = '<div id="map" style="height: 100%; width: 100%;"></div>';
    
    // 使用OpenStreetMap作为底图
    map = L.map('map').setView([30, 105], 3);
    
    // 添加地图图层
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

// 初始化黑暗模式切换
function initDarkModeToggle() {
    const darkModeToggle = document.createElement('button');
    darkModeToggle.id = 'darkModeToggle';
    darkModeToggle.innerHTML = '🌙';
    darkModeToggle.style.position = 'fixed';
    darkModeToggle.style.bottom = '20px';
    darkModeToggle.style.right = '20px';
    darkModeToggle.style.zIndex = '1000';
    darkModeToggle.style.width = '50px';
    darkModeToggle.style.height = '50px';
    darkModeToggle.style.borderRadius = '50%';
    darkModeToggle.style.border = 'none';
    darkModeToggle.style.background = 'var(--primary-color)';
    darkModeToggle.style.color = 'white';
    darkModeToggle.style.fontSize = '20px';
    darkModeToggle.style.cursor = 'pointer';
    darkModeToggle.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    
    darkModeToggle.addEventListener('click', toggleDarkMode);
    document.body.appendChild(darkModeToggle);
}

// 切换黑暗模式
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode');
    document.getElementById('darkModeToggle').innerHTML = isDarkMode ? '☀️' : '🌙';
    
    // 更新图表主题
    updateChartThemes();
}

// 更新图表主题
function updateChartThemes() {
    const bgColor = isDarkMode ? '#1a1a1a' : 'white';
    const textColor = isDarkMode ? 'white' : '#666';
    const gridColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
    
    // 更新所有图表主题
    [totalOpensChart, devicesChart, androidChart, geoChart, trendChart, manufacturerChart].forEach(chart => {
        chart.options.scales.x.grid.color = gridColor;
        chart.options.scales.y.grid.color = gridColor;
        chart.options.scales.x.ticks.color = textColor;
        chart.options.scales.y.ticks.color = textColor;
        chart.update();
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
                            color: '#666'
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
                            color: '#666'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#666'
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
                            color: '#666'
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
                        display: false
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
                            color: '#666'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#666'
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
    const manufacturerSelect = document.getElementById('manufacturer');
    const countrySelect = document.getElementById('country');
    const regionSelect = document.getElementById('region');
    const citySelect = document.getElementById('city');
    
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
    
    // 添加制造商选项
    manufacturers.forEach(manufacturer => {
        const option = document.createElement('option');
        option.value = manufacturer;
        option.textContent = manufacturer;
        manufacturerSelect.appendChild(option);
    });
    
    // 添加国家选项
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
    });
    
    // 添加地区选项
    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        regionSelect.appendChild(option);
    });
    
    // 添加城市选项
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });
}

// 应用筛选条件
function applyFilters() {
    const dateRange = document.getElementById('dateRange').value;
    const deviceModel = document.getElementById('deviceModel').value;
    const androidVersion = document.getElementById('androidVersion').value;
    const manufacturer = document.getElementById('manufacturer').value;
    const country = document.getElementById('country').value;
    const region = document.getElementById('region').value;
    const city = document.getElementById('city').value;
    const deviceSearch = document.getElementById('deviceSearch').value.toLowerCase();
    
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
        
        // 制造商筛选
        if (manufacturer !== 'all' && stat.manufacturer !== manufacturer) {
            return false;
        }
        
        // 国家筛选
        if (country !== 'all' && stat.country !== country) {
            return false;
        }
        
        // 地区筛选
        if (region !== 'all' && stat.region !== region) {
            return false;
        }
        
        // 城市筛选
        if (city !== 'all' && stat.city !== city) {
            return false;
        }
        
        // 设备ID搜索
        if (deviceSearch && !stat.device_id.toLowerCase().includes(deviceSearch)) {
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
    const manufacturerCounts = {};
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
                    count: parseInt(stat.open_count) || 1
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
        
        // 按制造商统计
        if (!manufacturerCounts[stat.manufacturer]) {
            manufacturerCounts[stat.manufacturer] = 0;
        }
        manufacturerCounts[stat.manufacturer] += parseInt(stat.open_count) || 0;
    });
    
    // 更新仪表板数据
    document.getElementById('totalOpens').textContent = totalOpens;
    document.getElementById('uniqueDevices').textContent = uniqueDevices.size;
    document.getElementById('androidVersions').textContent = Object.keys(versionCounts).length;
    document.getElementById('uniqueLocations').textContent = uniqueLocations.size;
    
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
    
    // 更新制造商分布图表
    const topManufacturers = Object.entries(manufacturerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    manufacturerChart.data.labels = topManufacturers.map(m => m[0] || '未知制造商');
    manufacturerChart.data.datasets[0].data = topManufacturers.map(m => m[1]);
    manufacturerChart.update();
    
    // 更新趋势图表
    trendChart.data.labels = dates;
    trendChart.data.datasets[0].data = dates.map(date => dailyStats[date]);
    trendChart.update();
    
    // 更新地图
    updateMap(locationPoints);
}

// 更新地图
function updateMap(locationPoints) {
    if (!map) return;
    
    // 清除旧标记
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    if (locationPoints.length === 0) {
        return;
    }
    
    // 计算中心点
    const centerLat = locationPoints.reduce((sum, point) => sum + point.lat, 0) / locationPoints.length;
    const centerLng = locationPoints.reduce((sum, point) => sum + point.lng, 0) / locationPoints.length;
    
    // 设置地图视图
    map.setView([centerLat, centerLng], 3);
    
    // 添加新标记
    locationPoints.forEach(point => {
        const marker = L.marker([point.lat, point.lng]).addTo(map);
        marker.bindPopup(`
            <b>${point.city || '未知城市'}, ${point.region || '未知地区'}, ${point.country || '未知国家'}</b><br>
            开启次数: ${point.count}
        `);
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
            ipLink.style.color = 'var(--primary-color)';
            ipLink.style.textDecoration = 'none';
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
            geoTd.textContent = `${stat.city}, ${stat.region}, ${stat.country}`;
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
        timeTd.textContent = stat.report_time || '--';
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
    today.setHours(0, 0, 0, 0); // 清零时间部分，确保比较日期而非时间戳

    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0); // 同样清零时间部分

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
    // 统一用本地时区解析日期，避免 UTC 和本地时区混淆
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 清零时间部分，确保比较日期而非时间戳

    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0); // 同样清零时间部分

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

// 初始化事件监听
function initEventListeners() {
    // 筛选器事件监听
    document.getElementById('dateRange').addEventListener('change', applyFilters);
    document.getElementById('deviceModel').addEventListener('change', applyFilters);
    document.getElementById('androidVersion').addEventListener('change', applyFilters);
    document.getElementById('manufacturer').addEventListener('change', applyFilters);
    document.getElementById('country').addEventListener('change', applyFilters);
    document.getElementById('region').addEventListener('change', applyFilters);
    document.getElementById('city').addEventListener('change', applyFilters);
    document.getElementById('deviceSearch').addEventListener('input', applyFilters);
    
    // IP弹窗事件监听
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

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadData();
});
