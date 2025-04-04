/**
 * Cette fonction crée dynamiquement un son de notification
 * et le convertit en base64 pour l'utiliser sans fichier externe
 */
export function generateNotificationSound() {
  // Création d'un contexte audio
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Durée totale du son en secondes
  const duration = 0.3;
  
  // Création d'un nœud de gain pour contrôler le volume
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.5; // Volume à 50%
  
  // Création d'un oscillateur (générateur de son)
  const oscillator = audioContext.createOscillator();
  oscillator.type = 'sine'; // Type de son (sine, square, sawtooth, triangle)
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // La note A5
  oscillator.frequency.exponentialRampToValueAtTime(
    1760, // La note A6 (une octave plus haute)
    audioContext.currentTime + duration * 0.5
  );
  
  // Enveloppe du son (ADSR: Attack, Decay, Sustain, Release)
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.7, audioContext.currentTime + 0.05); // Attack
  gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.1); // Decay
  gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + duration * 0.8); // Sustain
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration); // Release
  
  // Connexion des nœuds
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Démarrage et arrêt de l'oscillateur
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
  
  // Exportation du son en base64
  return new Promise((resolve) => {
    const offlineAudioContext = new OfflineAudioContext(
      1, // Mono
      audioContext.sampleRate * duration,
      audioContext.sampleRate
    );
    
    const offlineGainNode = offlineAudioContext.createGain();
    offlineGainNode.gain.value = 0.5;
    
    const offlineOscillator = offlineAudioContext.createOscillator();
    offlineOscillator.type = 'sine';
    offlineOscillator.frequency.setValueAtTime(880, 0);
    offlineOscillator.frequency.exponentialRampToValueAtTime(1760, duration * 0.5);
    
    offlineGainNode.gain.setValueAtTime(0, 0);
    offlineGainNode.gain.linearRampToValueAtTime(0.7, 0.05);
    offlineGainNode.gain.linearRampToValueAtTime(0.5, 0.1);
    offlineGainNode.gain.linearRampToValueAtTime(0.5, duration * 0.8);
    offlineGainNode.gain.linearRampToValueAtTime(0, duration);
    
    offlineOscillator.connect(offlineGainNode);
    offlineGainNode.connect(offlineAudioContext.destination);
    
    offlineOscillator.start(0);
    offlineOscillator.stop(duration);
    
    offlineAudioContext.startRendering().then((renderedBuffer) => {
      const audioElement = new Audio();
      const audioData = exportWAV(renderedBuffer);
      const blob = new Blob([audioData], { type: 'audio/wav' });
      
      const reader = new FileReader();
      reader.onload = (event) => {
        audioElement.src = event.target.result;
        resolve(audioElement);
      };
      reader.readAsDataURL(blob);
    });
  });
}

/**
 * Convertit un AudioBuffer en un WAV
 * @param {AudioBuffer} audioBuffer - Le buffer audio à convertir
 * @returns {ArrayBuffer} - Les données WAV
 */
function exportWAV(audioBuffer) {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  
  // Préparation des données audio
  const buffers = [];
  for (let channel = 0; channel < numberOfChannels; channel++) {
    buffers.push(audioBuffer.getChannelData(channel));
  }
  
  // Entête WAV
  const wavBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
  const view = new DataView(wavBuffer);
  
  // "RIFF" en ASCII
  view.setUint8(0, 'R'.charCodeAt(0));
  view.setUint8(1, 'I'.charCodeAt(0));
  view.setUint8(2, 'F'.charCodeAt(0));
  view.setUint8(3, 'F'.charCodeAt(0));
  
  // Taille du fichier - 8
  view.setUint32(4, 36 + length * numberOfChannels * 2, true);
  
  // "WAVE" en ASCII
  view.setUint8(8, 'W'.charCodeAt(0));
  view.setUint8(9, 'A'.charCodeAt(0));
  view.setUint8(10, 'V'.charCodeAt(0));
  view.setUint8(11, 'E'.charCodeAt(0));
  
  // "fmt " en ASCII
  view.setUint8(12, 'f'.charCodeAt(0));
  view.setUint8(13, 'm'.charCodeAt(0));
  view.setUint8(14, 't'.charCodeAt(0));
  view.setUint8(15, ' '.charCodeAt(0));
  
  // Taille du bloc "fmt "
  view.setUint32(16, 16, true);
  
  // Format audio (1 = PCM)
  view.setUint16(20, 1, true);
  
  // Nombre de canaux
  view.setUint16(22, numberOfChannels, true);
  
  // Fréquence d'échantillonnage
  view.setUint32(24, sampleRate, true);
  
  // Débit binaire (octets par seconde)
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  
  // Alignement des blocs
  view.setUint16(32, numberOfChannels * 2, true);
  
  // Bits par échantillon
  view.setUint16(34, 16, true);
  
  // "data" en ASCII
  view.setUint8(36, 'd'.charCodeAt(0));
  view.setUint8(37, 'a'.charCodeAt(0));
  view.setUint8(38, 't'.charCodeAt(0));
  view.setUint8(39, 'a'.charCodeAt(0));
  
  // Taille des données audio
  view.setUint32(40, length * numberOfChannels * 2, true);
  
  // Écriture des données audio
  const dataOffset = 44;
  let offset = dataOffset;
  
  // Pour un fichier mono
  if (numberOfChannels === 1) {
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, buffers[0][i]));
      const sampleValue = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, sampleValue, true);
      offset += 2;
    }
  } 
  // Pour un fichier stéréo
  else if (numberOfChannels === 2) {
    for (let i = 0; i < length; i++) {
      // Canal gauche
      const leftSample = Math.max(-1, Math.min(1, buffers[0][i]));
      const leftSampleValue = leftSample < 0 ? leftSample * 0x8000 : leftSample * 0x7FFF;
      view.setInt16(offset, leftSampleValue, true);
      offset += 2;
      
      // Canal droit
      const rightSample = Math.max(-1, Math.min(1, buffers[1][i]));
      const rightSampleValue = rightSample < 0 ? rightSample * 0x8000 : rightSample * 0x7FFF;
      view.setInt16(offset, rightSampleValue, true);
      offset += 2;
    }
  }
  
  return wavBuffer;
} 