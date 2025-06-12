document.addEventListener('DOMContentLoaded', () => {
    // Елементи DOM
    const temperatureEl = document.getElementById('temperature');
    const timeEl = document.getElementById('time');
    const dateEl = document.getElementById('date');
    const weekdayEl = document.getElementById('weekday');
    const themeToggle = document.getElementById('theme-toggle');
    const weatherSoundToggle = document.getElementById('weather-sound-toggle');
    const alertSoundToggle = document.getElementById('alert-sound-toggle');
    const kyivStatusEl = document.getElementById('kyiv-status');
    const footerAlertList = document.getElementById('footer-alert-list');
    const newsContainer = document.getElementById('news-container');

    // ... (решта коду залишається без змін)

    // --- Повний код для функцій без змін ---
    async function fetchWeather() { /* ... */ }
    function updateTime() { /* ... */ }
    async function fetchAlerts() { /* ... */ }

    // ОНОВЛЕНА ФУНКЦІЯ для новин
    async function fetchNews() {
        try {
            const response = await fetch(newsApiUrl);
            if (!response.ok) {
                newsContainer.textContent = 'Не вдалося завантажити новини.';
                return;
            }
            const data = await response.json();
            newsContainer.innerHTML = ''; 

            if (data.items && data.items.length > 0) {
                data.items.forEach(item => {
                    const link = document.createElement('a');
                    link.className = 'news-item';
                    link.href = item.link;
                    link.target = '_blank';

                    const title = document.createElement('h5');
                    title.textContent = item.title;

                    const source = document.createElement('p');
                    const pubDate = new Date(item.isoDate);
                    source.textContent = pubDate.toLocaleString('uk-UA');

                    link.appendChild(title);
                    link.appendChild(source);
                    newsContainer.appendChild(link);
                });
            } else {
                newsContainer.textContent = 'Свіжих новин по Києву не знайдено.';
            }
        } catch (error) {
            console.error("Failed to fetch news:", error);
            newsContainer.textContent = 'Помилка завантаження новин.';
        }
    }

    // ... (решта коду без змін)
    
    // --- Повний код для решти файлу, щоб уникнути помилок ---
    let lastTemperature = null; let isKyivAlertActive = false; let weatherSoundEnabled = true; let alertSoundEnabled = true;
    const sounds = { tempChange: new Audio('sounds/temp_change.mp3'), alertStart: new Audio('sounds/alert_start.mp3'), alertEnd: new Audio('sounds/alert_end.mp3') };
    const weatherApiUrl = 'https://api.open-meteo.com/v1/forecast?latitude=50.462722&longitude=30.491602&current_weather=true';
    const alertsApiUrl = '/api/alerts'; const newsApiUrl = '/api/news';
    async function fetchWeather() { try { const response = await fetch(weatherApiUrl); if (!response.ok) throw new Error(`Weather HTTP error! Status: ${response.status}`); const data = await response.json(); const currentTemp = Math.round(data.current_weather.temperature); temperatureEl.textContent = currentTemp; if (lastTemperature !== null && lastTemperature !== currentTemp && weatherSoundEnabled) { sounds.tempChange.play(); } lastTemperature = currentTemp; } catch (error) { console.error("Failed to fetch weather:", error); temperatureEl.textContent = 'XX'; } }
    function updateTime() { const now = new Date(); const optionsDate = { year: 'numeric', month: 'long', day: 'numeric' }; const optionsWeekday = { weekday: 'long' }; timeEl.textContent = now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); dateEl.innerHTML = `${now.toLocaleDateString('uk-UA', optionsDate)}`; weekdayEl.textContent = now.toLocaleDateString('uk-UA', { weekday: 'long' }).charAt(0).toUpperCase() + now.toLocaleDateString('uk-UA', { weekday: 'long' }).slice(1); }
    async function fetchAlerts() { try { const response = await fetch(alertsApiUrl); if (!response.ok) throw new Error('Failed to fetch from API proxy'); const data = await response.json(); const allAlerts = data.alerts; const kyivAlertNow = allAlerts.some(alert => alert.location_title === 'м. Київ'); if (kyivAlertNow) { kyivStatusEl.textContent = 'м. Київ: ПОВІТРЯНА ТРИВОГА'; kyivStatusEl.className = 'alert-status status-active'; } else { kyivStatusEl.textContent = 'м. Київ: Немає тривоги'; kyivStatusEl.className = 'alert-status status-inactive'; } if (kyivAlertNow && !isKyivAlertActive) { isKyivAlertActive = true; if (alertSoundEnabled) sounds.alertStart.play(); } else if (!kyivAlertNow && isKyivAlertActive) { isKyivAlertActive = false; if (alertSoundEnabled) sounds.alertEnd.play(); } const otherRegionsAlerts = allAlerts.filter(alert => alert.location_title !== 'м. Київ'); footerAlertList.innerHTML = ''; if (otherRegionsAlerts.length > 0) { const locationNames = otherRegionsAlerts.map(alert => alert.location_title); const uniqueLocationNames = [...new Set(locationNames)]; const title = document.createElement('h4'); title.textContent = 'Тривога в інших областях:'; footerAlertList.appendChild(title); uniqueLocationNames.forEach(locationName => { const badge = document.createElement('div'); badge.className = 'alert-badge'; badge.textContent = locationName; footerAlertList.appendChild(badge); }); footerAlertList.style.display = 'flex'; } else { footerAlertList.style.display = 'none'; } } catch (error) { console.error("Failed to load alert status:", error); kyivStatusEl.textContent = 'Помилка завантаження'; kyivStatusEl.className = 'alert-status'; footerAlertList.innerHTML = ''; footerAlertList.style.display = 'none'; } }
    weatherSoundToggle.addEventListener('click', () => { weatherSoundEnabled = !weatherSoundEnabled; weatherSoundToggle.textContent = weatherSoundEnabled ? '🔔 Звук: Увімкнено' : '🔕 Звук: Вимкнено'; });
    alertSoundToggle.addEventListener('click', () => { alertSoundEnabled = !alertSoundEnabled; alertSoundToggle.textContent = alertSoundEnabled ? '🔔 Тривога: Увімкнено' : '🔕 Тривога: Вимкнено'; });
    themeToggle.addEventListener('change', () => { document.body.classList.toggle('dark-theme', themeToggle.checked); });
    fetchWeather(); updateTime(); fetchAlerts(); fetchNews();
    setInterval(fetchWeather, 60 * 1000); setInterval(updateTime, 1000); setInterval(fetchAlerts, 10 * 1000); setInterval(fetchNews, 30 * 1000 * 10);
});