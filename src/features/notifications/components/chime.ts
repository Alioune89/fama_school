"use client";

/**
 * Signal d'une notification qui arrive, application ouverte : deux notes brèves et une vibration (Android).
 * Les navigateurs ne jouent un son qu'après un geste sur la page : le premier appui prépare le son.
 */
let context: AudioContext | null = null;

export function primeChime() {
  const prime = () => {
    context ??= new AudioContext();
    void context.resume();
  };
  window.addEventListener("pointerdown", prime, { once: true });
  return () => window.removeEventListener("pointerdown", prime);
}

export function chime() {
  if ("vibrate" in navigator) navigator.vibrate([180, 80, 180]);
  const audio = context;
  if (!audio || audio.state !== "running") return;
  const now = audio.currentTime;
  [880, 1320].forEach((frequency, index) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = frequency;
    const start = now + index * 0.16;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.4);
  });
}
