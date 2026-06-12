/* =============================================
   RICEY — Site JavaScript
   ============================================= */

// -----------------------------------------------
// Page Transitions (black veil; CSS lives behind html.js)
// Kept first so a failure in any later module can never
// strand the veil. The inline <head> snippet owns adding
// body.loaded — this module only handles exits + bfcache.
// -----------------------------------------------

(function () {
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const HAS_JS_CLASS = document.documentElement.classList.contains('js');
    let exiting = false;

    // Fade out on internal link click
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        // Respect new-tab/new-window intents (modifier keys, middle click)
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

        // Skip external links, new tabs, mailto, tel, anchors, and javascript:
        if (link.target === '_blank' ||
            link.origin !== window.location.origin ||
            /^(mailto:|tel:|#|javascript:)/.test(href)) return;

        // No veil without the html.js gate (e.g. pages missing the head snippet)
        if (!HAS_JS_CLASS || REDUCED) return;

        e.preventDefault();
        if (exiting) return;
        exiting = true;
        document.body.classList.add('page-exit');
        setTimeout(() => {
            window.location.href = href;
        }, 300);
    });

    // bfcache back-button restores the page without rerunning scripts —
    // re-lift the veil and clear any in-flight exit state.
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            exiting = false;
            document.body.classList.remove('page-exit');
            document.body.classList.add('loaded');
        }
    });
})();


// -----------------------------------------------
// First-Visit Intro — the fractured-square mark
// draws itself on a black cover, once per session.
// Sits above the veil; both are black, so the
// hand-off is seamless.
// -----------------------------------------------

(function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let seen = null;
    try { seen = sessionStorage.getItem('ricey-intro'); } catch { return; }
    if (seen) return;
    // If the write fails (quota, read-only storage), skip the intro rather
    // than replaying it on every navigation.
    try { sessionStorage.setItem('ricey-intro', '1'); } catch { return; }

    const cover = document.createElement('div');
    cover.className = 'intro-mark';
    cover.setAttribute('aria-hidden', 'true');
    cover.innerHTML =
        '<svg viewBox="0 0 100 100" fill="none" stroke="#f4f1ec" stroke-linecap="square">' +
        '<rect x="3" y="3" width="94" height="94" stroke-width="1.4" pathLength="1" style="--d:0"/>' +
        '<path d="M0,65 L55,51" stroke-width="1.6" pathLength="1" style="--d:140"/>' +
        '<path d="M55,51 L99,17" stroke-width="0.8" pathLength="1" style="--d:240"/>' +
        '<path d="M2,17 L34,38" stroke-width="0.7" pathLength="1" style="--d:320"/>' +
        '<path d="M57,8 L34,38 L13,58" stroke-width="0.7" pathLength="1" style="--d:400"/>' +
        '<path d="M99,80 L68,58" stroke-width="1.0" pathLength="1" style="--d:460"/>' +
        '<path d="M84,99 L68,58" stroke-width="0.9" pathLength="1" style="--d:520"/>' +
        '<path d="M55,51 L61,71 L68,58 L55,51" stroke-width="0.6" pathLength="1" style="--d:580"/>' +
        '<path d="M61,71 L47,99" stroke-width="0.6" pathLength="1" style="--d:640"/>' +
        '</svg>';

    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        cover.classList.add('is-done');
        cover.addEventListener('transitionend', () => cover.remove(), { once: true });
        setTimeout(() => cover.remove(), 1200); // fallback if transitionend never fires
    };

    const mount = () => {
        document.body.appendChild(cover);
        setTimeout(finish, 1750);
        // The page behind the cover is interactive — yield immediately if
        // the user starts doing something.
        window.addEventListener('pointerdown', finish, { once: true });
        window.addEventListener('keydown', finish, { once: true });
    };
    if (document.body) mount();
    else document.addEventListener('DOMContentLoaded', mount);
})();


// -----------------------------------------------
// Motion Control — WCAG 2.2.2 pause for autoplaying
// motion (videos, drift, dust, ticker). Injected
// button, persisted; also reacts to live changes of
// prefers-reduced-motion.
// -----------------------------------------------

(function () {
    const KEY = 'ricey-motion';
    let off = false;
    try { off = localStorage.getItem(KEY) === 'off'; } catch {}

    const btn = document.createElement('button');
    btn.className = 'motion-toggle';
    btn.type = 'button';

    function apply(persist) {
        document.body.classList.toggle('motion-off', off);
        if (off) {
            document.querySelectorAll('video').forEach((v) => v.pause());
        }
        // Resume is delegated to each video module's ricey:motion listener —
        // they know whether their video is lit / on screen.
        btn.textContent = off ? 'Play motion' : 'Pause motion';
        btn.setAttribute('aria-pressed', String(off));
        window.dispatchEvent(new CustomEvent('ricey:motion', { detail: { off } }));
        if (persist) {
            try { localStorage.setItem(KEY, off ? 'off' : 'on'); } catch {}
        }
    }

    btn.addEventListener('click', () => {
        off = !off;
        apply(true);
    });

    // OS-level preference flipping mid-session pauses motion too
    const rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (rmq.addEventListener) {
        rmq.addEventListener('change', (e) => {
            if (e.matches && !off) { off = true; apply(false); }
        });
    }

    const mount = () => {
        document.body.appendChild(btn);
        apply(false);
    };
    if (document.body) mount();
    else document.addEventListener('DOMContentLoaded', mount);
})();


// -----------------------------------------------
// Hero Mouse Parallax (fine pointers, motion-OK)
// Writes --par-x/--par-y; the photo layer and the
// ambient video consume them via `translate`.
// -----------------------------------------------

(function () {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = document.querySelector('.stage');
    if (!target) return;

    const MAX = 8; // px — must stay inside the stage's 1.015 scale margin at the drift trough
    let tx = 0, ty = 0, x = 0, y = 0, raf = null;

    function loop() {
        x += (tx - x) * 0.06;
        y += (ty - y) * 0.06;
        target.style.setProperty('--par-x', x.toFixed(2) + 'px');
        target.style.setProperty('--par-y', y.toFixed(2) + 'px');
        raf = (Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05)
            ? requestAnimationFrame(loop) : null;
    }

    window.addEventListener('mousemove', (e) => {
        tx = -((e.clientX / window.innerWidth) - 0.5) * 2 * MAX;
        ty = -((e.clientY / window.innerHeight) - 0.5) * 2 * MAX;
        if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
})();


// -----------------------------------------------
// Scene Morph — the heart of the single-page site.
// Each fixed stage layer crossfades and settles to
// scale as its scene crosses the viewport center.
// Scroll-linked, so it scrubs in both directions.
// -----------------------------------------------

(function () {
    const sceneEls = [...document.querySelectorAll('.scene')];
    const stage = document.querySelector('.stage');
    if (!sceneEls.length || !stage) return;

    const layers = {};
    stage.querySelectorAll('.stage-layer').forEach((l) => { layers[l.dataset.scene] = l; });
    const dim = stage.querySelector('.stage-dim');
    const bgVideo = stage.querySelector('video');
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (bgVideo) bgVideo.dataset.lit = '0'; // dark until its scene scrolls in

    // Smoothed per-scene state: targets follow scroll, currents glide after
    // them — the inertia is what makes the scrub feel filmed, not stepped.
    const st = sceneEls.map((el) => ({
        el,
        layer: layers[el.id] || null,
        content: el.querySelector('.scene-content'),
        o: 0, oT: 0,        // layer opacity (current / target)
        sh: 0, shT: 0,      // content drift -1..1 (current / target)
        dir: 1
    }));

    let videoLit = false;
    let raf = null;

    function computeTargets() {
        const vh = window.innerHeight || 1;
        const vc = vh / 2;
        st.forEach((it, idx) => {
            const r = it.el.getBoundingClientRect();
            let center = r.top + r.height / 2;
            // Nothing follows the last scene — never dim it once passed
            if (idx === st.length - 1 && center < vc) center = vc;
            const signed = center - vc;
            // Center *band*: tall scenes hold while you scroll inside them
            const overflow = Math.max(0, (r.height - vh) / 2);
            const d = Math.max(0, Math.abs(signed) - overflow);
            const t = Math.max(0, 1 - d / (vh * 0.9));
            it.oT = t * t * (3 - 2 * t); // smoothstep
            it.shT = Math.max(-1, Math.min(1, signed / vh));
        });
    }

    function applyScene(it) {
        if (it.layer) {
            it.layer.style.opacity = it.o.toFixed(3);
            if (!REDUCED) {
                // Departing scenes push past the camera (up to 14%); arriving
                // ones settle down into place (7%) — a dolly, not a dissolve.
                // Blend the push amount through the smoothed drift sign so the
                // crossing never steps, even on fast wheel flings.
                const blend = Math.max(-1, Math.min(1, it.sh * 6));
                const amt = 0.105 - 0.035 * blend;
                it.layer.style.transform = 'scale(' + (1 + amt * (1 - it.o)).toFixed(4) + ')';
            }
        }
        if (it.content && !REDUCED) {
            // Content travels with the handoff and dies into it. At rest the
            // inline styles are cleared — opacity < 1 on this container would
            // create a backdrop root and kill the glass panels inside it.
            const sh = Math.abs(it.sh) < 0.001 ? 0 : it.sh;
            it.content.style.transform = sh === 0 ? '' : 'translateY(' + (sh * 70).toFixed(1) + 'px)';
            const co = Math.min(1, it.o * 1.2);
            it.content.style.opacity = co >= 0.999 ? '' : co.toFixed(3);
            // Faded scenes shouldn't be tabbable or clickable
            it.content.style.visibility = it.o < 0.02 ? 'hidden' : '';
            it.content.style.pointerEvents = it.o < 0.15 ? 'none' : '';
        }
    }

    function syncVideo() {
        if (!bgVideo) return;
        const it = st.find((x) => x.layer && x.layer.contains(bgVideo));
        if (!it) return;
        const want = it.o > 0.04;
        if (want === videoLit) return;
        videoLit = want;
        bgVideo.dataset.lit = want ? '1' : '0';
        if (!want) {
            bgVideo.pause();
        } else if (bgVideo.currentSrc &&
                   !document.hidden &&
                   !document.body.classList.contains('motion-off')) {
            bgVideo.play().then(() => bgVideo.classList.add('is-on')).catch(() => {});
        }
    }

    function tick() {
        let busy = false;
        let maxO = 0;
        const k = REDUCED ? 1 : 0.16;
        st.forEach((it) => {
            it.o += (it.oT - it.o) * k;
            it.sh += (it.shT - it.sh) * k;
            if (Math.abs(it.oT - it.o) > 0.002 || Math.abs(it.shT - it.sh) > 0.002) {
                busy = true;
            } else {
                it.o = it.oT;
                it.sh = it.shT;
            }
            applyScene(it);
            if (it.o > maxO) maxO = it.o;
        });
        // The breath between scenes: the stage dips toward black mid-handoff
        if (dim) dim.style.opacity = ((1 - maxO) * 0.45).toFixed(3);
        syncVideo();
        raf = busy ? requestAnimationFrame(tick) : null;
    }

    function kick() {
        computeTargets();
        if (!raf) raf = requestAnimationFrame(tick);
    }

    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);
    // Background-tab loads can compute against a zero-height viewport —
    // re-derive everything the moment the page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) kick();
    });

    // Initial state lands instantly — no glide on load
    computeTargets();
    st.forEach((it) => { it.o = it.oT; it.sh = it.shT; applyScene(it); });
    if (dim) dim.style.opacity = ((1 - Math.max(...st.map((x) => x.o))) * 0.45).toFixed(3);
    syncVideo();

    // Backgrounds: a layer that is lit RIGHT NOW (fragment entry via the old
    // page URLs) loads immediately; the rest load just after first paint to
    // stay off the critical path.
    const assignBg = (l) => {
        if (l.dataset.bg && !l.style.backgroundImage) {
            l.style.backgroundImage = "url('" + l.dataset.bg + "')";
        }
    };
    st.forEach((it) => { if (it.layer && it.oT > 0.01) assignBg(it.layer); });
    setTimeout(() => {
        stage.querySelectorAll('.stage-layer[data-bg]').forEach(assignBg);
    }, 350);
})();


// -----------------------------------------------
// Smooth anchor scrolling — enabled only after the
// initial fragment jump has already happened
// -----------------------------------------------

(function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setTimeout(() => {
        document.documentElement.style.scrollBehavior = 'smooth';
    }, 300);
})();


// -----------------------------------------------
// Scroll Spy — nav reflects the scene in view
// -----------------------------------------------

(function () {
    const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
    if (!links.length || !('IntersectionObserver' in window)) return;

    const map = {};
    links.forEach((a) => {
        const s = document.getElementById(a.getAttribute('href').slice(1));
        if (s) map[s.id] = a;
    });

    const spy = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            links.forEach((a) => {
                a.classList.remove('active');
                a.removeAttribute('aria-current');
            });
            const a = map[e.target.id];
            if (a && !a.classList.contains('nav-cta')) {
                a.classList.add('active');
                a.setAttribute('aria-current', 'true');
            }
        });
    }, { rootMargin: '-45% 0px -45% 0px' });

    // Observe every scene — entering an unmapped one (home) clears the highlight
    document.querySelectorAll('.scene').forEach((s) => spy.observe(s));
})();


// -----------------------------------------------
// Scene Reveals — content rises as each scene
// first scrolls into view
// -----------------------------------------------

(function () {
    const scenes = document.querySelectorAll('.scene[data-reveal]');
    if (!scenes.length) return;

    if (!('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        scenes.forEach((s) => s.classList.add('in-view'));
        return;
    }

    const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            e.target.classList.add('in-view');
            io.unobserve(e.target);
        });
    }, { threshold: 0.18 });

    scenes.forEach((s) => io.observe(s));
})();


// -----------------------------------------------
// Film Dust (desktop, motion-OK) — slow motes over
// the hero photo, dimmed by the overlay above them.
// -----------------------------------------------

(function () {
    if (!window.matchMedia('(pointer: fine) and (min-width: 769px)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Single-page stage (index) or standalone hero (404) — dust either way
    const stage = document.querySelector('.stage');
    const hero = document.querySelector('.page-hero');
    const host = stage || hero;
    const before = stage
        ? stage.querySelector('.stage-vignette')
        : hero && hero.querySelector('.page-hero-overlay');
    if (!host || !before) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'dust-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.insertBefore(canvas, before);
    const ctx = canvas.getContext('2d');

    let w = 0, h = 0, raf = null, motionOff = false;
    // Render at CSS resolution and ~30fps — motes are soft sub-2px dots,
    // a hi-DPI 60fps backing store is pure bandwidth waste.
    const DPR = 1;
    let frameToggle = false;
    const motes = [];

    function size() {
        const r = host.getBoundingClientRect();
        w = r.width; h = r.height;
        canvas.width = w * DPR;
        canvas.height = h * DPR;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function seed() {
        motes.length = 0;
        const count = Math.round(Math.min(40, w / 36));
        for (let i = 0; i < count; i++) {
            motes.push({
                x: Math.random() * 1,        // 0..1 of width
                y: Math.random() * 1,        // 0..1 of height
                r: 0.6 + Math.random() * 1.6,
                vy: 0.00004 + Math.random() * 0.00009,  // fraction of height per ms
                amp: 6 + Math.random() * 18,
                phase: Math.random() * 6.28,
                speed: 0.0002 + Math.random() * 0.0004,
                a: 0.05 + Math.random() * 0.11
            });
        }
    }

    let last = 0;
    function frame(t) {
        frameToggle = !frameToggle;
        if (frameToggle) { raf = requestAnimationFrame(frame); return; } // ~30fps
        const dt = last ? Math.min(80, t - last) : 32;
        last = t;
        ctx.clearRect(0, 0, w, h);
        for (const m of motes) {
            m.y -= m.vy * dt;
            if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
            const px = m.x * w + Math.sin(t * m.speed + m.phase) * m.amp;
            ctx.beginPath();
            ctx.arc(px, m.y * h, m.r, 0, 6.28);
            ctx.fillStyle = 'rgba(244, 241, 236, ' + m.a + ')';
            ctx.fill();
        }
        raf = requestAnimationFrame(frame);
    }

    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    // Pause dust (and the legacy drift via .is-off) when the host scrolls
    // out of view — a fixed stage never does; a 404 hero can.
    let heroVisible = true;
    const io = 'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => {
            heroVisible = entries[0].isIntersecting;
            host.classList.toggle('is-off', !heroVisible);
            (heroVisible && !document.hidden && !motionOff) ? start() : stop();
        }, { threshold: 0.05 })
        : null;

    // Start after first paint settles — keeps the rAF loop out of the
    // load/entrance window (and out of headless virtual-time traps)
    setTimeout(() => {
        size(); seed();
        if (!document.body.classList.contains('motion-off')) start();
        if (io) io.observe(host);
        window.addEventListener('resize', () => { size(); seed(); });
        document.addEventListener('visibilitychange', () => {
            (document.hidden || !heroVisible || motionOff) ? stop() : start();
        });
        window.addEventListener('ricey:motion', (e) => {
            motionOff = e.detail.off;
            (motionOff || !heroVisible || document.hidden) ? stop() : start();
        });
    }, 900);
})();


// -----------------------------------------------
// Ambient Background Video (music page, desktop)
// src assigned lazily so mobile never downloads it.
// -----------------------------------------------

(function () {
    const video = document.querySelector('.hero-bg-video');
    if (!video || !video.dataset.src) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(min-width: 769px)').matches) return;

    let motionOff = document.body && document.body.classList.contains('motion-off');

    // The morph module marks the video's layer lit/unlit via data-lit and
    // owns the play/pause that follows scroll; this module owns src
    // assignment plus the visibility/motion-preference gates.
    const lit = () => video.dataset.lit !== '0'; // default lit for the 404/standalone case
    const tryPlay = () => {
        if (motionOff || document.hidden || !lit()) return;
        video.play().then(() => video.classList.add('is-on')).catch(() => {});
    };
    video.src = video.dataset.src;
    // Heal the load-order race: if the morph already lit this layer
    // (e.g. the page loaded scrolled to #music), start now.
    tryPlay();

    document.addEventListener('visibilitychange', () => {
        document.hidden ? video.pause() : tryPlay();
    });
    window.addEventListener('ricey:motion', (e) => {
        motionOff = e.detail.off;
        motionOff ? video.pause() : tryPlay();
    });
})();


// -----------------------------------------------
// Pointer Spotlight — panels are faintly lit where
// the cursor touches them (fine pointers only).
// -----------------------------------------------

(function () {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const panels = document.querySelectorAll('.service-card, .featured-release, .audio-player, .music-card');
    panels.forEach((p) => {
        let raf = null;
        p.addEventListener('pointermove', (e) => {
            if (raf) return;
            const cx = e.clientX, cy = e.clientY;
            raf = requestAnimationFrame(() => {
                raf = null;
                const r = p.getBoundingClientRect();
                p.style.setProperty('--lx', Math.round(cx - r.left) + 'px');
                p.style.setProperty('--ly', Math.round(cy - r.top) + 'px');
            });
        });
        p.addEventListener('pointerleave', () => {
            if (raf) { cancelAnimationFrame(raf); raf = null; }
            p.style.setProperty('--lx', '-300px');
            p.style.setProperty('--ly', '-300px');
        });
    });
})();


// -----------------------------------------------
// Hero Title Letter Masks (index only)
// Splits RICEY into per-letter masked spans for the
// staggered rise. Skipped under reduced motion / no h1.
// -----------------------------------------------

(function () {
    const title = document.querySelector('.hero-title');
    if (!title) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const text = title.textContent.trim();
    title.setAttribute('aria-label', text);
    title.innerHTML = [...text].map((ch, i) =>
        `<span class="char-mask" aria-hidden="true"><span class="char" style="--i:${i}">${ch}</span></span>`
    ).join('');
})();


// -----------------------------------------------
// Featured Release Canvas Loop (music page)
// Autoplay only when motion is allowed; poster
// (the static cover) shows otherwise.
// -----------------------------------------------

(function () {
    const video = document.querySelector('.featured-release-art video');
    if (!video || !video.dataset.src) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Phones keep the static cover (poster) — no 1.6MB loop on cellular
    if (!window.matchMedia('(min-width: 769px)').matches) return;

    let motionOff = document.body && document.body.classList.contains('motion-off');
    let inView = false;
    video.src = video.dataset.src;
    const tryPlay = () => {
        if (motionOff || document.hidden || !inView) return;
        video.play().catch(() => {});
    };
    // Only loop while its card is actually on screen
    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            inView = entries[0].isIntersecting;
            inView ? tryPlay() : video.pause();
        }, { threshold: 0.1 }).observe(video);
    } else {
        inView = true;
        tryPlay();
    }
    // play() is refused in hidden/background tabs — retry when visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && video.paused) tryPlay();
    });
    window.addEventListener('ricey:motion', (e) => {
        motionOff = e.detail.off;
        motionOff ? video.pause() : tryPlay();
    });
})();


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
    const waveformCanvas = document.querySelector('.waveform');
    const ctx = waveformCanvas.getContext('2d');
    const timeDisplay = document.querySelector('.time-display');
    const volumeSlider = document.querySelector('.volume-slider');
    const trackInfoTitle = document.querySelector('.track-info-title');
    const trackInfoArtist = document.querySelector('.track-info-artist');

    // Waveform data cache: keyed by audio src URL
    const waveformCache = {};
    let currentPeaks = null;
    let hoverPct = null;     // ghost-seek preview position (0..1) or null
    // Real peak data costs a full MP3 fetch + PCM decode — don't pay it at
    // page load; arm when the player scrolls into view (or on first play).
    let audioArmed = false;
    let waveformSeq = 0;     // guards against stale async decodes
    let hoverRaf = null;     // rAF throttle for ghost-seek redraws

    // Audio-reactive glow state
    const MOTION_OK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let audioCtx = null;     // null = not built, false = failed (don't retry)
    let analyser = null;
    let freqData = null;
    let reactiveRaf = null;
    let pulseLevel = 0;

    // Keyboard access for the canvas scrubber
    waveformCanvas.setAttribute('tabindex', '0');
    waveformCanvas.setAttribute('role', 'slider');
    waveformCanvas.setAttribute('aria-label', 'Seek position');
    waveformCanvas.setAttribute('aria-valuemin', '0');
    waveformCanvas.setAttribute('aria-valuemax', '100');
    waveformCanvas.setAttribute('aria-valuenow', '0');

    // Set initial volume + slider fill
    const initialVolume = parseFloat(volumeSlider.value);
    beforeAudio.volume = initialVolume;
    afterAudio.volume = initialVolume;
    volumeSlider.style.setProperty('--vol', (initialVolume * 100) + '%');

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
        const hoverBars = hoverPct === null ? -1 : Math.floor(hoverPct * totalBars);
        const centerY = h / 2;

        for (let i = 0; i < totalBars; i++) {
            const x = i * (barWidth + gap);
            const barHeight = Math.max(2, peaks[i] * (h - 4));
            const y = centerY - barHeight / 2;

            ctx.fillStyle = i < playedBars
                ? 'rgba(255, 250, 242, ' + (0.85 + 0.15 * pulseLevel).toFixed(3) + ')'
                : i < hoverBars
                    ? 'rgba(244, 241, 236, 0.35)'
                    : 'rgba(244, 241, 236, 0.18)';
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

        // Not armed yet: placeholder shape, deliberately NOT cached so the
        // real decode happens once the player is actually in view
        if (!audioArmed) return generatePlaceholderPeaks(barCount);

        let audioCtx = null;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await fetchArrayBuffer(src);
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

            const peaks = extractPeaks(audioBuffer, barCount);
            waveformCache[src] = peaks;
            return peaks;
        } catch {
            // Fallback: show a placeholder waveform so the player is still usable
            const peaks = generatePlaceholderPeaks(barCount);
            waveformCache[src] = peaks;
            return peaks;
        } finally {
            if (audioCtx) audioCtx.close().catch(() => {});
        }
    }

    async function loadWaveform() {
        const seq = ++waveformSeq;
        resizeCanvas();
        const src = currentVersion === 'before'
            ? TRACKS[currentTrackIndex].before
            : TRACKS[currentTrackIndex].after;
        const peaks = await decodeAndCachePeaks(src);
        if (seq !== waveformSeq) return; // a newer load superseded this one
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
            btn.setAttribute('aria-pressed', String(i === index));
        });

        // Update track info box
        if (trackInfoTitle) trackInfoTitle.textContent = TRACKS[index].title || '';
        if (trackInfoArtist) trackInfoArtist.textContent = TRACKS[index].artist || '';

        // Load and draw waveform
        loadWaveform();
    }

    // Load the first track
    loadTrack(0);

    // Arm the real waveform decode when the player approaches the viewport
    function armAudio() {
        if (audioArmed) return;
        audioArmed = true;
        loadWaveform().then(() => updateProgress());
    }

    if ('IntersectionObserver' in window) {
        const armIO = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                armAudio();
                armIO.disconnect();
            }
        }, { rootMargin: '50% 0px' });
        armIO.observe(playerEl);
    } else {
        armAudio();
    }

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
        waveformCanvas.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    }

    function setPlayIcon(playing) {
        playBtn.classList.toggle('is-playing', playing);
        playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    }

    // --- Audio-reactive glow (AnalyserNode drives --pulse while playing) ---

    function initAnalyser() {
        if (audioCtx !== null) return; // built or permanently failed
        // file:// is an opaque origin: createMediaElementSource succeeds but
        // outputs silence (CORS) — never wire the graph there.
        if (window.location.protocol === 'file:') {
            audioCtx = false;
            return;
        }
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AC();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.82;
            // Both elements route through one analyser; only one plays at a time.
            audioCtx.createMediaElementSource(beforeAudio).connect(analyser);
            audioCtx.createMediaElementSource(afterAudio).connect(analyser);
            analyser.connect(audioCtx.destination);
            freqData = new Uint8Array(analyser.frequencyBinCount);
        } catch {
            if (audioCtx && audioCtx.close) audioCtx.close().catch(() => {});
            audioCtx = false; // player still works, just no glow
            analyser = null;
        }
    }

    function reactiveFrame() {
        const playing = isPlaying && !getActiveAudio().paused;
        let target = 0;
        if (playing && analyser) {
            analyser.getByteFrequencyData(freqData);
            let sum = 0;
            const N = 18; // low-mid bins: where the energy of a mix lives
            for (let i = 1; i <= N; i++) sum += freqData[i];
            target = Math.min(1, (sum / N / 255) * 1.45);
        }
        pulseLevel += (target - pulseLevel) * 0.22;
        if (!playing && pulseLevel < 0.01) {
            pulseLevel = 0;
            playerEl.style.setProperty('--pulse', '0');
            drawWaveform(currentPeaks, currentProgress());
            reactiveRaf = null;
            // No need to keep the OS audio pipeline warm for silence
            if (audioCtx && audioCtx.suspend) audioCtx.suspend().catch(() => {});
            return;
        }
        playerEl.style.setProperty('--pulse', pulseLevel.toFixed(3));
        // Only the canvas tracks the pulse per-frame; time text and
        // aria-valuenow stay on the 4Hz timeupdate handlers.
        drawWaveform(currentPeaks, currentProgress());
        reactiveRaf = requestAnimationFrame(reactiveFrame);
    }

    function currentProgress() {
        const audio = getActiveAudio();
        return audio.duration ? audio.currentTime / audio.duration : 0;
    }

    function startReactive() {
        if (!MOTION_OK || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        initAnalyser();
        if (!analyser) return;
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
        if (!reactiveRaf) reactiveRaf = requestAnimationFrame(reactiveFrame);
    }

    // Track selector buttons
    trackBtns.forEach((btn, i) => {
        btn.addEventListener('click', () => {
            if (i === currentTrackIndex) return;
            loadTrack(i);
        });
    });

    // Initial pressed states
    toggleBtns.forEach(b => b.setAttribute('aria-pressed', String(b.classList.contains('active'))));

    // Toggle between before/after
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const version = btn.dataset.track;
            if (version === currentVersion) return;

            const currentTime = getActiveAudio().currentTime;
            const wasPlaying = isPlaying;

            getActiveAudio().pause();

            currentVersion = version;
            toggleBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');

            // Slide the pill indicator
            const toggleWrap = btn.closest('.player-toggle');
            if (toggleWrap) toggleWrap.dataset.active = version;

            getActiveAudio().currentTime = currentTime;
            if (wasPlaying) {
                getActiveAudio().play().catch(() => {
                    isPlaying = false;
                    setPlayIcon(false);
                });
            }

            // Redraw waveform for the new version
            loadWaveform().then(() => {
                updateProgress();
            });
        });
    });

    // Play / Pause
    playBtn.addEventListener('click', () => {
        armAudio(); // belt-and-braces if IO never fired
        const audio = getActiveAudio();

        if (isPlaying) {
            audio.pause();
            isPlaying = false;
            setPlayIcon(false);
        } else {
            audio.play().then(() => {
                isPlaying = true;
                setPlayIcon(true);
                startReactive();
            }).catch((err) => {
                // AbortError = playback interrupted (e.g. rapid toggle) — not a missing file
                if (err && err.name === 'AbortError') return;
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

    // Ghost-seek hover preview (rAF-throttled)
    waveformCanvas.addEventListener('mousemove', (e) => {
        if (hoverRaf) return;
        const clientX = e.clientX;
        hoverRaf = requestAnimationFrame(() => {
            hoverRaf = null;
            const rect = waveformCanvas.getBoundingClientRect();
            const next = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
            if (next === hoverPct) return;
            hoverPct = next;
            updateProgress();
        });
    });

    waveformCanvas.addEventListener('mouseleave', () => {
        hoverPct = null;
        updateProgress();
    });

    // Keyboard seek on the waveform (arrow keys = ±5s, Home = start)
    waveformCanvas.addEventListener('keydown', (e) => {
        const audio = getActiveAudio();
        if (!audio.duration) return;
        let next = null;
        if (e.key === 'ArrowRight') next = Math.min(audio.duration, audio.currentTime + 5);
        else if (e.key === 'ArrowLeft') next = Math.max(0, audio.currentTime - 5);
        else if (e.key === 'Home') next = 0;
        if (next === null) return;
        e.preventDefault();
        beforeAudio.currentTime = next;
        afterAudio.currentTime = next;
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

    // Volume slider (audio + groove fill)
    volumeSlider.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value);
        beforeAudio.volume = vol;
        afterAudio.volume = vol;
        e.target.style.setProperty('--vol', (vol * 100) + '%');
    });

    // Redraw waveform on window resize (debounced — decode is expensive)
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            // Invalidate cache since bar count depends on width
            Object.keys(waveformCache).forEach(key => delete waveformCache[key]);
            loadWaveform().then(() => updateProgress());
        }, 200);
    });
})();


// -----------------------------------------------
// Mobile Navigation Toggle (hamburger morphs to X)
// -----------------------------------------------

(function () {
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');

    if (toggle && links) {
        toggle.setAttribute('aria-expanded', 'false');

        toggle.addEventListener('click', () => {
            const open = links.classList.toggle('open');
            toggle.classList.toggle('open', open);
            toggle.setAttribute('aria-expanded', String(open));
        });

        links.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                links.classList.remove('open');
                toggle.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            });
        });
    }
})();
