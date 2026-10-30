/* Initialize the campaign scene and its loading state. */
(() => {
  'use strict';

  const arena = document.getElementById('arena');
  const canvas = document.getElementById('scene');
  if (!arena || !canvas || !window.FuchsiafishScene) return;

  const scene = window.FuchsiafishScene.mount({
    canvas,
    stage: arena,
    heading: document.getElementById('campaign-title'),
    dumbphone: document.querySelector('.partner-phone'),
    sideSrc: 'assets/images/fuchsiafish-side.png',
    frontSrc: 'assets/images/fuchsiafish-front.png',
    turnSrc: 'assets/images/fuchsiafish-turn-smooth.webp',
    turnAtlas: window.FuchsiafishTurnAtlas,
    photoSrcs: [
      'assets/images/phone-photos/birthday.webp',
      'assets/images/phone-photos/hafezieh-selfie.webp'
    ],
    profilePhotoSrcs: [
      'assets/images/instagram/cologne.webp',
      'assets/images/instagram/friends.webp',
      'assets/images/instagram/food.webp',
      'assets/images/instagram/travel.webp',
      'assets/images/instagram/cafe.webp',
      'assets/images/instagram/seaside.webp'
    ],
    onReady() {
      arena.classList.add('is-ready');
    },
    onError() {
      canvas.hidden = true;
      canvas.style.display = 'none';
    }
  });

  // A small lifecycle API lets a future application unmount this scene cleanly.
  window.fuchsiafish = scene;
})();
