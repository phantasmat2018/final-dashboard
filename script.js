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
    const channelVideo = document.getElementById('channel-video');
    const channelStatus = document.getElementById('channel-status');
    const monitoringToggle = document.getElementById('monitoring-toggle');
    const streamSoundToggle = document.getElementById('stream-sound-toggle');
    const alertChannelSoundToggle = document.getElementById('alert-channel-sound-toggle');

    // --- ЗМІННІ СТАНУ ---
    let lastTemperature = null;
    let isKyivAlertActive = false;
    let weatherSoundEnabled = true;
    let alertSoundEnabled = true;

    // --- ЗМІННІ ДЛЯ МОНІТОРИНГУ АУДІОСИГНАЛУ ---
    let isMonitorInitialized = false; // Новий прапорець, що показує, чи ініціалізовано моніторинг
    let isMonitoringEnabled = true;
    let isStreamSoundEnabled = false;
    let isChannelAlertSoundEnabled = true;
    let silenceStartTime = null; 
    const SILENCE_TIMEOUT_MS = 60 * 1000; 
    const SILENCE_THRESHOLD = 2.0; 
    let audioContext;
    let analyser;
    let source;
    let dataArray;
    let monitoringLoopId;

    // --- АУДІО ---
    const sounds = {
        tempChange: new Audio('sounds/temp_change.mp3'),
        alertStart: new Audio('sounds/alert_start.mp3'),
        alertEnd: new Audio('sounds/alert_end.mp3'),
        channelAlert: new Audio('sounds/alert_start.mp3')
    };
    sounds.channelAlert.loop = true;

    // --- API & URL ---
    const weatherApiUrl = 'https://api.open-meteo.com/v1/forecast?latitude=50.462722&longitude=30.491602&current_weather=true';
    const alertsApiUrl = '/api/alerts'; // Відносне посилання для Vercel
    const channelStreamUrl = 'https://ext.cdn.nashnet.tv/228.0.0.15/index.m3u8';

    //============================================
    // СТАРІ БЛОКИ (без змін)
    //============================================
    async function fetchWeather() { try { const response = await fetch(weatherApiUrl); if (!response.ok) throw new Error(`Weather HTTP error! Status: ${response.status}`); const data = await response.json(); const currentTemp = Math.round(data.current_weather.temperature); temperatureEl.textContent = currentTemp; if (lastTemperature !== null && lastTemperature !== currentTemp && weatherSoundEnabled) { sounds.tempChange.play(); } lastTemperature = currentTemp; } catch (error) { console.error("Failed to fetch weather:", error); temperatureEl.textContent = 'XX'; } }
    function updateTime() { const now = new Date(); const optionsDate = { year: 'numeric', month: 'long', day: 'numeric' }; const optionsWeekday = { weekday: 'long' }; timeEl.textContent = now.toLocaleTimeString('uk-UA'); dateEl.textContent = now.toLocaleDateString('uk-UA', optionsDate); let weekday = now.toLocaleDateString('uk-UA', optionsWeekday); weekdayEl.textContent = weekday.charAt(0).toUpperCase() + weekday.slice(1); }
    async function fetchAlerts() { try { const response = await fetch(alertsApiUrl); if (!response.ok) throw new Error('Failed to fetch from API proxy'); const data = await response.json(); const allAlerts = data.alerts; const kyivAlertNow = allAlerts.some(alert => alert.location_title === 'м. Київ'); if (kyivAlertNow) { kyivStatusEl.textContent = 'м. Київ: ПОВІТРЯНА ТРИВОГА'; kyivStatusEl.className = 'alert-status status-active'; } else { kyivStatusEl.textContent = 'м. Київ: Немає тривоги'; kyivStatusEl.className = 'alert-status status-inactive'; } if (kyivAlertNow && !isKyivAlertActive) { isKyivAlertActive = true; if (alertSoundEnabled) sounds.alertStart.play(); } else if (!kyivAlertNow && isKyivAlertActive) { isKyivAlertActive = false; if (alertSoundEnabled) sounds.alertEnd.play(); } } catch (error) { console.error("Failed to load alert status:", error); kyivStatusEl.textContent = 'Помилка завантаження'; kyivStatusEl.className = 'alert-status'; } }

    //============================================
    // НОВИЙ БЛОК: МОНІТОРИНГ АУДІОСИГНАЛУ
    //============================================
    
    // Ця функція тепер запускається лише один раз після першого кліку
    function initializeAudioMonitoring() {
        if (isMonitorInitialized) return; // Захист від повторної ініціалізації
        isMonitorInitialized = true;

        console.log("Ініціалізація аудіо моніторингу...");

        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            source = audioContext.createMediaElementSource(channelVideo);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            source.connect(analyser);
            analyser.connect(audioContext.destination);
        } catch (e) {
            console.error("Web Audio API не вдалося ініціалізувати:", e);
            channelStatus.textContent = "Помилка аудіо";
            return;
        }

        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(channelStreamUrl);
            hls.attachMedia(channelVideo);
            hls.on(Hls.Events.MANIFEST_PARSED, function () {
                channelVideo.muted = !isStreamSoundEnabled;
                channelVideo.play().catch(e => console.error("Відтворення потоку заблоковано:", e));
            });
        } else if (channelVideo.canPlayType('application/vnd.apple.mpegurl')) {
            channelVideo.src = channelStreamUrl;
            channelVideo.muted = !isStreamSoundEnabled;
            channelVideo.play().catch(e => console.error("Відтворення потоку заблоковано:", e));
        }
        
        startMonitoringLoop();
    }

    function getAverageVolume(array) {
        let sum = 0;
        for (let i = 0; i < array.length; i++) {
            sum += Math.abs(array[i] - 128);
        }
        return sum / array.length;
    }

    function monitorLoop() {
        if (!isMonitoringEnabled || !analyser) {
            monitoringLoopId = requestAnimationFrame(monitorLoop);
            return;
        }

        analyser.getByteTimeDomainData(dataArray);
        const volume = getAverageVolume(dataArray);

        // Цей 'if' тепер спрацює, оскільки відео відтворюється
        if (channelVideo.paused === false && !channelVideo.seeking) {
             if (volume > SILENCE_THRESHOLD) {
                if (silenceStartTime !== null) {
                    sounds.channelAlert.pause();
                    channelStatus.textContent = 'Потік активний';
                    channelStatus.classList.remove('status-error');
                    channelStatus.classList.add('status-ok');
                }
                silenceStartTime = null;
            } else {
                if (silenceStartTime === null) {
                    silenceStartTime = Date.now();
                } else {
                    const silenceDuration = Date.now() - silenceStartTime;
                    if (silenceDuration > SILENCE_TIMEOUT_MS) {
                        channelStatus.textContent = 'ВІДСУТНІЙ ЗВУК!';
                        channelStatus.classList.add('status-error');
                        channelStatus.classList.remove('status-ok');
                        if (isChannelAlertSoundEnabled) {
                            sounds.channelAlert.play();
                        }
                    }
                }
            }
        }
        
        monitoringLoopId = requestAnimationFrame(monitorLoop);
    }

    function startMonitoringLoop() {
        if (!monitoringLoopId) {
            monitorLoop();
        }
    }

    function stopMonitoringLoop() {
        if (monitoringLoopId) {
            cancelAnimationFrame(monitoringLoopId);
            monitoringLoopId = null;
        }
    }

    // --- ОБРОБНИКИ ПОДІЙ ---
    weatherSoundToggle.addEventListener('click', () => { weatherSoundEnabled = !weatherSoundEnabled; weatherSoundToggle.textContent = weatherSoundEnabled ? '🔔 Звук: Увімкнено' : '🔕 Звук: Вимкнено'; });
    alertSoundToggle.addEventListener('click', () => { alertSoundEnabled = !alertSoundEnabled; alertSoundToggle.textContent = alertSoundEnabled ? '🔔 Тривога: Увімкнено' : '🔕 Тривога: Вимкнено'; });
    themeToggle.addEventListener('change', () => { document.body.classList.toggle('dark-theme', themeToggle.checked); });
    
    monitoringToggle.addEventListener('click', () => {
        if (!isMonitorInitialized) initializeAudioMonitoring();
        isMonitoringEnabled = !isMonitoringEnabled;
        monitoringToggle.textContent = isMonitoringEnabled ? 'Моніторинг: Увімкнено' : 'Моніторинг: Вимкнено';
        if (!isMonitoringEnabled) {
            sounds.channelAlert.pause();
            channelStatus.textContent = 'Моніторинг вимкнено';
            channelStatus.classList.remove('status-error');
            channelStatus.classList.add('status-ok');
        }
    });
    
    streamSoundToggle.addEventListener('click', () => {
        if (!isMonitorInitialized) initializeAudioMonitoring();
        isStreamSoundEnabled = !isStreamSoundEnabled;
        channelVideo.muted = !isStreamSoundEnabled;
        streamSoundToggle.textContent = isStreamSoundEnabled ? '🔊 Потік: Увімкнено' : '🔊 Потік: Вимкнено';
    });
    
    alertChannelSoundToggle.addEventListener('click', () => {
        if (!isMonitorInitialized) initializeAudioMonitoring();
        isChannelAlertSoundEnabled = !isChannelAlertSoundEnabled;
        alertChannelSoundToggle.textContent = isChannelAlertSoundEnabled ? '🔔 Сповіщення: Увімкнено' : '🔕 Сповіщення: Вимкнено';
        if (!isChannelAlertSoundEnabled) {
            sounds.channelAlert.pause();
        }
    });

    // --- ПЕРШИЙ ЗАПУСК ТА ІНТЕРВАЛИ ---
    fetchWeather();
    updateTime();
    fetchAlerts();
    
    setInterval(fetchWeather, 60 * 1000);
    setInterval(updateTime, 1000);
    setInterval(fetchAlerts, 10 * 1000);
});