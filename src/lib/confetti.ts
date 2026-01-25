import confetti from 'canvas-confetti';

/**
 * Celebration Effects Library
 * Effetti celebrativi per prenotazioni e interazioni
 */

// Confetti standard - per prenotazioni normali
export const fireCelebration = () => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ['#ff3366', '#00e5ff', '#a855f7'],
  });

  fire(0.2, {
    spread: 60,
    colors: ['#ff3366', '#00e5ff'],
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    colors: ['#a855f7', '#00e5ff'],
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    colors: ['#ff3366', '#a855f7'],
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors: ['#00e5ff', '#ff3366'],
  });
};

// Cuori volanti - per dediche
export const fireHearts = () => {
  const heartShape = confetti.shapeFromText({ text: '❤️', scalar: 2 });
  
  confetti({
    shapes: [heartShape],
    particleCount: 50,
    spread: 160,
    origin: { y: 0.6 },
    scalar: 2,
    gravity: 0.8,
    ticks: 150,
    zIndex: 9999,
  });
};

// Stelle - per achievement/badge
export const fireStars = () => {
  const starShape = confetti.shapeFromText({ text: '⭐', scalar: 2 });
  
  confetti({
    shapes: [starShape],
    particleCount: 30,
    spread: 180,
    origin: { y: 0.5 },
    scalar: 2.5,
    gravity: 0.6,
    ticks: 200,
    zIndex: 9999,
  });
};

// Cannone laterale - per effetti speciali
export const fireSideCannons = () => {
  const end = Date.now() + 500;

  const colors = ['#ff3366', '#00e5ff', '#a855f7'];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: colors,
      zIndex: 9999,
    });
    
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: colors,
      zIndex: 9999,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
};

// Pioggia di emoji - per reazioni live
export const fireEmojiRain = (emoji: string) => {
  const shape = confetti.shapeFromText({ text: emoji, scalar: 3 });
  
  confetti({
    shapes: [shape],
    particleCount: 20,
    spread: 100,
    origin: { y: 0.3 },
    scalar: 3,
    gravity: 1.2,
    ticks: 100,
    zIndex: 9999,
  });
};

// Fuochi d'artificio - per momenti speciali
export const fireFireworks = () => {
  const duration = 2000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#ff3366', '#00e5ff', '#a855f7', '#ffd700'],
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#ff3366', '#00e5ff', '#a855f7', '#ffd700'],
    });
  }, 250);
};
