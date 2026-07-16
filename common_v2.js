function cleanUrlParameters() {
  const url = new URL(window.location.href);
  if (url.searchParams.has('openExternalBrowser') || url.searchParams.has('openInExternalBrowser')) {
    url.searchParams.delete('openExternalBrowser');
    url.searchParams.delete('openInExternalBrowser');
    window.history.replaceState({}, document.title, url.pathname);
  }
}
cleanUrlParameters();

const frameSliderEl = document.getElementById('frameSlider');
FRAME_MASTER_DATA.forEach(frame => {
  const itemDiv = document.createElement('div');
  itemDiv.className = 'frame-item';
  itemDiv.id = `item${frame.id}`;
  
  const img = document.createElement('img');
  img.src = frame.src;
  img.className = `frame-overlay ${frame.fitType}`;
  img.id = `frameImg${frame.id}`;
  img.alt = '';
  
  itemDiv.appendChild(img);
  frameSliderEl.appendChild(itemDiv);
});

// 💡 2. 下部のフレーム選択サムネイルを生成
const frameSelectorInnerEl = document.getElementById('frameSelectorInner');
FRAME_MASTER_DATA.forEach((frame, idx) => {
  const btn = document.createElement('button');
  btn.className = `frame-dot${idx === 0 ? ' active' : ''}`;
  btn.setAttribute('data-index', frame.id);
  
  const img = document.createElement('img');
  img.src = frame.src;
  img.alt = `フレーム${frame.id + 1}`;
  
  btn.appendChild(img);
  frameSelectorInnerEl.appendChild(btn);
});

// 💡 3. 下部のスタンプ選択サムネイルを生成
const stampSelectorInnerEl = document.getElementById('stampSelectorInner');
STAMP_MASTER_DATA.forEach(stamp => {
  const btn = document.createElement('button');
  btn.className = 'frame-dot stamp-thumb';
  btn.setAttribute('data-src', stamp.src);
  
  const img = document.createElement('img');
  img.src = stamp.src;
  img.alt = stamp.alt;
  
  btn.appendChild(img);
  stampSelectorInnerEl.appendChild(btn);
});

// 💡 4. 設定データの件数に合わせて件数管理用の変数を自動同期
const totalFrames = FRAME_MASTER_DATA.length;

function setAppHeight() {
  document.documentElement.style.setProperty(
    '--app-height',
    `${window.innerHeight}px`
  );
}

setAppHeight();
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', () => {
  setTimeout(setAppHeight, 300);
});

const frameDots = document.querySelectorAll('#frameSelectorInner .frame-dot');
const video = document.getElementById('cameraVideo');
const frameSlider = document.getElementById('frameSlider');

const captureBtn = document.getElementById('captureBtn');
const flipBtn = document.getElementById('flipBtn');

const preview = document.getElementById('preview');
const previewImg = document.getElementById('previewImg');
const retakeBtn = document.getElementById('retakeBtn');
const saveBtn = document.getElementById('saveBtn');
const shareBtn = document.getElementById('shareBtn');
const saveToast = document.getElementById('saveToast');
const msgToast = document.getElementById('msgToast');
const shotEffect = document.getElementById('shot-effect');

// 下部 UI 関連
const selectorContainer = document.getElementById('frameSelectorContainer');
const stampContainer = document.getElementById('stampSelectorContainer');
const frameBtn = document.getElementById('toggleSelectorBtn');
const stampBtn = document.getElementById('toggleStampBtn');
const frameArrow = document.getElementById('toggleArrow');
const stampArrow = document.getElementById('stampToggleArrow');
const prevArrow = document.getElementById('prevArrow');
const nextArrow = document.getElementById('nextArrow');

const topConfigContainer = document.getElementById('topConfigContainer');
const topConfigContent = document.getElementById('topConfigContent');
const toggleTopBtn = document.getElementById('toggleTopBtn');
const topToggleArrow = document.getElementById('topToggleArrow');

// 質感フィルター用要素
const filterTriggerBtn = document.getElementById('filterTriggerBtn');
const filterPopover = document.getElementById('filterPopover');
const filterOptBtns = document.querySelectorAll('.filter-opt-btn');

const dateWrapper = document.getElementById('dateWrapper');
const dragDatePreview = document.getElementById('dragDatePreview');
const closeBoxBtn = document.getElementById('closeBoxBtn');
const configVisibility = document.getElementById('configVisibility');

const configCustomText = document.getElementById('configCustomText');
const configTextOrder = document.getElementById('configTextOrder');
const configFormat = document.getElementById('configFormat');
const configFont = document.getElementById('configFont');
const configTextColor = document.getElementById('configTextColor');
const configHasBorder = document.getElementById('configHasBorder');
const configBorderColor = document.getElementById('configBorderColor');
const configBgColor = document.getElementById('configBgColor');
const configBgAlpha = document.getElementById('configBgAlpha');
const configFontSize = document.getElementById('configFontSize');
const fontSizeVal = document.getElementById('fontSizeVal');

// 💡 ホワイトノイズとフィルターを用いてリアルな「カシャッ」音を生成する関数
function playShutterSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();

    const bufferSize = audioCtx.sampleRate * 0.15;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buffer;

    const filterNode = audioCtx.createBiquadFilter();
    filterNode.type = 'bandpass';
    filterNode.frequency.value = 1000;
    filterNode.Q.value = 2;

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.6, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

    noiseNode.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    noiseNode.start();
  } catch (e) {
    console.log("シャッター音の生成に失敗しました:", e);
  }
}

let stream = null;
let facingMode = 'environment';
let frameScale = 1;
let startScale = 1;
let startDistance = 0;
let currentDataUrl = null;

let currentFrameIndex = 0;
let isAnimating = false;

let datePercentX = 0.5; 
let datePercentY = 0.65; 
let activeFilter = 'none';

let isFrameOpen = false;
let isStampOpen = false;

let isPinching = false;
let hasShownFirstTapMessage = false;

/* ==========================================
 * 🔄 メニュー開閉・排他制御の初期化
 * ========================================== */
function initPanelPositions() {
  const contentHeight = topConfigContent.offsetHeight;
  topConfigContainer.style.transform = `translateY(-${contentHeight + 30}px)`;
  topConfigContainer.classList.add('hidden');
  topToggleArrow.textContent = '▼';

  updateSelectorVisibility();
}
setTimeout(initPanelPositions, 300);

function updateSelectorVisibility() {
  if (isFrameOpen) {
    selectorContainer.style.display = 'flex';
    selectorContainer.style.opacity = '1';
    selectorContainer.style.pointerEvents = 'auto';
    frameArrow.textContent = '▼';
  } else {
    selectorContainer.style.display = 'none';
    selectorContainer.style.opacity = '0';
    selectorContainer.style.pointerEvents = 'none';
    frameArrow.textContent = '▲';
  }

  if (isStampOpen) {
    stampContainer.style.display = 'flex';
    stampContainer.style.opacity = '1';
    stampContainer.style.pointerEvents = 'auto';
    stampArrow.textContent = '▼';
  } else {
    stampContainer.style.display = 'none';
    stampContainer.style.opacity = '0';
    stampContainer.style.pointerEvents = 'none';
    stampArrow.textContent = '▲';
  }
}

frameBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  isFrameOpen = !isFrameOpen;
  if (isFrameOpen) isStampOpen = false;
  updateSelectorVisibility();

  const isCurrentlyHidden = topConfigContainer.classList.contains('hidden');
  if (isFrameOpen && !isCurrentlyHidden) {
    const contentHeight = topConfigContent.offsetHeight;
    topConfigContainer.style.transform = `translateY(-${contentHeight + 30}px)`; 
    topConfigContainer.classList.add('hidden'); 
    topToggleArrow.textContent = '▼';
  }
});

stampBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  isStampOpen = !isStampOpen;
  if (isStampOpen) isFrameOpen = false;
  updateSelectorVisibility();

  const isCurrentlyHidden = topConfigContainer.classList.contains('hidden');
  if (isStampOpen && !isCurrentlyHidden) {
    const contentHeight = topConfigContent.offsetHeight;
    topConfigContainer.style.transform = `translateY(-${contentHeight + 30}px)`; 
    topConfigContainer.classList.add('hidden'); 
    topToggleArrow.textContent = '▼';
  }
});

/* ==========================================
 * 🎨 質感フィルター選択のポップオーバー制御
 * ========================================== */
filterTriggerBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isShow = filterPopover.classList.toggle('show');
  filterTriggerBtn.classList.toggle('on', isShow);
  
  if (isShow) {
    const contentHeight = topConfigContent.offsetHeight;
    topConfigContainer.style.transform = `translateY(-${contentHeight + 30}px)`;
    topConfigContainer.classList.add('hidden');
    topToggleArrow.textContent = '▼';
    
    isFrameOpen = false;
    isStampOpen = false;
    updateSelectorVisibility();
  }
});

filterPopover.addEventListener('click', (e) => { e.stopPropagation(); });
document.addEventListener('click', () => {
  filterPopover.classList.remove('show');
  filterTriggerBtn.classList.remove('on');
});

filterOptBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    filterOptBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    activeFilter = btn.getAttribute('data-filter');
    document.body.classList.remove('filter-old-photo', 'filter-retro-print', 'filter-heisei-album', 'filter-monochrome');
    if (activeFilter !== 'none') { document.body.classList.add(`filter-${activeFilter}`); }
    
    updateDatePreviewStyle();
    filterPopover.classList.remove('show');
    filterTriggerBtn.classList.remove('on');
  });
});

/* ==========================================
 * 👆 ドラッグ＆ドロップ制御 ＆ 双方向タップ開閉
 * ========================================== */
let dragStartPos = { x: 0, y: 0 };
let hasMoved = false;

dateWrapper.addEventListener('touchstart', (e) => { 
  e.stopPropagation(); 
  if (e.touches.length === 1) { 
    dragStartPos.x = e.touches[0].clientX; 
    dragStartPos.y = e.touches[0].clientY; 
    hasMoved = false;
  }
}, { passive: true });

dateWrapper.addEventListener('touchmove', (e) => {
  e.stopPropagation();
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    const moveDist = Math.sqrt(Math.pow(touch.clientX - dragStartPos.x, 2) + Math.pow(touch.clientY - dragStartPos.y, 2));
    if (moveDist > 5) { hasMoved = true; }

    let newX = touch.clientX; let newY = touch.clientY;
    if (newX < 0) newX = 0; if (newX > window.innerWidth) newX = window.innerWidth;
    if (newY < 0) newY = 0; if (newY > window.innerHeight) newY = window.innerHeight;

    datePercentX = newX / window.innerWidth; datePercentY = newY / window.innerHeight;
    dateWrapper.style.left = `${newX}px`; dateWrapper.style.top = `${newY}px`;
  }
}, { passive: false });

dateWrapper.addEventListener('touchend', (e) => {
  e.stopPropagation();
  if (document.body.classList.contains('hide-ui-mode')) return; 
  if (isPinching) return;

  if (!hasMoved) {
    const isHidden = topConfigContainer.classList.contains('hidden');
    
    if (isHidden) {
      topConfigContainer.classList.remove('hidden');
      topConfigContainer.style.transform = 'translateY(0)';
      topToggleArrow.textContent = '▲';
      
      isFrameOpen = false;
      isStampOpen = false;
      updateSelectorVisibility();
    } else {
      topConfigContent.classList.remove('panel-highlight-effect');
      void topConfigContent.offsetWidth;
      topConfigContent.classList.add('panel-highlight-effect');
    }

    if (!hasShownFirstTapMessage) {
      hasShownFirstTapMessage = true;

      msgToast.innerHTML = '上部の「日付・文字枠作成」コーナーで、<br>テキストや枠、日付の形式などを編集できます。';
      msgToast.classList.add('show');
      
      setTimeout(() => {
        msgToast.classList.remove('show');
      }, 4000);
    }
  }
});

closeBoxBtn.addEventListener('click', (e) => {
  e.stopPropagation(); 
  configVisibility.checked = false;
  updateDatePreviewStyle();
  
  const isCurrentlyHidden = topConfigContainer.classList.contains('hidden');
  if (!isCurrentlyHidden) {
    const contentHeight = topConfigContent.offsetHeight;
    topConfigContainer.style.transform = `translateY(-${contentHeight + 30}px)`; 
    topConfigContainer.classList.add('hidden'); 
    topToggleArrow.textContent = '▼';
  }

  msgToast.textContent = "画面上部の編集パネルで再度表示できます";
  msgToast.classList.add('show');
  setTimeout(() => { msgToast.classList.remove('show'); }, 3000);
});

/* ==========================================
 * 🔄 無限カルーセル制御
 * ========================================== */
function setupOrder() {
  const prevIndex = (currentFrameIndex - 1 + totalFrames) % totalFrames;
  const nextIndex = (currentFrameIndex + 1) % totalFrames;
  for (let i = 0; i < totalFrames; i++) {
    const item = document.getElementById(`item${i}`);
    if(item) {
      item.style.order = (i === prevIndex) ? '1' : (i === currentFrameIndex) ? '2' : (i === nextIndex) ? '3' : '4';
    }
  }
  frameSlider.classList.remove('animate');
  frameSlider.style.transform = 'translateX(-100vw)';
}
setupOrder();

function slideTo(direction, newIndex) {
  if (isAnimating) return;
  isAnimating = true;
  frameScale = 1;
  
  for (let i = 0; i < totalFrames; i++) {
    const img = document.getElementById(`frameImg${i}`);
    if (img) img.style.transform = 'scale(1)';
  }
  if (direction === 'direct') {
    if (newIndex === currentFrameIndex) { isAnimating = false; return; }
    const forwardDist = (newIndex - currentFrameIndex + totalFrames) % totalFrames;
    direction = (forwardDist <= totalFrames / 2) ? 'next' : 'prev';
    currentFrameIndex = newIndex;
  } else {
    currentFrameIndex = (direction === 'next') ? (currentFrameIndex + 1) % totalFrames : (currentFrameIndex - 1 + totalFrames) % totalFrames;
  }

  frameDots.forEach(dot => {
    dot.classList.toggle('active', parseInt(dot.getAttribute('data-index')) === currentFrameIndex);
  });

  frameSlider.classList.add('animate');
  frameSlider.style.transform = (direction === 'next') ? 'translateX(-200vw)' : 'translateX(0vw)';

  setTimeout(() => { setupOrder(); isAnimating = false; }, 450); 
}

/* ==========================================
 * 🔒 カメラ起動
 * ========================================== */
async function startCamera() {
  if (stream) { stream.getTracks().forEach(track => { track.stop(); }); video.srcObject = null; }
  const constraints = { video: { facingMode: facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false };
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream; await video.play();
    video.classList.toggle('mirror', facingMode === 'user');
  } catch (e) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode }, audio: false });
      video.srcObject = stream; await video.play();
      video.classList.toggle('mirror', facingMode === 'user');
    } catch (err) { alert('カメラを起動できませんでした。'); }
  }
}

flipBtn.addEventListener('click', () => {
  facingMode = (facingMode === 'environment') ? 'user' : 'environment';
  startCamera();
});

/* ==========================================
 * 👆 カルーセルスワイプジェスチャー & ピンチ制御
 * ========================================== */
let touchStartX = 0; let touchStartY = 0;
window.addEventListener('touchstart', e => {
  if (e.target.closest('.top-config-container') || 
      e.target.closest('#filterTriggerBtn') || 
      e.target.closest('#filterPopover') || 
      e.target.closest('.frame-selector-container') ||
      e.target.closest('.btn') ||
      e.target.closest('.shutter') ||
      e.target.closest('.bottom-tabs-container') ||
      e.target.closest('#dateWrapper') ||
      e.target.closest('.placed-stamp-wrapper')) {
    return;
  }

  if (e.touches.length === 1) { 
    touchStartX = e.touches[0].clientX; 
    touchStartY = e.touches[0].clientY; 
  }
  else if (e.touches.length === 2) { 
    e.preventDefault(); 
    isPinching = true; 
    startDistance = getDistance(e.touches); 
    startScale = frameScale; 
  }
}, { passive: false });

window.addEventListener('touchmove', e => {
  if (e.touches.length === 2) { 
    e.preventDefault(); 
    const currentDistance = getDistance(e.touches); 
    frameScale = Math.max(0.5, Math.min(startScale * (currentDistance / startDistance), 3)); 
    applyFrameZoom(); 
  }
}, { passive: false });

window.addEventListener('touchend', e => {
  if (e.touches.length < 2) {
    setTimeout(() => { isPinching = false; }, 100);
  }

  if (e.target.closest('.top-config-container') || 
      e.target.closest('#filterTriggerBtn') || 
      e.target.closest('#filterPopover') || 
      e.target.closest('.frame-selector-container') ||
      e.target.closest('.btn') ||
      e.target.closest('.shutter') ||
      e.target.closest('.bottom-tabs-container') ||
      e.target.closest('#dateWrapper') ||
      e.target.closest('.placed-stamp-wrapper')) {
    return;
  }

  if (e.changedTouches.length === 1 && e.touches.length === 0) {
    const diffX = e.changedTouches[0].clientX - touchStartX; 
    const diffY = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(diffX) > 60 && Math.abs(diffY) < 100) { 
      slideTo(diffX > 0 ? 'prev' : 'next'); 
    }
  }
});

function getDistance(touches) {
  return Math.sqrt(Math.pow(touches[0].clientX - touches[1].clientX, 2) + Math.pow(touches[0].clientY - touches[1].clientY, 2));
}
function applyFrameZoom() {
  const currentFrameImg = document.getElementById(`frameImg${currentFrameIndex}`);
  if (!currentFrameImg) return;

  const currentConfig = FRAME_MASTER_DATA[currentFrameIndex];
  
  if (currentConfig.fitType === FRAME_FIT_TYPES.COVER) {
    // 💡 1. 画像の本来の縦横比を100%正確に取得
    const imgRatio = currentFrameImg.naturalWidth / currentFrameImg.naturalHeight;
    
    // 💡 2. 現在のスマホ画面の高さに、ピンチの縮小率（frameScale）を掛け算して「今の高さ」を計算
    const dynamicHeight = window.innerHeight * frameScale;
    
    // 💡 3. 比率を維持したまま、はみ出し部分も一緒に縮む「今の横幅」を計算
    const dynamicWidth = dynamicHeight * imgRatio;
    
    // 💡 4. 計算した正確なピクセルサイズを画像にリアルタイムで直接流し込む！
    currentFrameImg.style.height = `${dynamicHeight}px`;
    currentFrameImg.style.width = `${dynamicWidth}px`;
    
    // スケールによる歪みを防ぐため transform は初期化
    currentFrameImg.style.transform = 'none';
  } else {
    // 通常の額縁タイプ（contain）は今まで通りの挙動
    currentFrameImg.style.height = '100%';
    currentFrameImg.style.width = '100%';
    currentFrameImg.style.transform = `scale(${frameScale})`;
  }
}

/* ==========================================
 * 📸 撮影処理
 * ========================================== */
function playShotEffect() {
  shotEffect.style.opacity = '1';
  setTimeout(() => { shotEffect.style.opacity = '0'; }, 100);
}

captureBtn.addEventListener('click', () => {
  setAppHeight();
  const currentFrameImg = document.getElementById(`frameImg${currentFrameIndex}`);
  if (!video.videoWidth || !video.videoHeight || !currentFrameImg.complete) return;

  playShotEffect();
  playShutterSound();

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');

  if (activeFilter === 'old-photo') {
    ctx.filter = 'sepia(0.9) contrast(1.15) brightness(0.85) saturate(0.5)';
  } 
  else if (activeFilter === 'retro-print') {
    ctx.filter = 'saturate(1.6) contrast(1.1) brightness(0.98) sepia(0.35) hue-rotate(-15deg) blur(0.5px)';
  } 
  else if (activeFilter === 'heisei-album') {
    ctx.filter = 'contrast(1.3) brightness(1.15) saturate(0.7) sepia(0.1)';
  } 
  else if (activeFilter === 'monochrome') {
    ctx.filter = 'grayscale(1) contrast(1.2) brightness(0.95)';
  }

  drawCoverVideo(ctx, video, canvas.width, canvas.height);
  const currentConfig = FRAME_MASTER_DATA[currentFrameIndex];

  if (currentConfig.fitType === FRAME_FIT_TYPES.COVER) {
    drawScaledCoverImage(ctx, currentFrameImg, canvas.width, canvas.height, frameScale);
  } else {
    drawScaledContainImage(ctx, currentFrameImg, canvas.width, canvas.height, frameScale);
  }

  if (activeFilter === 'old-photo') {
    ctx.save();
    const vignette = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width*0.15, canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height)*0.7);
    vignette.addColorStop(0, 'rgba(255,255,255,0)'); vignette.addColorStop(0.55, 'rgba(255,255,255,0)'); vignette.addColorStop(1, 'rgba(45,20,0,0.42)');
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.08; ctx.fillStyle = '#5b3a1b';
    for (let y = 0; y < canvas.height; y += 4) { ctx.fillRect(0, y, canvas.width, 1); }
    const grainCount = Math.floor((canvas.width * canvas.height) / 550);
    for (let i = 0; i < grainCount; i++) {
      ctx.globalAlpha = Math.random() * 0.16 + 0.04; ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
      ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, Math.random()*1.6+0.4, Math.random()*1.6+0.4);
    }
    ctx.restore();
  } 
  else if (activeFilter === 'retro-print') {
    ctx.save();
    const printVignette = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width*0.2, canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height)*1.1);
    printVignette.addColorStop(0, 'rgba(0,0,0,0)'); printVignette.addColorStop(0.6, 'rgba(40,20,0,0.15)'); printVignette.addColorStop(1, 'rgba(30,15,0,0.45)');
    ctx.fillStyle = printVignette; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  else if (activeFilter === 'heisei-album') {
    ctx.save();
    const grainCount = Math.floor((canvas.width * canvas.height) / 400);
    for (let i = 0; i < grainCount; i++) {
      ctx.globalAlpha = Math.random() * 0.09;
      ctx.fillStyle = `rgb(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255})`;
      ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, 1.8, 1.8);
    }
    ctx.restore();
  }
  else if (activeFilter === 'monochrome') {
    ctx.save();
    const grainCount = Math.floor((canvas.width * canvas.height) / 600);
    for (let i = 0; i < grainCount; i++) {
      ctx.globalAlpha = Math.random() * 0.08; ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
      ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, 1.5, 1.5);
    }
    ctx.restore();
  }

  // 📸 文字枠描画
  if (configVisibility.checked) {
    const dateString = generateFullText();
    const size = parseInt(configFontSize.value || "16", 10);
    ctx.font = `bold ${size}px ${configFont.value}`;

    const isVertical = (configFormat.value === 'kanji-vertical');
    const lines = dateString.split("\n");

    let boxW, boxH;
    const lineHeight = size * 1.4;

    if (isVertical) {
      let maxLineHeight = 0;
      lines.forEach(line => {
        const h = line.length * size;
        if (h > maxLineHeight) maxLineHeight = h;
      });
      boxH = maxLineHeight + 64;
      boxW = (lines.length * lineHeight) - (lineHeight - size) + 28;
    } else {
      let maxLineWidth = 0;
      lines.forEach(line => {
        const w = ctx.measureText(line).width;
        if (w > maxLineWidth) maxLineWidth = w;
      });
      boxW = maxLineWidth + 64;
      boxH = (lines.length * lineHeight) - (lineHeight - size) + 28;
    }

    const targetCenterX = datePercentX * canvas.width;
    const targetCenterY = datePercentY * canvas.height;
    const boxX = targetCenterX - boxW / 2;
    const boxY = targetCenterY - boxH / 2;

    const alphaVal = configBgAlpha.value || "0.55";
    ctx.fillStyle = `rgba(${parseInt(configBgColor.value.slice(1,3),16)}, ${parseInt(configBgColor.value.slice(3,5),16)}, ${parseInt(configBgColor.value.slice(5,7),16)}, ${alphaVal})`;
    ctx.fillRect(boxX, boxY, boxW, boxH);

    if (configHasBorder.value === 'yes') {
      ctx.strokeStyle = configBorderColor.value;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(boxX, boxY, boxW, boxH);
    }

    ctx.fillStyle = configTextColor.value;

    if (isVertical) {
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const startX = targetCenterX + ((lines.length - 1) * lineHeight) / 2;

      lines.forEach((line, lineIndex) => {
        const currentLineX = startX - (lineIndex * lineHeight);
        const chars = line.split('');
        const startY = targetCenterY - (chars.length * size) / 2;

        chars.forEach((char, charIndex) => {
          const currentLineY = startY + (charIndex * size) + (size / 2);
          if (activeFilter === 'retro-print' && configFont.value.includes('Share Tech')) {
            ctx.save(); ctx.shadowColor = "rgba(255, 70, 0, 1)"; ctx.shadowBlur = 6;
            ctx.fillText(char, currentLineX, currentLineY); ctx.restore();
          } else {
            ctx.fillText(char, currentLineX, currentLineY);
          }
        });
      });
    } else {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const startY = targetCenterY - ((lines.length - 1) * lineHeight) / 2 + 1;

      lines.forEach((line, index) => {
        const currentLineY = startY + (index * lineHeight);
        if (activeFilter === 'retro-print' && configFont.value.includes('Share Tech')) {
          ctx.save(); ctx.shadowColor = "rgba(255, 70, 0, 1)"; ctx.shadowBlur = 6;
          ctx.fillText(line, targetCenterX, currentLineY); ctx.restore();
        } else {
          ctx.fillText(line, targetCenterX, currentLineY);
        }
      });
    }
    const placedStamps = document.querySelectorAll('.placed-stamp-wrapper');
    placedStamps.forEach(stampWrapper => {
      const stampImg = stampWrapper.querySelector('.placed-stamp-img');
      if (!stampImg || !stampImg.complete) return;

      const rect = stampWrapper.getBoundingClientRect();
      const percentX = (rect.left + rect.width / 2) / window.innerWidth;
      const percentY = (rect.top + rect.height / 2) / window.innerHeight;

      const targetCenterX = percentX * canvas.width;
      const targetCenterY = percentY * canvas.height;

      const scaleFactor = canvas.width / window.innerWidth;
      const drawW = rect.width * scaleFactor;
      const drawH = rect.height * scaleFactor;

      const drawX = targetCenterX - drawW / 2;
      const drawY = targetCenterY - drawH / 2;

      ctx.drawImage(stampImg, drawX, drawY, drawW, drawH);
    });
  }

  currentDataUrl = canvas.toDataURL('image/png');
  previewImg.src = currentDataUrl; saveBtn.href = currentDataUrl;
  const now = new Date();

  const timeStr = now.getFullYear() + 
                  String(now.getMonth() + 1).padStart(2, '0') + 
                  String(now.getDate()).padStart(2, '0') + "_" + 
                  String(now.getHours()).padStart(2, '0') + 
                  String(now.getMinutes()).padStart(2, '0') + 
                  String(now.getSeconds()).padStart(2, '0');

  const baseName = (typeof SAVE_FILE_NAME_PREFIX !== 'undefined') ? SAVE_FILE_NAME_PREFIX : 'photo-frame';
  saveBtn.download = `${baseName}_${timeStr}.png`;

  preview.style.display = 'block';
  setTimeout(() => preview.classList.add('show'), 30);
});

function closePreview() {
  preview.classList.remove('show');
  setTimeout(() => { preview.style.display = 'none'; }, 300);
}

retakeBtn.addEventListener('click', closePreview);
previewImg.addEventListener('click', closePreview);

const previewCloseBtn = document.getElementById('previewCloseBtn');
if (previewCloseBtn) {
  previewCloseBtn.addEventListener('click', closePreview);
}

// 💡 【追加】保存ボタンをクリックした際のアナウンス強化＆自動クローズ
saveBtn.addEventListener('click', () => {
  // HTML側のsaveToastを削除したため、直接msgToastを最初から表示します
  if (msgToast) {
    msgToast.innerHTML = '写真を保存しました！<br><span style="font-size:11px;color:#ffcc00;font-weight:bold;">スマホの「ダウンロード」フォルダをご確認ください。</span>';
    msgToast.classList.add('show');
    
      setTimeout(() => { 
      msgToast.classList.remove('show'); 
    }, 3000);
  }

  // 保存ボタンが押されてから1.2秒後にプレビューを自動で閉じてカメラへ誘導します
  setTimeout(() => {
    closePreview();
  }, 1200);
});

// 💡 【追加・変更】シェアボタンのクリック：解決策Aの実装
shareBtn.addEventListener('click', async () => {
  if (!currentDataUrl) return;

 
  const baseShareUrl = window.location.href.split('?')[0];
  const shareUrlWithParams = `${baseShareUrl}?openExternalBrowser=1&openInExternalBrowser=1`;

  try {
    const response = await fetch(currentDataUrl);
    const blob = await response.blob();
    const file = new File([blob], "photo-frame.png", { type: "image/png" });

    // テキスト欄に脱出用パラメータ付きURLを埋め込む
    const shareData = {
      files: [file],
      title: '日付付きフォトフレーム',
      text: `新しく写真を撮影しました！あなたも撮ってみてね！\n👉 ${shareUrlWithParams}`
    };

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share(shareData);
    } else {
      alert('お使いのブラウザ・端末は、写真の直接シェアに対応していません。画像を保存してからシェアしてください。');
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('シェアに失敗しました:', error);
      alert('シェア処理中にエラーが発生しました。');
    }
  }
});

function drawCoverVideo(ctx, video, canvasW, canvasH) {
  const videoRatio = video.videoWidth / video.videoHeight; const canvasRatio = canvasW / canvasH;
  let sx, sy, sw, sh;
  if (videoRatio > canvasRatio) { sh = video.videoHeight; sw = sh * canvasRatio; sx = (video.videoWidth - sw) / 2; sy = 0; } 
  else { sw = video.videoWidth; sh = sw / canvasRatio; sx = 0; sy = (video.videoHeight - sh) / 2; }
  if (facingMode === 'user') { ctx.save(); ctx.translate(canvasW, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvasW, canvasH);
  if (facingMode === 'user') ctx.restore();
}
function drawScaledContainImage(ctx, img, canvasW, canvasH, scale) {
  const imgRatio = img.naturalWidth / img.naturalHeight; const canvasRatio = canvasW / canvasH;
  let drawW, drawH;
  if (imgRatio > canvasRatio) { drawW = canvasW; drawH = canvasW / imgRatio; } else { drawH = canvasH; drawW = canvasH * imgRatio; }
  drawW *= scale; drawH *= scale; ctx.drawImage(img, (canvasW - drawW) / 2, (canvasH - drawH) / 2, drawW, drawH);
}

/* ==========================================
 * 🔄 UI開閉制御イベント
 * ========================================== */
toggleTopBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isCurrentlyHidden = topConfigContainer.classList.contains('hidden');
  if (isCurrentlyHidden) {
    topConfigContainer.classList.remove('hidden');
    topConfigContainer.style.transform = 'translateY(0)';
    topToggleArrow.textContent = '▲';
    
    if (!configVisibility.checked) { configVisibility.checked = true; }
    updateDatePreviewStyle();

    isFrameOpen = false;
    isStampOpen = false;
    updateSelectorVisibility();
  } else {
    const contentHeight = topConfigContent.offsetHeight;
    topConfigContainer.style.transform = `translateY(-${contentHeight + 30}px)`; 
    topConfigContainer.classList.add('hidden'); 
    topToggleArrow.textContent = '▼';
  }
});

/* ==========================================
 * 日付・カスタム文字の生成＆HTMLパーツ化（ひとかたまり化対応）
 * ========================================== */
function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month2Digit = String(now.getMonth() + 1).padStart(2, '0');
  const date2Digit = String(now.getDate()).padStart(2, '0');
  const month1Digit = String(now.getMonth() + 1);
  const date1Digit = String(now.getDate());

  const toKanjiNum = (numStr) => {
    const kanjiDigits = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    return numStr.split('').map(d => kanjiDigits[parseInt(d)] || d).join('');
  };

  const format = configFormat.value;
  if (format === 'kanji-vertical') {
    const reiwaYear = year - 2018;
    const kYear = toKanjiNum(String(reiwaYear));
    const kMonth = toKanjiNum(month1Digit);
    const kDate = toKanjiNum(date1Digit);
    return `令和${kYear}年${kMonth}月${kDate}日`;
  } else if (format === 'wareki') {
    const reiwaYear = year - 2018;
    return `令和${reiwaYear}年${month1Digit}月${date1Digit}日`;
  } else if (format === 'seireki') {
    return `${year}年${month1Digit}月${date1Digit}日`;
  } else if (format === 'hyphen') {
    return `${year}-${month2Digit}-${date2Digit}`;
  } else if (format === 'dot') {
    return `${year}.${month2Digit}.${date2Digit}`;
  } else if (format === 'slash') {
    return `${year}/${month2Digit}/${date2Digit}`;
  }
  return "";
}

function generateFullText() {
  const dateStr = getDateString();
  const customText = configCustomText.value;
  const order = configTextOrder.value;

  if (order === 'none') return customText;
  if (order === 'before' && customText) return `${customText} ${dateStr}`;
  if (customText) return `${dateStr} ${customText}`;
  return dateStr;
}

function updateDatePreviewStyle() {
  if (!configVisibility.checked) {
    dateWrapper.style.display = 'none';
    return;
  }
  dateWrapper.style.display = 'inline-block';

  const dateStr = getDateString();
  const customText = configCustomText.value;
  const order = configTextOrder.value;

  const dateHtml = `<span class="date-chunk" style="user-select:none;-webkit-user-select:none;pointer-events:none;opacity:0.95;" contenteditable="false">${dateStr}</span>`;
  const formattedCustom = customText.replace(/\n/g, '<br>');
  const textHtml = `<span class="text-chunk">${formattedCustom}</span>`;

  if (order === 'none') {
    dragDatePreview.innerHTML = textHtml;
  } else if (order === 'before') {
    dragDatePreview.innerHTML = customText ? `${textHtml} ${dateHtml}` : dateHtml;
  } else {
    dragDatePreview.innerHTML = customText ? `${dateHtml} ${textHtml}` : dateHtml;
  }

  if (configFormat.value === 'kanji-vertical') {
    dragDatePreview.style.writingMode = 'vertical-rl';
    dragDatePreview.style.textOrientation = 'upright';
    dragDatePreview.style.padding = '14px 14px';
  } else {
    dragDatePreview.style.writingMode = 'horizontal-tb';
    dragDatePreview.style.textOrientation = 'mixed';
    dragDatePreview.style.padding = '14px 14px';
  }

  const currentSize = configFontSize.value || "16";
  if (fontSizeVal) fontSizeVal.textContent = currentSize + "px";
  dragDatePreview.style.fontSize = currentSize + "px";
  dragDatePreview.style.fontWeight = 'bold';

  dragDatePreview.style.fontFamily = configFont.value;
  dragDatePreview.style.color = configTextColor.value;
  
  const hex = configBgColor.value || "#000000";
  const alphaVal = configBgAlpha.value || "0.55";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  dragDatePreview.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alphaVal})`;

  if (configHasBorder.value === 'yes') {
    dragDatePreview.style.border = `1.5px solid ${configBorderColor.value}`;
  } else {
    dragDatePreview.style.border = 'none';
  }

  if (activeFilter === 'retro-print' && configFont.value.includes('Share Tech')) {
    dragDatePreview.style.textShadow = '0 0 6px rgba(255, 70, 0, 1)';
  } else {
    dragDatePreview.style.textShadow = 'none';
  }
}

configCustomText.addEventListener('input', () => {
  updateDatePreviewStyle();
});

prevArrow.addEventListener('click', () => slideTo('prev'));
nextArrow.addEventListener('click', () => slideTo('next'));

frameDots.forEach(dot => {
  dot.addEventListener('click', () => {
    const idx = parseInt(dot.getAttribute('data-index'));
    slideTo('direct', idx);
  });
});

[configVisibility, configTextOrder, configFormat, configFont, 
 configTextColor, configHasBorder, configBorderColor, configBgColor, configBgAlpha, configFontSize].forEach(el => {
  if (el) {
    el.addEventListener('input', updateDatePreviewStyle);
    el.addEventListener('change', updateDatePreviewStyle);
  }
});

/* ==========================================
 * 🚀 アプリの初期化と実行 ＆ 🎡 イントロ演出
 * ========================================== */
updateDatePreviewStyle();

dateWrapper.style.left = `${window.innerWidth * datePercentX}px`;
dateWrapper.style.top = `${window.innerHeight * datePercentY}px`;

startCamera();

function playIntroCarousel() {
  if (isAnimating) return;
  isAnimating = true;

  const initialGuideBox = document.getElementById('initialGuideBox');
  if (initialGuideBox) {
    initialGuideBox.style.opacity = '1';
    initialGuideBox.style.transform = 'translate(-50%, -50%) scale(1)';
  }

  const item0 = document.getElementById('item0');
  const item1 = document.getElementById('item1');
  const item2 = document.getElementById('item2');
  const item3 = document.getElementById('item3');
  
  if (!item0 || !item1 || !item2 || !item3) {
    isAnimating = false;
    return;
  }

  item0.style.order = '1';
  item1.style.order = '2';
  item2.style.order = '3';
  item3.style.order = '4';

  const cloneItem0 = item0.cloneNode(true);
  cloneItem0.id = 'intro-clone-item0';
  cloneItem0.style.order = '5';
  frameSlider.appendChild(cloneItem0);

  const customFlowStyle = document.createElement('style');
  customFlowStyle.innerHTML = `
    .frame-slider.intro-flow {
      transition: transform 3.5s cubic-bezier(0.45, 0, 0.15, 1) !important;
    }
  `;
  document.head.appendChild(customFlowStyle);
  
  frameSlider.style.transform = 'translateX(0vw)';

  setTimeout(() => {
    frameSlider.classList.add('intro-flow');
    frameSlider.style.transform = 'translateX(-400vw)';
  }, 100);

  setTimeout(() => {
    frameSlider.classList.remove('intro-flow');
    currentFrameIndex = 0;
    
    setupOrder();
    
    cloneItem0.remove();
    customFlowStyle.remove();
    isAnimating = false;

    setTimeout(() => {
      if (initialGuideBox) {
        initialGuideBox.style.opacity = '0';
        initialGuideBox.style.transform = 'translate(-50%, -50%) scale(0.9)';
        setTimeout(() => initialGuideBox.remove(), 400);
      }
    }, 1500);

  }, 3600);
}

setTimeout(playIntroCarousel, 400);

/* ==========================================
 * ❓ 使い方ポップアップ ＆ 👁 メニュー制御
 * ========================================== */
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const helpModalCloseBtn = document.getElementById('helpModalCloseBtn');
const helpModalBottomCloseBtn = document.getElementById('helpModalBottomCloseBtn');
const menuToggleBtn = document.getElementById('menuToggleBtn');

// スライド制御用要素
const helpSliderStage = document.getElementById('helpSliderStage');
const helpSlidePrev = document.getElementById('helpSlidePrev');
const helpSlideNext = document.getElementById('helpSlideNext');
const helpDotsContainer = document.getElementById('helpDotsContainer');

let helpCurrentPage = 0;
let helpTotalPages = 0;

// 💡 仕様：config_1.js側に上書き用データ(HELP_SLIDES_DATA)があるか判定して構築
function initHelpSlides() {
  if (typeof HELP_SLIDES_DATA !== 'undefined' && Array.isArray(HELP_SLIDES_DATA)) {
    helpSliderStage.innerHTML = ''; // デフォルトをクリア
    
    HELP_SLIDES_DATA.forEach(slide => {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'help-slide-page';
      
      // 💡 画像(imgSrc)が指定されている場合だけ、imgタグを生成する
      let imgHtml = '';
      if (slide.imgSrc) {
        imgHtml = `<img src="${slide.imgSrc}" style="display:block; max-width:100%; max-height:120px; margin:0 auto 10px auto; object-fit:contain;">`;
      }

      pageDiv.innerHTML = `
        <h4>${slide.title}</h4>
        ${imgHtml}
        <p>${slide.text}</p>
      `;
      helpSliderStage.appendChild(pageDiv);
    });
  }

  const pages = helpSliderStage.querySelectorAll('.help-slide-page');
  helpTotalPages = pages.length;

  helpDotsContainer.innerHTML = '';
  for (let i = 0; i < helpTotalPages; i++) {
    const dot = document.createElement('div');
    dot.className = `help-dot-item${i === 0 ? ' active' : ''}`;
    dot.setAttribute('data-slide-index', i);
    helpDotsContainer.appendChild(dot);
  }

  updateHelpSlidePosition();
}

// 💡 スライド画面の移動＆アクティブ〇アイコンの更新表示
function updateHelpSlidePosition() {
  // ステージを横にシフト移動
  helpSliderStage.style.transform = `translateX(-${helpCurrentPage * 100}%)`;

  // 〇アイコン（ドット）のactiveクラスを同期
  const dots = helpDotsContainer.querySelectorAll('.help-dot-item');
  dots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx === helpCurrentPage);
  });

  // 最初のページ、最後のページでの矢印の非表示・表示制御
  if (helpSlidePrev) helpSlidePrev.style.display = (helpCurrentPage === 0) ? 'none' : 'flex';
  if (helpSlideNext) helpSlideNext.style.display = (helpCurrentPage === helpTotalPages - 1) ? 'none' : 'flex';
}

// 矢印ボタンのクリックイベント
if (helpSlidePrev) {
  helpSlidePrev.addEventListener('click', (e) => {
    e.stopPropagation();
    if (helpCurrentPage > 0) { helpCurrentPage--; updateHelpSlidePosition(); }
  });
}
if (helpSlideNext) {
  helpSlideNext.addEventListener('click', (e) => {
    e.stopPropagation();
    if (helpCurrentPage < helpTotalPages - 1) { helpCurrentPage++; updateHelpSlidePosition(); }
  });
}

// 💡 モーダルを閉じる際の共通ロジック
function closeHelpModal() {
  if (helpModal) {
    helpModal.classList.remove('show');
    // ページ位置をはじめ（0）に戻しておく親切設計
    helpCurrentPage = 0;
    updateHelpSlidePosition();
    
    if (!stream && !preview.classList.contains('show')) {
      startCamera();
    }
  }
}

if (helpBtn && helpModal) {
  helpBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    helpModal.classList.add('show');
  });
}

[helpModalCloseBtn, helpModalBottomCloseBtn].forEach(btn => {
  if (btn) {
    btn.addEventListener('click', (e) => { e.stopPropagation(); closeHelpModal(); });
  }
});

if (helpModal) {
  helpModal.addEventListener('click', closeHelpModal);
  const helpContent = helpModal.querySelector('.help-modal-content');
  if (helpContent) { helpContent.addEventListener('click', (e) => e.stopPropagation()); }
}

if (menuToggleBtn) {
  menuToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = document.body.classList.toggle('hide-ui-mode');
    menuToggleBtn.textContent = isHidden ? 'メニュー表示' : 'メニュー非表示';
  });
}

// 🚀 アプリ起動時に初期化と自動実行
initHelpSlides();

function autoOpenHelp() {
  if (helpModal) {
    setTimeout(() => {
      helpModal.classList.add('show');
    }, 600); 
  }
}
autoOpenHelp();

// 💡 共通の安全再起動ロジック
function resumeCameraSafely() {
  // 撮影後のプレビュー表示中（撮影完了画面）であれば、再起動せずそのままにします
  if (preview && preview.classList.contains('show')) return;

  console.log("🔋 復帰イベントを検知: 古いストリームを掃除してカメラの再起動を試みます。");
  
  // 💡 ポイント1: シェアシートが完全に閉じきって、OSがカメラを解放するのを300ミリ秒待ちます
  setTimeout(async () => {
    // 💡 ポイント2: 古いストリームが「生きた屍」状態で残っているため、一度強制的に全停止して破棄します
    if (stream) {
      try {
        stream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.log("トラック停止中のエラー(無視してOK):", e);
      }
      stream = null; // 完全に初期化
    }

    // 新鮮な状態で新しくカメラを取得し直す
    await startCamera();
    console.log("🔋 カメラデバイスの再取得・再起動が完全に完了しました。");
  }, 300); 
}

// 1. タブの切り替え時（別タブへの移動など）の制御
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
      stream = null;
      console.log("バックグラウンド移行のため、カメラを一時停止しました");
    }
  } else {
    resumeCameraSafely();
  }
});

// 2. シェアパネルやOSメニューから画面に戻ってきた瞬間を100%検知してカメラを蘇生
window.addEventListener('focus', () => {
  resumeCameraSafely();
});


/* ==========================================
 * 💡 スタンプの配置＆ドラッグ制御
 * ========================================== */
document.querySelectorAll('.stamp-thumb').forEach(thumb => {
  thumb.addEventListener('click', (e) => {
    const target = e.target.closest('.stamp-thumb');
    const imgSrc = target.getAttribute('data-src');
    createStamp(imgSrc);
  });
});

function createStamp(src) {
  const wrapper = document.createElement('div');
  wrapper.className = 'placed-stamp-wrapper';
  wrapper.style.left = '50%';
  wrapper.style.top = '50%';
  wrapper.style.transform = 'translate(-50%, -50%)';
  
  const inner = document.createElement('div');
  inner.className = 'placed-stamp-inner';
  
  const img = document.createElement('img');
  img.src = src;
  img.className = 'placed-stamp-img';
  img.style.transform = 'scale(1)';
  
  const handleBtn = document.createElement('div');
  handleBtn.className = 'drag-handle-btn';
  handleBtn.innerHTML = '<img src="img/ico_move.png" alt="移動">';
  
  const closeBtn = document.createElement('div');
  closeBtn.className = 'close-box-btn';
  closeBtn.innerHTML = '<img src="img/ico_close.png" alt="閉じる">';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    wrapper.remove();
  });
  
  const minusBtn = document.createElement('div');
  minusBtn.className = 'btn-minus';
  minusBtn.textContent = '－';

  const plusBtn = document.createElement('div');
  plusBtn.className = 'btn-plus';
  plusBtn.textContent = '＋';

  inner.appendChild(img);
  inner.appendChild(handleBtn);
  inner.appendChild(closeBtn);
  inner.appendChild(minusBtn);
  inner.appendChild(plusBtn);
  
  wrapper.appendChild(inner);
  document.body.appendChild(wrapper);
  
  makeStampInteractive(wrapper, minusBtn, plusBtn);
}

function makeStampInteractive(el, minusBtn, plusBtn) {
  let startX = 0, startY = 0;
  let currentX = 0, currentY = 0;
  let currentScale = 1;

  const stampImg = el.querySelector('.placed-stamp-img');
  const BASE_SIZE = 120;

  el.addEventListener('touchstart', (e) => {
    if (document.body.classList.contains('hide-ui-mode')) return;
    if (e.target.closest('.btn-minus') || e.target.closest('.btn-plus')) return;

    const touch = e.touches[0];
    const transform = window.getComputedStyle(el).transform;
    
    if (transform !== 'none') {
      const matrix = new WebKitCSSMatrix(transform);
      currentX = matrix.m41;
      currentY = matrix.m42;
    }
    startX = touch.clientX - currentX;
    startY = touch.clientY - currentY;
  }, { passive: true });

  el.addEventListener('touchmove', (e) => {
    if (document.body.classList.contains('hide-ui-mode')) return;
    if (e.target.closest('.btn-minus') || e.target.closest('.btn-plus')) return;

    const touch = e.touches[0];
    currentX = touch.clientX - startX;
    currentY = touch.clientY - startY;
    
    el.style.transform = `translate(calc(-50% + ${currentX}px), calc(-50% + ${currentY}px))`;
  }, { passive: true });

  minusBtn.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    if (document.body.classList.contains('hide-ui-mode')) return;
    
    currentScale = Math.max(0.4, currentScale - 0.1);
    if (stampImg) {
      stampImg.style.width = `${BASE_SIZE * currentScale}px`;
    }
  }, { passive: true });

  plusBtn.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    if (document.body.classList.contains('hide-ui-mode')) return;
    
    currentScale = Math.min(3.0, currentScale + 0.1);
    if (stampImg) {
      stampImg.style.width = `${BASE_SIZE * currentScale}px`;
    }
  }, { passive: true });
}

function drawScaledCoverImage(ctx, img, canvasW, canvasH, scale) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const canvasRatio = canvasW / canvasH;
  let drawW, drawH;

  if (imgRatio > canvasRatio) {
    drawH = canvasH;
    drawW = canvasH * imgRatio;
  } else {
    drawW = canvasW;
    drawH = canvasW / imgRatio;
  }

  drawW *= scale;
  drawH *= scale;

  ctx.drawImage(
    img, 
    (canvasW - drawW) / 2, 
    (canvasH - drawH) / 2, 
    drawW, 
    drawH
  );
}


let sleepTimeout = null;
const SLEEP_DELAY = 5 * 60 * 1000;

const sleepOverlay = document.createElement('div');
sleepOverlay.id = 'sleepOverlay';
sleepOverlay.style.cssText = `
  position: fixed; inset: 0; z-index: 999999;
  background: rgba(0, 0, 0, 0.9); color: #fff;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  opacity: 0; pointer-events: none; transition: opacity 0.4s ease;
  font-family: sans-serif; text-align: center;
`;
sleepOverlay.innerHTML = `
  <p style="font-size: 16px; font-weight: bold; margin-bottom: 12px; letter-spacing: 0.05em;">
    バッテリー節約のため一時停止しています
  </p>
  <button style="
    border: 2px solid #ffcc00; background: transparent; color: #ffcc00;
    padding: 10px 24px; border-radius: 999px; font-size: 14px; font-weight: bold; cursor: pointer;
  ">タップして再開</button>
`;
document.body.appendChild(sleepOverlay);

function enterSleep() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    stream = null;
    console.log("💤 放置を検知したため、カメラをスリープしました");
  }
  sleepOverlay.style.opacity = '1';
  sleepOverlay.style.pointerEvents = 'auto';
}

function wakeup() {
  resetSleepTimer();
  if (sleepOverlay.style.opacity === '1') {
    sleepOverlay.style.opacity = '0';
    sleepOverlay.style.pointerEvents = 'none';
    if (!stream && !preview.classList.contains('show')) {
      startCamera();
      console.log("💤 スリープから復帰し、カメラを再起動しました");
    }
  }
}

function resetSleepTimer() {
  clearTimeout(sleepTimeout);
  if (preview && preview.classList.contains('show')) return;
  if (sleepOverlay.style.opacity === '1') return;
  
  sleepTimeout = setTimeout(enterSleep, SLEEP_DELAY);
}

['touchstart', 'mousedown', 'mousemove', 'keydown'].forEach(evt => {
  window.addEventListener(evt, resetSleepTimer, { passive: true });
});

sleepOverlay.addEventListener('touchstart', (e) => { e.stopPropagation(); wakeup(); }, { passive: true });
sleepOverlay.addEventListener('mousedown', (e) => { e.stopPropagation(); wakeup(); });

resetSleepTimer();

function forceExternalBrowserForWorks() {
  const ua = navigator.userAgent.toLowerCase();
  const isLineWorks = ua.indexOf('worksmobile') > -1;

  if (isLineWorks) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.95)';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.padding = '30px';
    overlay.style.boxSizing = 'border-box';
    overlay.style.color = '#fff';
    overlay.style.fontFamily = 'sans-serif';
    overlay.style.textAlign = 'center';

    const currentUrl = window.location.href.replace(/^https?:\/\//, '');

    let intentUrl = '';
    if (ua.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1) {
      intentUrl = `x-web-search://?${window.location.href}`;
    } else {
      intentUrl = `intent://${currentUrl}#Intent;scheme=https;package=com.android.chrome;end`;
    }

    overlay.innerHTML = `
      <h2 class="line-works-h2">LINE WORKSをご利用の方へ</h2>
      <p>
        LINE WORKS内では、スマホの制限により<br>
        <b>カメラの機能が正常に動作しません。</b><br>
        <br>
        お手数ですが、下のボタンをタップして<br>
        通常のブラウザ（Safari / Chrome）で開き直してください。
      </p>
      <a href="${intentUrl}" class="line-works-btn">標準ブラウザで開き直す</a>`;

    document.body.appendChild(overlay);
  }
}
forceExternalBrowserForWorks();

// ==========================================
// ブラウザの直接ファイルシェア判定セーフティネット
// ==========================================
function checkShareSupport() {
  const shareBtn = document.getElementById('shareBtn');
  if (!shareBtn) return;

  try {
    const dummyBlob = new Blob([''], { type: 'image/png' });
    const dummyFile = new File([dummyBlob], 'test.png', { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [dummyFile] })) {
      shareBtn.style.display = 'inline-block'; 
    } else {
      // 💡 LINE WORKSやその他アプリ内ブラウザ（非対応環境）ではシェアボタンを事前に非表示にする
      shareBtn.style.display = 'none';
    }
  } catch (e) {
    shareBtn.style.display = 'none';
  }
}
checkShareSupport();