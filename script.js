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

    // --- ЗМІННІ СТАНУ ---
    let lastTemperature = null;
    let isKyivAlertActive = false;
    let weatherSoundEnabled = true;
    let alertSoundEnabled = true;

    // --- АУДІО ---
    const sounds = {
        // Ми більше не використовуємо tempChange, але залишимо для структури
        // tempChange: new Audio('sounds/temp_change.mp3'),
        alertStart: new Audio('sounds/alert_start.mp3'),
        alertEnd: new Audio('sounds/alert_end.mp3')
    };
    
    // --- НАЛАШТУВАННЯ СИНТЕЗУ МОВИ ---
    let ukrainianVoice = null;
    // Функція для завантаження голосів. Вони завантажуються асинхронно.
    function loadVoices() {
        const voices = window.speechSynthesis.getVoices();
        // Шукаємо жіночий голос з українською мовою
        ukrainianVoice = voices.find(voice => voice.lang === 'uk-UA' && voice.name.includes('Female'));
        // Якщо не знайшли жіночий, беремо будь-який український
        if (!ukrainianVoice) {
            ukrainianVoice = voices.find(voice => voice.lang === 'uk-UA');
        }
    }
    // Завантажуємо голоси одразу
    loadVoices();
    // І додаємо обробник події, якщо голоси завантажаться пізніше
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }


    // --- API ---
    const weatherApiUrl = 'https://api.open-meteo.com/v1/forecast?latitude=50.462722&longitude=30.491602&current_weather=true';
    const alertsApiUrl = '/api/alerts'; 

    //============================================
    // ОЗВУЧЕННЯ ТА ІНШІ ФУНКЦІЇ
    //============================================

    // НОВА ФУНКЦІЯ ОЗВУЧЕННЯ
    function speak(text) {
        if (!weatherSoundEnabled || !window.speechSynthesis) return;

        // Зупиняємо попередні вимови, якщо вони є
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'uk-UA';
        
        // Якщо ми знайшли український голос, використовуємо його
        if (ukrainianVoice) {
            utterance.voice = ukrainianVoice;
        }
        
        utterance.rate = 1; // Швидкість мови
        utterance.pitch = 1; // Висота голосу

        window.speechSynthesis.speak(utterance);
    }

    //============================================
    // БЛОК ПОГОДИ (ОНОВЛЕНО)
    //============================================
    async function fetchWeather() {
        try {
            const response = await fetch(weatherApiUrl);
            if (!response.ok) throw new Error(`Weather HTTP error! Status: ${response.status}`);
            const data = await response.json();
            const currentTemp = Math.round(data.current_weather.temperature);
            
            temperatureEl.textContent = currentTemp;
            
            // Перевіряємо, чи змінилася температура
            if (lastTemperature !== null && lastTemperature !== currentTemp) {
                // Створюємо текст для озвучення
                const textToSpeak = `${currentTemp} градусів`;
                // Викликаємо функцію озвучення
                speak(textToSpeak);
            }
            lastTemperature = currentTemp;
        } catch (error) {
            console.error("Failed to fetch weather:", error);
            temperatureEl.textContent = 'XX';
        }
    }

    //============================================
    // ІНШІ БЛОКИ (без змін)
    //============================================
    function updateTime() {
        const now = new Date();
        const optionsDate = { year: 'numeric', month: 'long', day: 'numeric' };
        const optionsWeekday = { weekday: 'long' };
        timeEl.textContent = now.toLocaleTimeString('uk-UA');
        dateEl.textContent = now.toLocaleDateString('uk-UA', optionsDate);
        let weekday = now.toLocaleDateString('uk-UA', { weekday: 'long' });
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
    alertSoundToggle.addEventListener('click', () => {
        alertSoundEnabled = !alertSoundEnabled;
        alertSoundToggle.textContent = alertSoundEnabled ? '🔔 Тривога: Увімкнено' : '🔕 Тривога: Вимкнено';
    });
    themeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-theme', themeToggle.checked);
    });

    // --- ПЕРШИЙ ЗАПУСК ТА ІНТЕРВАЛИ ---
    fetchWeather();
    updateTime();
    fetchAlerts();
    setInterval(fetchWeather, 60 * 1000);
    setInterval(updateTime, 1000);
    setInterval(fetchAlerts, 10 * 1000);
});