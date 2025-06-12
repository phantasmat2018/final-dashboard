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

    // --- ЗМІННІ СТАНУ ---
    let lastTemperature = null;
    let isKyivAlertActive = false;
    let weatherSoundEnabled = true;
    let alertSoundEnabled = true;
    let weatherNotificationType = 'voice'; // 'voice' (за замовчуванням) або 'sound'

    // --- АУДІО ---
    const sounds = {
        tempChange: new Audio('sounds/temp_change.mp3'),
        alertStart: new Audio('sounds/alert_start.mp3'),
        alertEnd: new Audio('sounds/alert_end.mp3')
    };
    
    // --- НАЛАШТУВАННЯ СИНТЕЗУ МОВИ ---
    let ukrainianVoice = null;
    function loadVoices() {
        const voices = window.speechSynthesis.getVoices();
        ukrainianVoice = voices.find(voice => voice.lang === 'uk-UA' && voice.name.includes('Female'));
        if (!ukrainianVoice) {
            ukrainianVoice = voices.find(voice => voice.lang === 'uk-UA');
        }
    }
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }


    // --- API ---
    const weatherApiUrl = 'https://api.open-meteo.com/v1/forecast?latitude=50.462722&longitude=30.491602&current_weather=true';
    const alertsApiUrl = '/api/alerts'; 

    //============================================
    // ОЗВУЧЕННЯ ТА ІНШІ ФУНКЦІЇ
    //============================================
    function speak(text) {
        // Функція speak тепер перевіряє лише weatherSoundEnabled.
        // Це дозволяє викликати її для негайного відгуку.
        if (!weatherSoundEnabled || !window.speechSynthesis) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'uk-UA';
        
        if (ukrainianVoice) {
            utterance.voice = ukrainianVoice;
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
                    const textToSpeak = `${currentTemp} градусів`;
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

    // --> ОСЬ ТУТ ОСНОВНІ ЗМІНИ <--
    weatherNotificationTypeToggle.addEventListener('change', () => {
        if (weatherNotificationTypeToggle.checked) {
            // Перемкнули на режим "звук" (🎵)
            weatherNotificationType = 'sound';
            // Негайно відтворюємо звук, якщо звук загалом увімкнено
            if (weatherSoundEnabled) {
                sounds.tempChange.play();
            }
        } else {
            // Перемкнули на режим "голос" (🗣️)
            weatherNotificationType = 'voice';
            // Негайно озвучуємо поточну температуру, якщо є дані і звук увімкнено
            if (weatherSoundEnabled && lastTemperature !== null) {
                const textToSpeak = `${lastTemperature} градусів`;
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

    // --- ПЕРШИЙ ЗАПУСК ТА ІНТЕРВАЛИ ---
    fetchWeather();
    updateTime();
    fetchAlerts();
    setInterval(fetchWeather, 60 * 1000);
    setInterval(updateTime, 1000);
    setInterval(fetchAlerts, 10 * 1000);
});