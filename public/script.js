// Change these values to tune your game.
const FISH_COUNT = 12;
const FISH_SPEED = 270; // Screen pixels per second.
const MEAL_DURATION = 6000;

const screens = [...document.querySelectorAll('.screen')];
const pond = document.querySelector('#pond');
const status = document.querySelector('#fish-status');
const homeCat = document.querySelector('#home-cat');
const mealNote = document.querySelector('#meal-note');
const feedLink = document.querySelector('#feed-link');
const sleepLink = document.querySelector('#sleep-link');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let currentScreen = 'home';
let fish = [];
let animationId = null;
let lastTime = 0;
let mealTimer = null;

// The eating animation uses your six original drawings.
const HAS_EATING_GIF = true;
// ---------- Eating and sleeping audio ----------

const eatingSound = new Audio("assets/cat-eating.mp3");
const snoringSound = new Audio("assets/cat-snoring.mp3");

eatingSound.preload = "auto";
eatingSound.volume = 0.5;
eatingSound.loop = true;

snoringSound.preload = "auto";
snoringSound.volume = 0.35;
snoringSound.loop = true;

function stopSound(audio) {
  audio.pause();
  audio.currentTime = 0;
}

function playSound(audio) {
  audio.currentTime = 0;

  audio.play().catch(error => {
    console.warn("Audio couldn't play:", audio.src, error);
  });
}
function finishMeal() {
  stopSound(eatingSound);
  clearTimeout(mealTimer);
  mealTimer = null;
  homeCat.src = 'assets/hakao-idle.gif';
  homeCat.alt = 'Hakao sitting, wagging his tail and blinking';
  mealNote.hidden = true;
  feedLink.disabled = false;
  sleepLink.disabled = false;
}

function stopFishing() {
  if (animationId !== null) cancelAnimationFrame(animationId);
  animationId = null;
  fish = [];
  pond.replaceChildren();
}

// These are real hash routes: browser Back and Forward also work.
function navigate(screen) {
  if (location.hash === `#${screen}`) renderRoute();
  else location.hash = screen;
}

function renderRoute() {
  let next = location.hash.slice(1) || 'home';
  if (!['home', 'fishing', 'won', 'sleep'].includes(next)) next = 'home';

  stopFishing();
  finishMeal();
  currentScreen = next;
  if (next !== "sleep") {
  stopSound(snoringSound);
}

  for (const screen of screens) screen.hidden = screen.id !== next;
  document.body.style.background = next === 'sleep' ? '#345e6e' : '#b6ddec';
  document.querySelector(`#${next} h1`).focus({ preventScroll: true });

  if (next === 'fishing') startFishing();
}

document.querySelector('#feed-link').addEventListener('click', () => navigate('fishing'));
document.querySelector("#sleep-link").addEventListener("click", () => {
  // Start directly inside the click event for Safari compatibility.
  playSound(snoringSound);
  navigate("sleep");
});
document.querySelector('#wake-link').addEventListener('click', () => navigate('home'));
document.querySelector('#lamp').addEventListener('click', () => navigate('home'));
document.querySelector('#leave-fishing').addEventListener('click', () => navigate('home'));

document.querySelector('#serve-fish').addEventListener('click', () => {
  // Show home first, then start the meal after the route has rendered.
  history.pushState(null, '', '#home');
  renderRoute();
  playSound(eatingSound);
  homeCat.src = HAS_EATING_GIF ? 'assets/hakao-eating.gif' : 'assets/hakao-idle.gif';
  homeCat.alt = HAS_EATING_GIF ? 'Hakao eating his fish' : 'Hakao waiting for his eating animation';
  mealNote.hidden = false;
  feedLink.disabled = true;
  sleepLink.disabled = true;
  mealTimer = setTimeout(finishMeal, MEAL_DURATION);
});

function startFishing() {
  const bounds = pond.getBoundingClientRect();
  const maxX = Math.max(0, bounds.width - 64);
  const maxY = Math.max(0, bounds.height - 64);

  for (let i = 0; i < FISH_COUNT; i++) {
    const button = document.createElement('button');
    button.className = 'fish';
    button.setAttribute('aria-label', `Catch fish ${i + 1}`);

    const image = document.createElement('img');
    image.className = 'pixel-art';
    image.alt = '';
    image.draggable = false;
    button.append(image);

    // Alternate between initially swimming right and left.
const direction = i % 2 === 0 ? 1 : -1;

// Give each fish a slightly different speed and vertical direction.
const speed = FISH_SPEED * (0.8 + Math.random() * 0.4);
const verticalSpeed = (Math.random() - 0.5) * speed;
    const item = {
      button, image,
      x: Math.random() * maxX,
      y: Math.random() * maxY,
      vx: direction * speed,
      vy: verticalSpeed,
      facing: null,
      caught: false
    };

    button.addEventListener('click', () => catchFish(item));
    // A keyboard or pointer user can hold a fish still to catch it.
    button.addEventListener('pointerenter', () => button.dataset.paused = 'true');
    button.addEventListener('pointerleave', () => delete button.dataset.paused);
    pond.append(button);
    fish.push(item);
    drawFish(item);
  }

  status.textContent = `${FISH_COUNT} fish to catch.`;
  lastTime = performance.now();
  animationId = requestAnimationFrame(moveFish);
}

function drawFish(item) {
  const facing = item.vx >= 0 ? 'right' : 'left';
  if (item.facing !== facing) {
    item.image.src = `assets/fish-${facing}.gif`;
    item.facing = facing;
  }
  item.button.style.transform = `translate(${item.x}px, ${item.y}px)`;
}

function moveFish(now) {
  if (currentScreen !== 'fishing') return;
  // Clamp elapsed time so returning to a background tab doesn't teleport fish.
  const elapsed = Math.min((now - lastTime) / 1000, 0.04);
  lastTime = now;
  const maxX = Math.max(0, pond.clientWidth - 64);
  const maxY = Math.max(0, pond.clientHeight - 64);

  for (const item of fish) {
    if (item.caught) continue;
    const paused = item.button.dataset.paused || item.button === document.activeElement;
    if (!paused && !reducedMotion.matches) {
      item.x += item.vx * elapsed;
      item.y += item.vy * elapsed;
    }

    if (item.x < 0) item.vx = Math.abs(item.vx);
    if (item.x > maxX) item.vx = -Math.abs(item.vx);
    if (item.y < 0) item.vy = Math.abs(item.vy);
    if (item.y > maxY) item.vy = -Math.abs(item.vy);
    item.x = Math.max(0, Math.min(maxX, item.x));
    item.y = Math.max(0, Math.min(maxY, item.y));
    drawFish(item);
  }
  animationId = requestAnimationFrame(moveFish);
}

function catchFish(item) {
  if (item.caught || currentScreen !== "fishing") return;

  item.caught = true;
  playBubblePop();

  const wasFocused = item.button === document.activeElement;

  showCatchBubbles(item.x, item.y);
  item.button.remove();

  const remaining = fish.filter(f => !f.caught);

  status.textContent = remaining.length
    ? `${remaining.length} fish left.`
    : "You caught all the fish!";

  if (remaining.length === 0) {
    // Let the final fish's bubbles appear before showing the win page.
    setTimeout(() => {
      if (
        currentScreen === "fishing" &&
        fish.includes(item) &&
        fish.every(f => f.caught)
      ) {
        navigate("won");
      }
    }, 250);
  } else if (wasFocused) {
    remaining[0].button.focus();
  }
}

window.addEventListener('hashchange', renderRoute);
window.addEventListener('popstate', () => {
  // Hash changes already trigger renderRoute; same-hash history entries don't.
  if ((location.hash.slice(1) || 'home') === currentScreen) return;
  renderRoute();
});
renderRoute();

// ---------- Sounds ----------

// Browsers allow this playback because the visitor clicks Hakao.
const meowSound = new Audio("assets/meow.mp3");
meowSound.preload = "auto";
meowSound.volume = 0.8;

document.querySelector("#meow-button").addEventListener("click", async () => {
  try {
    meowSound.currentTime = 0;
    await meowSound.play();
  } catch (error) {
    console.error("Meow playback failed:", error);

    alert(
      `Couldn't play Hakao's meow.\n\n` +
      `${error.name}: ${error.message}`
    );
  }
});

// Create the sound system only after a fish is clicked.
let soundContext;

function playBubblePop() {
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) return;

  soundContext ??= new AudioContextClass();

  if (soundContext.state === "suspended") {
    soundContext.resume().catch(() => {});
  }

  const now = soundContext.currentTime;
  const oscillator = soundContext.createOscillator();
  const volume = soundContext.createGain();

  // A short falling pitch creates a soft "bloop".
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(850, now);
  oscillator.frequency.exponentialRampToValueAtTime(
    160,
    now + 0.12
  );

  volume.gain.setValueAtTime(0.001, now);
  volume.gain.exponentialRampToValueAtTime(0.18, now + 0.008);
  volume.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  oscillator.connect(volume);
  volume.connect(soundContext.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.16);

  oscillator.onended = () => {
    oscillator.disconnect();
    volume.disconnect();
  };
}
function showCatchBubbles(x, y) {
  const effect = document.createElement("div");
  effect.className = "catch-bubbles";
  effect.setAttribute("aria-hidden", "true");

  effect.style.left = `${x}px`;
  effect.style.top = `${y}px`;

  effect.append(
    document.createElement("span"),
    document.createElement("span")
  );

  pond.append(effect);

  // Flash briefly, without moving.
  setTimeout(() => effect.remove(), 220);
}