document.addEventListener('DOMContentLoaded', () => {
    // --- ЕЛЕМЕНТИ DOM ---
    const temperatureEl = document.getElementById('temperature');
    const timeEl = document.getElementById('time');
    const dateEl = document.getElementById('date');
    const weekdayEl = document.getElementById('weekday');
    const themeToggle = document.getElementById('theme-toggle');
    const weatherSoundToggle = document.getElementById('weather-sound-toggle');
    const alertSoundToggle = document.getElementById('alert-sound-toggle');
    const kyivStatusEl = document.getElementById('kyiv-status');
    const footerAlertList = document.getElementById('footer-alert-list');
    const weatherNotificationTypeToggle = document.getElementById('weather-notification-type-toggle');
    const newsContentEl = document.getElementById('news-content');
    const refreshNewsBtn = document.getElementById('refresh-news-btn');

    // --- ЗМІННІ СТАНУ ---
    let lastTemperature = null;
    let isKyivAlertActive = false;
    let weatherSoundEnabled = true;
    let alertSoundEnabled = true;
    let weatherNotificationType = 'sound';

    // --- АУДІО ---
    const sounds = {
        tempChange: new Audio('sounds/temp_change.mp3'),
        alertStart: new Audio('sounds/alert_start.mp3'),
        alertEnd: new Audio('sounds/alert_end.mp3')
    };
    
    // --- НАЛАШТУВАННЯ СИНТЕЗУ МОВИ (АНГЛІЙСЬКА) ---
    let englishVoice = null;
    function loadVoices() {
        const voices = window.speechSynthesis.getVoices();
        englishVoice = voices.find(voice => voice.lang.startsWith('en-') && voice.name.includes('Female'));
        if (!englishVoice) {
            englishVoice = voices.find(voice => voice.lang.startsWith('en-'));
        }
    }
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // --- API ---
    const weatherApiUrl = 'https://api.open-meteo.com/v1/forecast?latitude=50.462722&longitude=30.491602&current_weather=true';
    const alertsApiUrl = '/api/alerts'; 
    const newsApiUrl = '/api/news';

    //============================================
    // ОЗВУЧЕННЯ ТА ІНШІ ФУНКЦІЇ
    //============================================
    function speak(text) {
        if (!weatherSoundEnabled || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        if (englishVoice) {
            utterance.voice = englishVoice;
        }
        utterance.rate = 1;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    }

    //============================================
    // БЛОК ПОГОДИ
    //============================================
    async function fetchWeather() {
        try {
            const response = await fetch(weatherApiUrl);
            if (!response.ok) throw new Error(`Weather HTTP error! Status: ${response.status}`);
            const data = await response.json();
            const currentTemp = Math.round(data.current_weather.temperature);
            
            temperatureEl.textContent = currentTemp;
            
            if (lastTemperature !== null && lastTemperature !== currentTemp && weatherSoundEnabled) {
                if (weatherNotificationType === 'voice') {
                    const textToSpeak = `${currentTemp} degrees`;
                    speak(textToSpeak);
                } else {
                    sounds.tempChange.play();
                }
            }
            lastTemperature = currentTemp;
        } catch (error) {
            console.error("Failed to fetch weather:", error);
            temperatureEl.textContent = 'XX';
        }
    }

    //============================================
    // БЛОК НОВИН
    //============================================
    async function fetchNews() {
        refreshNewsBtn.classList.add('loading');
        try {
            const response = await fetch(newsApiUrl);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            newsContentEl.innerHTML = ''; 

            data.items.forEach(item => {
                const newsLink = document.createElement('a');
                newsLink.className = 'news-item';
                newsLink.href = item.link;
                newsLink.target = '_blank';
                newsLink.rel = 'noopener noreferrer';

                const newsTitle = document.createElement('div');
                newsTitle.className = 'news-title';
                newsTitle.textContent = item.title;

                const newsSnippet = document.createElement('div');
                newsSnippet.className = 'news-snippet';
                newsSnippet.textContent = item.contentSnippet?.substring(0, 100) + '...';

                newsLink.appendChild(newsTitle);
                newsLink.appendChild(newsSnippet);
                newsContentEl.appendChild(newsLink);
            });
        } catch (error) {
            console.error("Failed to fetch news:", error);
            newsContentEl.innerHTML = '<p>Не вдалося завантажити новини.</p>';
        } finally {
            setTimeout(() => {
                refreshNewsBtn.classList.remove('loading');
            }, 500);
        }
    }

    //============================================
    // ІНШІ БЛОКИ
    //============================================
    function updateTime() {
        const now = new Date();
        const optionsDate = { year: 'numeric', month: 'long', day: 'numeric' };
        const optionsWeekday = { weekday: 'long' };
        timeEl.textContent = now.toLocaleTimeString('uk-UA');
        dateEl.textContent = now.toLocaleDateString('uk-UA', optionsDate);
        let weekday = now.toLocaleDateString('uk-UA', optionsWeekday);
        weekdayEl.textContent = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    }

    async function fetchAlerts() {
        try {
            const response = await fetch(alertsApiUrl);
            if (!response.ok) throw new Error('Failed to fetch from API proxy');
            
            const data = await response.json();
            const allAlerts = data.alerts;

            const kyivAlertNow = allAlerts.some(alert => alert.location_title === 'м. Київ');
            if (kyivAlertNow) {
                kyivStatusEl.textContent = 'м. Київ: ПОВІТРЯНА ТРИВОГА';
                kyivStatusEl.className = 'alert-status status-active';
            } else {
                kyivStatusEl.textContent = 'м. Київ: Немає тривоги';
                kyivStatusEl.className = 'alert-status status-inactive';
            }
            if (kyivAlertNow && !isKyivAlertActive) {
                isKyivAlertActive = true;
                if (alertSoundEnabled) sounds.alertStart.play();
            } else if (!kyivAlertNow && isKyivAlertActive) {
                isKyivAlertActive = false;
                if (alertSoundEnabled) sounds.alertEnd.play();
            }

            const otherRegionsAlerts = allAlerts.filter(alert => alert.location_title !== 'м. Київ');
            footerAlertList.innerHTML = ''; 

            if (otherRegionsAlerts.length > 0) {
                const locationNames = otherRegionsAlerts.map(alert => alert.location_title);
                const uniqueLocationNames = [...new Set(locationNames)];

                const title = document.createElement('h4');
                title.textContent = 'Тривога в інших областях:';
                footerAlertList.appendChild(title);

                uniqueLocationNames.forEach(locationName => {
                    const badge = document.createElement('div');
                    badge.className = 'alert-badge';
                    badge.textContent = locationName;
                    footerAlertList.appendChild(badge);
                });
                footerAlertList.style.display = 'flex';
            } else {
                footerAlertList.style.display = 'none';
            }

        } catch (error) {
            console.error("Failed to load alert status:", error);
            kyivStatusEl.textContent = 'Помилка завантаження';
            kyivStatusEl.className = 'alert-status';
            footerAlertList.innerHTML = '';
            footerAlertList.style.display = 'none';
        }
    }
    
    // --- ОБРОБНИКИ ПОДІЙ ---
    weatherSoundToggle.addEventListener('click', () => {
        weatherSoundEnabled = !weatherSoundEnabled;
        weatherSoundToggle.textContent = weatherSoundEnabled ? '🔔 Звук: Увімкнено' : '🔕 Звук: Вимкнено';
    });

    weatherNotificationTypeToggle.addEventListener('change', () => {
        if (weatherNotificationTypeToggle.checked) {
            weatherNotificationType = 'sound';
            if (weatherSoundEnabled) {
                sounds.tempChange.play();
            }
        } else {
            weatherNotificationType = 'voice';
            if (weatherSoundEnabled && lastTemperature !== null) {
                const textToSpeak = `${lastTemperature} degrees`;
                speak(textToSpeak);
            }
        }
    });

    alertSoundToggle.addEventListener('click', () => {
        alertSoundEnabled = !alertSoundEnabled;
        alertSoundToggle.textContent = alertSoundEnabled ? '🔔 Тривога: Увімкнено' : '🔕 Тривога: Вимкнено';
    });
    
    themeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-theme', themeToggle.checked);
    });

    refreshNewsBtn.addEventListener('click', fetchNews);

    // --- ПЕРШИЙ ЗАПУСК ТА ІНТЕРВАЛИ ---
    fetchWeather();
    updateTime();
    fetchAlerts();
    fetchNews();
    setInterval(fetchWeather, 60 * 1000);
    setInterval(updateTime, 1000);
    setInterval(fetchAlerts, 10 * 1000);
    setInterval(fetchNews, 15 * 60 * 1000);
});