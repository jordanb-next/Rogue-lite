export class AudioEngine {
  ctx: AudioContext | null = null;
  isPlaying = false;
  nextNoteTime = 0;
  current16thNote = 0;
  tempo = 140;
  lookahead = 25.0;
  scheduleAheadTime = 0.1;
  timerID: number | null = null;
  
  masterGain: GainNode | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3; // Master volume
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  play() {
    this.init();
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.current16thNote = 0;
    this.nextNoteTime = this.ctx!.currentTime + 0.05;
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerID !== null) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
    if (this.ctx) {
      this.ctx.suspend();
    }
  }

  scheduler = () => {
    while (this.nextNoteTime < this.ctx!.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.current16thNote, this.nextNoteTime);
      this.nextNote();
    }
    if (this.isPlaying) {
      this.timerID = window.setTimeout(this.scheduler, this.lookahead);
    }
  }

  nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat;
    this.current16thNote++;
    if (this.current16thNote === 32) { // 2 bar loop
      this.current16thNote = 0;
    }
  }

  scheduleNote(step: number, time: number) {
    if (!this.ctx || !this.masterGain) return;
    
    // Four-on-the-floor Kick
    if (step % 4 === 0) {
      this.playKick(time);
    }
    
    // Off-beat Hi-hat
    if (step % 4 === 2) {
      this.playHihat(time);
    }
    
    // Snare on 2 and 4
    if (step % 8 === 4) {
      this.playSnare(time);
    }
    
    // Driving Bassline (16th notes)
    const root = 36; // C2
    const bassPattern = [
      root, root, root+12, root, root, root+12, root, root,
      root+3, root+3, root+15, root+3, root+3, root+15, root+3, root+3,
      root+5, root+5, root+17, root+5, root+5, root+17, root+5, root+5,
      root+7, root+7, root+19, root+7, root+7, root+19, root+7, root+7
    ];
    this.playBass(this.midiToFreq(bassPattern[step]), time);
    
    // Arp (8th notes)
    if (step % 2 === 0) {
      const arpPattern = [
        root+24, root+27, root+31, root+36,
        root+24, root+27, root+31, root+36,
        root+27, root+31, root+36, root+39,
        root+27, root+31, root+36, root+39
      ];
      this.playArp(this.midiToFreq(arpPattern[step/2]), time);
    }
  }

  midiToFreq(m: number) {
    return Math.pow(2, (m - 69) / 12) * 440;
  }

  playKick(time: number) {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    
    osc.start(time);
    osc.stop(time + 0.5);
  }

  playSnare(time: number) {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    const filter = this.ctx!.createBiquadFilter();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, time);
    
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    
    osc.start(time);
    osc.stop(time + 0.2);
  }

  playHihat(time: number) {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    const filter = this.ctx!.createBiquadFilter();
    
    osc.type = 'square';
    osc.frequency.value = 500;
    
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    
    osc.start(time);
    osc.stop(time + 0.05);
  }

  playBass(freq: number, time: number) {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    const filter = this.ctx!.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.1);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.linearRampToValueAtTime(0.01, time + 0.15);
    
    osc.start(time);
    osc.stop(time + 0.15);
  }
  
  playArp(freq: number, time: number) {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    const filter = this.ctx!.createBiquadFilter();
    
    osc.type = 'square';
    osc.frequency.value = freq;
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, time);
    filter.frequency.exponentialRampToValueAtTime(500, time + 0.1);
    
    osc.connect(filter);
    filter.connect(gain);
    
    // Add a simple delay
    const delay = this.ctx!.createDelay();
    delay.delayTime.value = 0.15;
    const delayGain = this.ctx!.createGain();
    delayGain.gain.value = 0.3;
    
    gain.connect(this.masterGain!);
    gain.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(this.masterGain!);
    delayGain.connect(delay); // feedback loop
    
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    
    osc.start(time);
    osc.stop(time + 0.1);
  }

  playShootSound() {
    if (!this.ctx || !this.masterGain) return;
    const time = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    
    osc.start(time);
    osc.stop(time + 0.1);
  }

  playExplosionSound() {
    if (!this.ctx || !this.masterGain) return;
    const time = this.ctx.currentTime;
    
    // Create noise buffer
    const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.5);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    noise.start(time);
  }
}
