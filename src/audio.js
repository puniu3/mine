/**
 * 2D Minecraft Clone - Audio Module
 * Sound Engine (Web Audio API)
 * Updated with Generative Ambient Music
 */

export class SoundManager {
    constructor() {
        this.ctx = null;
        this.ready = false;

        // Music specific properties
        this.reverbNode = null;
        this.isMusicPlaying = false;
        this.nextNoteTimeout = null;
        this.musicGainNode = null;
        this._isResuming = false; // Prevents multiple resume operations

        // C Major Pentatonic Scale (C, D, E, G, A) across varied octaves
        this.scale = [
            196.00, 220.00, 246.94, // G3, A3, B3
            261.63, 293.66, 329.63, 392.00, 440.00, // C4 - A4
            523.25, 587.33, 659.25, 783.99, 880.00  // C5 - A5
        ];
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.ready = true;

            // Setup master gain for music to keep it subtle behind SFX
            this.musicGainNode = this.ctx.createGain();
            this.musicGainNode.gain.value = 0.1; // 40% volume for music
            this.musicGainNode.connect(this.ctx.destination);

            // Initialize Reverb and Start Music
            this.setupReverb().then(() => {
                this.startMusic();
            });
        }
        
        // Ensure context is running (needed if init is called after user interaction)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Resume audio context after suspension (e.g., app switch on iOS/iPadOS PWA).
     * Handles multiple states: suspended, interrupted, and closed.
     * Stops and restarts music cleanly to avoid overlapping sounds.
     */
    resume() {
        if (!this.ctx) return;

        const state = this.ctx.state;

        // If AudioContext is closed (can happen after long background on iOS), recreate it
        if (state === 'closed') {
            this._recreateContext();
            return;
        }

        // Already running, no action needed
        if (state === 'running') return;

        // Prevent multiple simultaneous resume operations
        if (this._isResuming) return;

        // iOS/iPadOS can put AudioContext into 'interrupted' state when PWA goes to background
        if (state === 'suspended' || state === 'interrupted') {
            this._isResuming = true;

            // Stop current music scheduling to prevent overlap
            const wasMusicPlaying = this.isMusicPlaying;
            this.stopMusic();

            this.ctx.resume().then(() => {
                this._isResuming = false;
                // Restart music cleanly after a short delay for natural UX
                if (wasMusicPlaying) {
                    setTimeout(() => {
                        this.startMusic();
                    }, 500);
                }
            }).catch(() => {
                this._isResuming = false;
                // Resume failed - might need user interaction, will retry on next touch/click
            });
        }
    }

    /**
     * Recreate AudioContext after it was closed.
     * Used for iOS/iPadOS PWA recovery after app switching.
     */
    _recreateContext() {
        const wasMusicPlaying = this.isMusicPlaying;

        // Stop existing music scheduling
        if (this.nextNoteTimeout) {
            clearTimeout(this.nextNoteTimeout);
            this.nextNoteTimeout = null;
        }

        // Reset state
        this.ctx = null;
        this.ready = false;
        this.reverbNode = null;
        this.musicGainNode = null;
        this.isMusicPlaying = false;
        this._isResuming = false;

        // Recreate context
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.ready = true;

        // Setup master gain for music
        this.musicGainNode = this.ctx.createGain();
        this.musicGainNode.gain.value = 0.1;
        this.musicGainNode.connect(this.ctx.destination);

        // Re-initialize reverb and restart music if it was playing
        this.setupReverb().then(() => {
            if (wasMusicPlaying) {
                this.startMusic();
            }
        });
    }

    /**
     * Generates a synthetic impulse response for reverb.
     * Creates a "large space" feel without loading external assets.
     */
    async setupReverb() {
        if (!this.ctx) return;

        const sampleRate = this.ctx.sampleRate;
        const length = sampleRate * 3; // 3 seconds tail
        const impulse = this.ctx.createBuffer(2, length, sampleRate);
        const leftChannel = impulse.getChannelData(0);
        const rightChannel = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            const decay = Math.pow(1 - i / length, 2);
            leftChannel[i] = (Math.random() * 2 - 1) * decay;
            rightChannel[i] = (Math.random() * 2 - 1) * decay;
        }

        this.reverbNode = this.ctx.createConvolver();
        this.reverbNode.buffer = impulse;
        
        // Connect reverb to music master gain
        this.reverbNode.connect(this.musicGainNode);
    }

    startMusic() {
        if (this.isMusicPlaying || !this.ready) return;
        this.isMusicPlaying = true;
        this.scheduleNextNote();
    }

    stopMusic() {
        this.isMusicPlaying = false;
        if (this.nextNoteTimeout) {
            clearTimeout(this.nextNoteTimeout);
        }
    }

    toggleMusic() {
        if (this.isMusicPlaying) {
            this.stopMusic();
        } else {
            this.startMusic();
        }
    }

    scheduleNextNote() {
        if (!this.isMusicPlaying) return;

        this.playAmbientNote();

        // Random delay between 2s and 7s
        const delay = 2000 + Math.random() * 5000;
        this.nextNoteTimeout = setTimeout(() => this.scheduleNextNote(), delay);
    }

    playAmbientNote() {
        if (!this.ready || !this.reverbNode) return;

        const freq = this.scale[Math.floor(Math.random() * this.scale.length)];
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();

        osc.type = Math.random() > 0.5 ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        panner.pan.value = Math.random() * 2 - 1;

        // Signal Path: Osc -> Gain -> Panner -> (Split to Reverb & Dry)
        osc.connect(gainNode);
        gainNode.connect(panner);

        // Connect to Music Master Gain (Dry signal)
        panner.connect(this.musicGainNode);
        // Connect to Reverb (Wet signal)
        panner.connect(this.reverbNode);

        const now = this.ctx.currentTime;
        const attack = 0.5 + Math.random() * 1.5;
        const duration = 2.0 + Math.random() * 2.0;
        const release = 3.0 + Math.random() * 2.0;

        gainNode.gain.setValueAtTime(0, now);
        // Fade in to random low volume
        gainNode.gain.linearRampToValueAtTime(0.1 + Math.random() * 0.1, now + attack);
        // Fade out
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + attack + duration + release);

        osc.start(now);
        osc.stop(now + attack + duration + release + 1);
    }

    // --- Existing SFX Methods ---

    playJump() {
        if (!this.ready) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playBigJump() {
        if (!this.ready) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, this.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    playDig(type) {
        if (!this.ready) return;
        const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        if (type === 'stone') {
            filter.type = 'highpass';
            filter.frequency.value = 800;
        } else if (type === 'wood') {
            filter.type = 'lowpass';
            filter.frequency.value = 600;
        } else {
            filter.type = 'lowpass';
            filter.frequency.value = 300;
        }
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        noise.start();
    }

    playPop() {
        if (!this.ready) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }
    
    playExplosion() {
        if (!this.ready) return;

        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.4);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

        noise.start();
    }

    playCoin() {
        if (!this.ready) return;

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'square';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(880, this.ctx.currentTime);
        osc2.frequency.setValueAtTime(1320, this.ctx.currentTime);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

        osc1.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.2);
        osc2.frequency.exponentialRampToValueAtTime(1980, this.ctx.currentTime + 0.2);

        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 0.25);
        osc2.stop(this.ctx.currentTime + 0.25);
    }
}

// Global sound manager instance
export const sounds = new SoundManager();
