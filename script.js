/* =============================================
   RICEY — Site JavaScript
   ============================================= */

// -----------------------------------------------
// TRACKS — Add or remove tracks here
// -----------------------------------------------
// Each track needs a name, a before file, and an after file.
// Put your audio files in the "audio" folder.

const TRACKS = [
    {
        name: 'Track 1',
        title: 'Glass Skin',
        artist: 'Leon Yara',
        before: 'audio/Track 1 - Before.mp3',
        after: 'audio/Track 1 - After.mp3'
    },
    {
        name: 'Track 2',
        title: 'On My Mind',
        artist: 'Leon Yara',
        before: 'audio/Track 2 - Before.mp3',
        after: 'audio/Track 2 - After.mp3'
    }
];


// -----------------------------------------------
// Audio Comparison Player
// -----------------------------------------------

(function () {
    // Only run on pages that have the player
    const playerEl = document.querySelector('.audio-player');
    if (!playerEl) return;

    const beforeAudio = new Audio();
    const afterAudio = new Audio();
    let currentVersion = 'before'; // 'before' or 'after'
    let currentTrackIndex = 0;
    let isPlaying = false;

    // DOM elements
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    const trackBtns = document.querySelectorAll('.track-btn');
    const playBtn = document.querySelector('.play-btn');
    const iconPlay = document.querySelector('.icon-play');
    const iconPause = document.querySelector('.icon-pause');
    const waveformCanvas = document.querySelector('.waveform');
    const ctx = waveformCanvas.getContext('2d');
    const timeDisplay = document.querySelector('.time-display');
    const volumeSlider = document.querySelector('.volume-slider');
    const trackInfoTitle = document.querySelector('.track-info-title');
    const trackInfoArtist = document.querySelector('.track-info-artist');

    // Waveform data cache: keyed by audio src URL
    const waveformCache = {};
    let currentPeaks = null;

    // Set initial volume
    const initialVolume = parseFloat(volumeSlider.value);
    beforeAudio.volume = initialVolume;
    afterAudio.volume = initialVolume;

    // --- Waveform helpers ---

    function resizeCanvas() {
        const rect = waveformCanvas.getBoundingClientRect();
        waveformCanvas.width = rect.width * window.devicePixelRatio;
        waveformCanvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    function extractPeaks(audioBuffer, barCount) {
        const channel = audioBuffer.getChannelData(0);
        const samplesPerBar = Math.floor(channel.length / barCount);
        const peaks = [];
        for (let i = 0; i < barCount; i++) {
            let max = 0;
            const start = i * samplesPerBar;
            for (let j = start; j < start + samplesPerBar && j < channel.length; j++) {
                const abs = Math.abs(channel[j]);
                if (abs > max) max = abs;
            }
            peaks.push(max);
        }
        return peaks;
    }

    function drawWaveform(peaks, progress) {
        const w = waveformCanvas.getBoundingClientRect().width;
        const h = waveformCanvas.getBoundingClientRect().height;
        ctx.clearRect(0, 0, w, h);

        if (!peaks || peaks.length === 0) return;

        const barWidth = 3;
        const gap = 2;
        const totalBars = peaks.length;
        const playedBars = Math.floor(progress * totalBars);
        const centerY = h / 2;

        for (let i = 0; i < totalBars; i++) {
            const x = i * (barWidth + gap);
            const barHeight = Math.max(2, peaks[i] * (h - 4));
            const y = centerY - barHeight / 2;

            ctx.fillStyle = i < playedBars
                ? '#ffffff'
                : 'rgba(255, 255, 255, 0.15)';
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, 1);
            ctx.fill();
        }
    }

    function generatePlaceholderPeaks(barCount) {
        // Deterministic waveform shape that looks natural
        const peaks = [];
        for (let i = 0; i < barCount; i++) {
            const t = i / barCount;
            // Combine sine waves for a music-like envelope
            const envelope = 0.3 + 0.25 * Math.sin(t * Math.PI)
                + 0.15 * Math.sin(t * 6.28 * 3)
                + 0.1 * Math.sin(t * 6.28 * 7 + 1);
            peaks.push(Math.min(1, Math.max(0.08, envelope)));
        }
        return peaks;
    }

    function fetchArrayBuffer(src) {
        // Try fetch first, fall back to XHR (better file:// support in some browsers)
        return fetch(src).then(r => r.arrayBuffer()).catch(() => {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', src, true);
                xhr.responseType = 'arraybuffer';
                xhr.onload = () => resolve(xhr.response);
                xhr.onerror = () => reject();
                xhr.send();
            });
        });
    }

    async function decodeAndCachePeaks(src) {
        if (waveformCache[src]) return waveformCache[src];

        const rect = waveformCanvas.getBoundingClientRect();
        const barCount = Math.floor(rect.width / 5); // barWidth(3) + gap(2)

        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await fetchArrayBuffer(src);
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            audioCtx.close();

            const peaks = extractPeaks(audioBuffer, barCount);
            waveformCache[src] = peaks;
            return peaks;
        } catch {
            // Fallback: show a placeholder waveform so the player is still usable
            const peaks = generatePlaceholderPeaks(barCount);
            waveformCache[src] = peaks;
            return peaks;
        }
    }

    async function loadWaveform() {
        resizeCanvas();
        const src = currentVersion === 'before'
            ? TRACKS[currentTrackIndex].before
            : TRACKS[currentTrackIndex].after;
        const peaks = await decodeAndCachePeaks(src);
        currentPeaks = peaks;
        drawWaveform(peaks, 0);
    }

    // --- Core player functions ---

    function loadTrack(index) {
        // Stop current playback
        beforeAudio.pause();
        afterAudio.pause();
        isPlaying = false;
        setPlayIcon(false);

        // Load new track
        currentTrackIndex = index;
        beforeAudio.src = TRACKS[index].before;
        afterAudio.src = TRACKS[index].after;
        beforeAudio.preload = 'metadata';
        afterAudio.preload = 'metadata';

        // Reset display
        timeDisplay.textContent = '0:00 / 0:00';

        // Update active track button
        trackBtns.forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });

        // Update track info box
        if (trackInfoTitle) trackInfoTitle.textContent = TRACKS[index].title || '';
        if (trackInfoArtist) trackInfoArtist.textContent = TRACKS[index].artist || '';

        // Load and draw waveform
        loadWaveform();
    }

    // Load the first track
    loadTrack(0);

    // Silence load errors (handled on play)
    beforeAudio.addEventListener('error', () => {});
    afterAudio.addEventListener('error', () => {});

    function getActiveAudio() {
        return currentVersion === 'before' ? beforeAudio : afterAudio;
    }

    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function updateTimeDisplay() {
        const audio = getActiveAudio();
        const current = formatTime(audio.currentTime);
        const duration = formatTime(audio.duration);
        timeDisplay.textContent = `${current} / ${duration}`;
    }

    function updateProgress() {
        const audio = getActiveAudio();
        let progress = 0;
        if (audio.duration) {
            progress = audio.currentTime / audio.duration;
        }
        drawWaveform(currentPeaks, progress);
        updateTimeDisplay();
    }

    function setPlayIcon(playing) {
        iconPlay.style.display = playing ? 'none' : 'block';
        iconPause.style.display = playing ? 'block' : 'none';
    }

    // Track selector buttons
    trackBtns.forEach((btn, i) => {
        btn.addEventListener('click', () => {
            if (i === currentTrackIndex) return;
            loadTrack(i);
        });
    });

    // Toggle between before/after
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const version = btn.dataset.track;
            if (version === currentVersion) return;

            const currentTime = getActiveAudio().currentTime;
            const wasPlaying = isPlaying;

            getActiveAudio().pause();

            currentVersion = version;
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            getActiveAudio().currentTime = currentTime;
            if (wasPlaying) {
                getActiveAudio().play().catch(() => {});
            }

            // Redraw waveform for the new version
            loadWaveform().then(() => {
                updateProgress();
            });
        });
    });

    // Play / Pause
    playBtn.addEventListener('click', () => {
        const audio = getActiveAudio();

        if (isPlaying) {
            audio.pause();
            isPlaying = false;
            setPlayIcon(false);
        } else {
            audio.play().then(() => {
                isPlaying = true;
                setPlayIcon(true);
            }).catch(() => {
                alert(
                    'Could not play audio.\n\n' +
                    'Make sure your audio files are in the "audio" folder with the correct names.'
                );
            });
        }
    });

    // Waveform click to seek
    waveformCanvas.addEventListener('click', (e) => {
        const audio = getActiveAudio();
        if (!audio.duration) return;

        const rect = waveformCanvas.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        const newTime = pct * audio.duration;

        beforeAudio.currentTime = newTime;
        afterAudio.currentTime = newTime;
        updateProgress();
    });

    // Update progress during playback
    beforeAudio.addEventListener('timeupdate', () => {
        if (currentVersion === 'before') updateProgress();
    });

    afterAudio.addEventListener('timeupdate', () => {
        if (currentVersion === 'after') updateProgress();
    });

    // Reset when track ends
    const onEnded = () => {
        isPlaying = false;
        setPlayIcon(false);
        beforeAudio.currentTime = 0;
        afterAudio.currentTime = 0;
        drawWaveform(currentPeaks, 0);
        updateTimeDisplay();
    };

    beforeAudio.addEventListener('ended', onEnded);
    afterAudio.addEventListener('ended', onEnded);

    // Volume slider
    volumeSlider.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value);
        beforeAudio.volume = vol;
        afterAudio.volume = vol;
    });

    // Redraw waveform on window resize
    window.addEventListener('resize', () => {
        // Invalidate cache since bar count depends on width
        Object.keys(waveformCache).forEach(key => delete waveformCache[key]);
        loadWaveform().then(() => updateProgress());
    });
})();


// -----------------------------------------------
// Page Transitions (fade in / fade out)
// -----------------------------------------------

(function () {
    // Fade in on load
    document.addEventListener('DOMContentLoaded', () => {
        document.body.classList.add('loaded');
    });

    // Fade out on internal link click
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        // Skip external links, new tabs, mailto, tel, anchors, and javascript:
        if (link.target === '_blank' ||
            link.origin !== window.location.origin ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:') ||
            href.startsWith('#') ||
            href.startsWith('javascript:')) return;

        e.preventDefault();
        document.body.classList.remove('loaded');
        setTimeout(() => {
            window.location.href = href;
        }, 300);
    });
})();


// -----------------------------------------------
// Mobile Navigation Toggle
// -----------------------------------------------

(function () {
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');

    if (toggle && links) {
        toggle.addEventListener('click', () => {
            links.classList.toggle('open');
        });

        links.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                links.classList.remove('open');
            });
        });
    }
})();
