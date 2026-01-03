/**
 * 2D Minecraft Clone - Audio Module
 * Sound Engine (Web Audio API)
 */

export class SoundManager {
    constructor() {
        this.ctx = null;
        this.ready = false;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.ready = true;
        }
    }

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

        // Create a buffer for white noise (0.5 seconds duration)
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Fill buffer with random noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // Connect nodes: Noise -> Filter -> Gain -> Destination
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        // Configure Lowpass Filter to simulate the explosion "boom"
        // Start high for the initial crack, sweep down for the rumble
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.4);

        // Configure Gain (Volume) envelope
        // Start loud, then decay
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

        noise.start();
    }
}

// Global sound manager instance
export const sounds = new SoundManager();
