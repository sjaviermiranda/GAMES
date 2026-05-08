/**
 * audio.js — Manejo centralizado del audio del juego.
 */
const GameAudio = (() => {
  const bgMusic      = document.getElementById("bgMusic");
  const hitSound     = document.getElementById("hitSound");
  const levelUpSound = document.getElementById("levelUpSound");

  function playMusic() {
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
  }

  function pauseMusic() { bgMusic.pause(); }

  function playHit() {
    hitSound.currentTime = 0;
    hitSound.play().catch(() => {});
  }

  function playLevelUp() {
    levelUpSound.currentTime = 0;
    levelUpSound.play().catch(() => {});
  }

  return { playMusic, pauseMusic, playHit, playLevelUp };
})();
