let ambilightCanvas, ctx, video, animationFrameId;
let settings = {
  blur: 80,
  brightness: 1.2,
  enabled: true,
  mode: "soft" // 'soft', 'dynamic', 'cinema', 'flash'
};

// Load saved settings
chrome.storage.sync.get("settings").then(result => {
  if (result.settings) {
    settings = { ...settings, ...result.settings };
  }
});

// Listen to storage changes (when popup saves)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.settings) {
    settings = { ...settings, ...changes.settings.newValue };
  }
});

function createAmbilightCanvas() {
  ambilightCanvas = document.createElement('canvas');
  ambilightCanvas.id = 'ambilight-canvas';
  Object.assign(ambilightCanvas.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '1',
    pointerEvents: 'none',
    transition: 'opacity 1s ease-in-out',
    mixBlendMode: 'lighten'
  });
  document.body.appendChild(ambilightCanvas);
  ctx = ambilightCanvas.getContext('2d');
}

function getAverageColor(v) {
  // Sample 10 random pixels for performance
  const temp = document.createElement('canvas');
  temp.width = temp.height = 10;
  const tctx = temp.getContext('2d');
  tctx.drawImage(v, 0, 0, 10, 10);
  const data = tctx.getImageData(0, 0, 10, 10).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const pixels = data.length / 4;
  return { r: Math.round(r / pixels), g: Math.round(g / pixels), b: Math.round(b / pixels) };
}

function updateAmbilight() {
  if (!video || !ctx || !settings.enabled) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  ambilightCanvas.width = vw;
  ambilightCanvas.height = vh;

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  const aspectRatio = videoWidth / videoHeight;
  const displayVideoWidth = vh * aspectRatio;
  const margin = (vw - displayVideoWidth) / 2;

  try {
    ctx.clearRect(0, 0, vw, vh);
    ctx.filter = `blur(${settings.blur}px) brightness(${settings.brightness + 0.5})`;

    switch (settings.mode) {
      case "soft":
        // Vertical slices on left and right
        ctx.drawImage(video, 0, 0, 100, videoHeight, 0, 0, margin, vh);
        ctx.drawImage(video, videoWidth - 100, 0, 100, videoHeight, vw - margin, 0, margin, vh);
        break;

      case "dynamic":
        // Full blurred background
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight, 0, 0, vw, vh);
        break;

      case "cinema":
        // Subtle gradient based on average color
        const avg = getAverageColor(video);
        const grad = ctx.createLinearGradient(0, 0, vw, 0);
        grad.addColorStop(0, `rgba(${avg.r},${avg.g},${avg.b},0.6)`);
        grad.addColorStop(0.5, `rgba(${avg.r},${avg.g},${avg.b},0)`);
        grad.addColorStop(1, `rgba(${avg.r},${avg.g},${avg.b},0.6)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, vw, vh);
        break;

      case "flash":
        // Pulsing overlay
        const color = getAverageColor(video);
        const alpha = (Math.sin(Date.now() / 300) + 1) / 4 + 0.1; // 0.1 to 0.6
        ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;
        ctx.fillRect(0, 0, vw, vh);
        break;
    }

    ctx.filter = 'none';
  } catch (e) {
    // Ignore errors
  }

  animationFrameId = requestAnimationFrame(updateAmbilight);
}

function toggleAmbilight(enable) {
  if (enable && settings.enabled) {
    if (!ambilightCanvas) createAmbilightCanvas();
    ambilightCanvas.style.opacity = '1';
    updateAmbilight();
  } else {
    if (ambilightCanvas) ambilightCanvas.style.opacity = '0';
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  }
}

document.addEventListener('fullscreenchange', () => {
  const fullscreen = !!document.fullscreenElement;
  video = document.querySelector('video');
  toggleAmbilight(fullscreen && video);
});

// Listen for messages from popup for immediate updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "updateSettings") {
    settings = { ...settings, ...message.payload };
  }
});