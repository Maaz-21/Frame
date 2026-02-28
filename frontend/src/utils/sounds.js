// Web Audio API notification sounds — no external files needed

const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;

function playTone(frequency, duration, type = 'sine', volume = 0.15) {
    if (!audioCtx) return;
    // Resume if suspended (autoplay policy)
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duration);
}

export function playJoinSound() {
    // Two ascending tones — friendly "hello"
    playTone(523, 0.15, 'sine', 0.12); // C5
    setTimeout(() => playTone(659, 0.2, 'sine', 0.12), 120); // E5
}

export function playLeaveSound() {
    // Two descending tones — subtle "goodbye"
    playTone(659, 0.15, 'sine', 0.1); // E5
    setTimeout(() => playTone(440, 0.2, 'sine', 0.1), 120); // A4
}

export function playMessageSound() {
    // Quick soft ping
    playTone(880, 0.08, 'sine', 0.08); // A5
    setTimeout(() => playTone(1047, 0.12, 'sine', 0.08), 60); // C6
}

export function playReactionSound() {
    // Sparkly pop
    playTone(1047, 0.06, 'sine', 0.1);
    setTimeout(() => playTone(1319, 0.08, 'sine', 0.08), 50);
    setTimeout(() => playTone(1568, 0.1, 'sine', 0.06), 100);
}

export function playHandRaiseSound() {
    // Attention chime
    playTone(784, 0.12, 'sine', 0.1); // G5
    setTimeout(() => playTone(988, 0.15, 'sine', 0.1), 100); // B5
}
