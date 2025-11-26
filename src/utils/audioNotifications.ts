// Audio notification utility for playing sounds throughout the app

class AudioNotificationManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  
  constructor() {
    this.initializeSounds();
  }

  private initializeSounds() {
    // Create notification sound (short beep)
    const notificationSound = this.createBeep(800, 0.1, 0.2);
    this.sounds.set('notification', notificationSound);

    // Create incoming call sound (ringtone)
    const incomingCallSound = this.createRingtone();
    this.sounds.set('incomingCall', incomingCallSound);

    // Create outgoing call sound (ringing)
    const outgoingCallSound = this.createRinging();
    this.sounds.set('outgoingCall', outgoingCallSound);

    // Create call end sound
    const callEndSound = this.createBeep(400, 0.15, 0.3);
    this.sounds.set('callEnd', callEndSound);

    // Create success sound
    const successSound = this.createBeep(1000, 0.1, 0.15);
    this.sounds.set('success', successSound);

    // Create error sound
    const errorSound = this.createBeep(300, 0.2, 0.3);
    this.sounds.set('error', errorSound);
  }

  private createBeep(frequency: number, duration: number, volume: number = 0.3): HTMLAudioElement {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    const audio = new Audio();
    audio.volume = volume;

    // Create a simple data URL for the beep
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    return audio;
  }

  private createRingtone(): HTMLAudioElement {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = 0.3;
    
    // Create a ringtone pattern using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const destination = audioContext.createMediaStreamDestination();
    
    return audio;
  }

  private createRinging(): HTMLAudioElement {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = 0.2;
    return audio;
  }

  play(soundName: 'notification' | 'incomingCall' | 'outgoingCall' | 'callEnd' | 'success' | 'error') {
    const sound = this.sounds.get(soundName);
    if (sound) {
      // For call sounds, use simple frequency generation
      this.playTone(soundName);
    }
  }

  private playTone(type: string) {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure based on sound type
    switch (type) {
      case 'notification':
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
        break;
      
      case 'incomingCall':
        this.playRingtone(audioContext, oscillator, gainNode);
        break;
      
      case 'outgoingCall':
        this.playRingingTone(audioContext, oscillator, gainNode);
        break;
      
      case 'callEnd':
        oscillator.frequency.value = 400;
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
      
      case 'success':
        oscillator.frequency.value = 1000;
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
        break;
      
      case 'error':
        oscillator.frequency.value = 300;
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
    }
  }

  private playRingtone(audioContext: AudioContext, oscillator: OscillatorNode, gainNode: GainNode) {
    oscillator.type = 'sine';
    oscillator.frequency.value = 440;
    gainNode.gain.value = 0.15;
    
    oscillator.start(audioContext.currentTime);
    
    // Stop after 2 seconds (one ring cycle)
    setTimeout(() => {
      try {
        oscillator.stop();
      } catch (e) {
        // Already stopped
      }
    }, 2000);
  }

  private playRingingTone(audioContext: AudioContext, oscillator: OscillatorNode, gainNode: GainNode) {
    oscillator.type = 'sine';
    oscillator.frequency.value = 480;
    gainNode.gain.value = 0.1;
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  }

  stop(soundName: string) {
    const sound = this.sounds.get(soundName);
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  }

  stopAll() {
    this.sounds.forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
  }
}

export const audioManager = new AudioNotificationManager();
