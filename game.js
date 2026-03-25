/* eslint-disable no-magic-numbers */
(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayText = document.getElementById('overlayText');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const muteBtn = document.getElementById('muteBtn');
  const scoreEl = document.getElementById('score');
  const bestScoreEl = document.getElementById('bestScore');

  const width = canvas.width;
  const height = canvas.height;
  const groundHeight = 88;

  const state = {
    phase: 'idle', // idle | running | paused | over
    score: 0,
    best: Number(localStorage.getItem('flappy-best-score') || 0),
    muted: JSON.parse(localStorage.getItem('flappy-muted') || 'false'),
    time: 0,
    speed: 160,
    gravity: 980,
    jumpVelocity: -330,
    pipeGap: 160,
    pipeSpacing: 250,
    pipeWidth: 70,
    bird: {
      x: width * 0.27,
      y: height * 0.42,
      radius: 17,
      vy: 0,
      tilt: 0
    },
    pipes: [],
    clouds: Array.from({ length: 5 }, (_, i) => ({
      x: i * 130,
      y: 50 + (i % 3) * 45,
      r: 24 + (i % 2) * 12,
      speed: 10 + (i % 4)
    }))
  };

  bestScoreEl.textContent = String(state.best);
  syncMuteUi();

  const audioCtx = createAudioContext();

  function createAudioContext() {
    try {
      return new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }

  function beep(type, frequency, duration, volume) {
    if (state.muted || !audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => undefined);
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.value = volume;

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    oscillator.stop(audioCtx.currentTime + duration);
  }

  function syncMuteUi() {
    muteBtn.setAttribute('aria-pressed', String(state.muted));
    muteBtn.textContent = state.muted ? '🔇 Muted' : '🔊 Sound';
  }

  function syncPauseUi() {
    pauseBtn.setAttribute('aria-pressed', String(state.phase === 'paused'));
    pauseBtn.textContent = state.phase === 'paused' ? '▶ Resume' : '⏸ Pause';
  }

  function setOverlay(title, text, buttonLabel = 'Start Game') {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    startBtn.textContent = buttonLabel;
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  function randomPipeY() {
    const margin = 80;
    const available = height - groundHeight - margin * 2 - state.pipeGap;
    return margin + Math.random() * Math.max(available, 20);
  }

  function addPipe(xPos) {
    state.pipes.push({
      x: xPos,
      top: randomPipeY(),
      scored: false
    });
  }

  function resetGame() {
    state.phase = 'running';
    state.score = 0;
    state.time = 0;
    state.speed = 160;
    state.pipeGap = 160;
    state.bird.y = height * 0.42;
    state.bird.vy = 0;
    state.bird.tilt = 0;
    state.pipes = [];

    const firstPipeX = width + 170;
    for (let i = 0; i < 4; i += 1) {
      addPipe(firstPipeX + i * state.pipeSpacing);
    }

    scoreEl.textContent = '0';
    hideOverlay();
    syncPauseUi();
    flap(true);
  }

  function flap(fromStart = false) {
    if (state.phase === 'idle') {
      resetGame();
      return;
    }
    if (state.phase !== 'running') return;

    state.bird.vy = state.jumpVelocity;
    state.bird.tilt = -0.45;
    beep('square', fromStart ? 520 : 460, 0.08, 0.04);
  }

  function togglePause() {
    if (state.phase === 'idle' || state.phase === 'over') return;

    state.phase = state.phase === 'paused' ? 'running' : 'paused';
    syncPauseUi();

    if (state.phase === 'paused') {
      setOverlay('Paused', 'Press P or click Resume to continue.', 'Resume');
    } else {
      hideOverlay();
      beep('triangle', 320, 0.06, 0.03);
    }
  }

  function setGameOver() {
    state.phase = 'over';
    syncPauseUi();

    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem('flappy-best-score', String(state.best));
      bestScoreEl.textContent = String(state.best);
    }

    setOverlay('Game Over', `You scored ${state.score}. Press Space/Click or Start to try again.`, 'Play Again');
    beep('sawtooth', 190, 0.18, 0.05);
  }

  function collidesWithPipe(pipe) {
    const birdLeft = state.bird.x - state.bird.radius;
    const birdRight = state.bird.x + state.bird.radius;
    const birdTop = state.bird.y - state.bird.radius;
    const birdBottom = state.bird.y + state.bird.radius;

    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + state.pipeWidth;

    const hitsX = birdRight > pipeLeft && birdLeft < pipeRight;
    if (!hitsX) return false;

    const topGapEnd = pipe.top;
    const bottomGapStart = pipe.top + state.pipeGap;

    return birdTop < topGapEnd || birdBottom > bottomGapStart;
  }

  function update(delta) {
    if (state.phase !== 'running') return;

    state.time += delta;
    state.speed = Math.min(255, 160 + state.time * 2.5);
    state.pipeGap = Math.max(118, 160 - state.time * 0.4);

    state.bird.vy += state.gravity * delta;
    state.bird.y += state.bird.vy * delta;
    state.bird.tilt = Math.min(1.2, Math.max(-0.5, state.bird.vy / 420));

    if (state.bird.y + state.bird.radius >= height - groundHeight || state.bird.y - state.bird.radius <= 0) {
      setGameOver();
      return;
    }

    for (const pipe of state.pipes) {
      pipe.x -= state.speed * delta;

      if (!pipe.scored && pipe.x + state.pipeWidth < state.bird.x - state.bird.radius) {
        pipe.scored = true;
        state.score += 1;
        scoreEl.textContent = String(state.score);
        beep('triangle', 660, 0.06, 0.03);
      }

      if (collidesWithPipe(pipe)) {
        setGameOver();
        return;
      }
    }

    const lastPipe = state.pipes[state.pipes.length - 1];
    if (lastPipe && lastPipe.x < width - state.pipeSpacing) {
      addPipe(lastPipe.x + state.pipeSpacing);
    }

    state.pipes = state.pipes.filter((pipe) => pipe.x + state.pipeWidth > -5);

    for (const cloud of state.clouds) {
      cloud.x -= cloud.speed * delta;
      if (cloud.x + cloud.r * 2 < 0) cloud.x = width + Math.random() * 100;
    }
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, height - groundHeight);
    sky.addColorStop(0, '#7ecbff');
    sky.addColorStop(1, '#95e8ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height - groundHeight);

    for (const cloud of state.clouds) {
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      drawCloud(cloud.x, cloud.y, cloud.r);
    }

    ctx.fillStyle = '#77bb50';
    ctx.fillRect(0, height - groundHeight, width, groundHeight);
    ctx.fillStyle = '#5f9b3f';
    for (let x = 0; x < width; x += 24) {
      ctx.fillRect(x, height - groundHeight + 8, 14, 12);
    }
  }

  function drawCloud(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.9, y - r * 0.2, r * 0.75, 0, Math.PI * 2);
    ctx.arc(x + r * 1.65, y, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPipes() {
    for (const pipe of state.pipes) {
      const pipeX = pipe.x;
      const capH = 16;

      ctx.fillStyle = '#2f9e43';
      ctx.fillRect(pipeX, 0, state.pipeWidth, pipe.top);
      ctx.fillRect(pipeX, pipe.top + state.pipeGap, state.pipeWidth, height - pipe.top - state.pipeGap - groundHeight);

      ctx.fillStyle = '#257d35';
      ctx.fillRect(pipeX - 4, pipe.top - capH, state.pipeWidth + 8, capH);
      ctx.fillRect(pipeX - 4, pipe.top + state.pipeGap, state.pipeWidth + 8, capH);
    }
  }

  function drawBird() {
    const { x, y, radius, tilt } = state.bird;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    ctx.fillStyle = '#ffd84c';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffac2f';
    ctx.beginPath();
    ctx.ellipse(-2, 4, radius * 0.5, radius * 0.35, 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(6, -5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(8, -5, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff8b3a';
    ctx.beginPath();
    ctx.moveTo(radius - 2, 2);
    ctx.lineTo(radius + 14, 0);
    ctx.lineTo(radius - 2, -2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function draw() {
    drawBackground();
    drawPipes();
    drawBird();

    if (state.phase === 'paused') {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.fillRect(0, 0, width, height);
    }
  }

  let lastFrameTime = performance.now();
  function gameLoop(now) {
    const delta = Math.min(0.032, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    update(delta);
    draw();
    requestAnimationFrame(gameLoop);
  }

  function onPrimaryAction() {
    if (state.phase === 'paused') return;
    if (state.phase === 'over') {
      resetGame();
      return;
    }
    flap();
  }

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

    if ([' ', 'arrowup'].includes(key)) {
      event.preventDefault();
      onPrimaryAction();
      return;
    }

    if (key === 'p') {
      togglePause();
      return;
    }

    if (key === 'm') {
      state.muted = !state.muted;
      localStorage.setItem('flappy-muted', JSON.stringify(state.muted));
      syncMuteUi();
    }
  });

  canvas.addEventListener('pointerdown', () => {
    onPrimaryAction();
  });

  startBtn.addEventListener('click', () => {
    if (state.phase === 'paused') {
      togglePause();
      return;
    }
    resetGame();
  });

  pauseBtn.addEventListener('click', togglePause);

  muteBtn.addEventListener('click', () => {
    state.muted = !state.muted;
    localStorage.setItem('flappy-muted', JSON.stringify(state.muted));
    syncMuteUi();
    beep('triangle', 520, 0.04, 0.02);
  });

  setOverlay('Flappy Bird', 'Press Space, Click, or Tap to fly.', 'Start Game');
  syncPauseUi();
  requestAnimationFrame(gameLoop);
})();
