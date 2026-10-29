/* The page owns its controls; the campaign scene owns rendering and playback. */
(() => {
  'use strict';

  const arena = document.getElementById('arena');
  const canvas = document.getElementById('scene');
  const control = document.getElementById('playback-control');
  if (!arena || !canvas || !window.FuchsiafishScene) return;

  const scene = window.FuchsiafishScene.mount({
    canvas,
    sideSrc: 'assets/images/fuchsiafish-side.png',
    frontSrc: 'assets/images/fuchsiafish-front.png',
    onReady() {
      arena.classList.add('is-ready');
      control.hidden = false;
    },
    onError() {
      canvas.hidden = true;
      canvas.style.display = 'none';
    },
    onPlaybackChange(playing) {
      const label = playing ? 'Pause animation' : 'Play animation';
      control.classList.toggle('is-paused', !playing);
      control.setAttribute('aria-label', label);
      control.title = label;
    }
  });

  control.addEventListener('click', () => scene?.toggle());
  // A small lifecycle API lets a future application unmount this scene cleanly.
  window.fuchsiafish = scene;
})();
