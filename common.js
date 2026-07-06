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

const selectorContainer = document.getElementById('frameSelectorContainer');
const toggleSelectorBtn = document.getElementById('toggleSelectorBtn');
const toggleArrow = document.getElementById('toggleArrow');
const frameDots = document.querySelectorAll('.frame-dot');
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

let stream = null;
let facingMode = 'environment';
let frameScale = 1;
let startScale = 1;
let startDistance = 0;
let currentDataUrl = null;

let currentFrameIndex = 0;
const totalFrames = 3; 
let isAnimating = false;

let datePercentX = 0.5; 
let datePercentY = 0.70; 
let activeFilter = 'none'; // 現在の選ばれている質感フィルター名

/* ==========================================
 * 🔄 メニュー開閉の初期化
 * ========================================== */
function initPanelPositions() {
  // 上部設定メニューを隠す（画面上部へスライド）
  const contentHeight = topConfigContent.offsetHeight;
  topConfigContainer.style.transform = `translateX(-50%) translateY(-${contentHeight}px)`;
  topConfigContainer.classList.add('hidden');
  topToggleArrow.textContent = '▼';

  // 下部フレーム選択を隠す（今回は不具合の出ない opacity/pointer-events で制御）
  selectorContainer.classList.add('hidden');
  selectorContainer.style.opacity = '0';
  selectorContainer.style.pointerEvents = 'none';
  toggleArrow.textContent = '▲';
}
// DOM描写が安定してから初期位置を適用
setTimeout(initPanelPositions, 300);

/* ==========================================
 * 🎨 質感フィルター選択のポップオーバー制御
 * ========================================== */
filterTriggerBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isShow = filterPopover.classList.toggle('show');
  filterTriggerBtn.classList.toggle('on', isShow);
  
  // 質感フィルターを開いたときは、他のメニュー（上部・下部）を「確実に閉じる」
  if (isShow) {
    const contentHeight = topConfigContent.offsetHeight;
    topConfigContainer.style.transform = `translateX(-50%) translateY(-${contentHeight}px)`;
    topConfigContainer.classList.add('hidden'); 
    topToggleArrow.textContent = '▼';
    
    selectorContainer.classList.add('hidden');
    selectorContainer.style.opacity = '0';
    selectorContainer.style.pointerEvents = 'none';
    toggleArrow.textContent = '▲';
  }
});

filterPopover.addEventListener('click', (e) => {
  e.stopPropagation();
});

document.addEventListener('click', () => {
  filterPopover.classList.remove('show');
  filterTriggerBtn.classList.remove('on');
});

filterOptBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    filterOptBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    activeFilter = btn.getAttribute('data-filter');
    document.body.classList.remove('filter-old-photo', 'filter-retro-print', 'filter-heisei-album', 'filter-monochrome');
    
    if (activeFilter !== 'none') {
      document.body.classList.add(`filter-${activeFilter}`);
    }
    
  

    
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
  if (!hasMoved) {
    const isHidden = topConfigContainer.classList.contains('hidden');
    if (isHidden) {
      topConfigContainer.classList.remove('hidden');
      topConfigContainer.style.transform = `translateX(-50%) translateY(0)`;
      topToggleArrow.textContent = '▲';
      
      selectorContainer.classList.add('hidden');
      selectorContainer.style.opacity = '0';
      selectorContainer.style.pointerEvents = 'none';
      toggleArrow.textContent = '▲';
    } else {
      const contentHeight = topConfigContent.offsetHeight;
      topConfigContainer.style.transform = `translateX(-50%) translateY(-${contentHeight}px)`;
      topConfigContainer.classList.add('hidden'); topToggleArrow.textContent = '▼';
    }
  }
});

closeBoxBtn.addEventListener('click', (e) => {
  e.stopPropagation(); 
  configVisibility.checked = false;
  updateDatePreviewStyle();
  msgToast.textContent = "画面上部の作成コーナーで再度表示できます";
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

// カメラ切り替えボタンのイベント
flipBtn.addEventListener('click', () => {
  facingMode = (facingMode === 'environment') ? 'user' : 'environment';
  startCamera();
});

/* ==========================================
 * 👆 カルーセルスワイプジェスチャー
 * ========================================== */
let touchStartX = 0; let touchStartY = 0;
window.addEventListener('touchstart', e => {
  if (e.target.closest('.top-config-container') || 
      e.target.closest('#filterTriggerBtn') || 
      e.target.closest('#filterPopover') || 
      e.target.closest('.frame-selector-container') ||
      e.target.closest('.btn') ||
      e.target.closest('.shutter') ||
      e.target.closest('#dateWrapper')) {
    return;
  }

  if (e.touches.length === 1) { 
    touchStartX = e.touches[0].clientX; 
    touchStartY = e.touches[0].clientY; 
  }
  else if (e.touches.length === 2) { 
    e.preventDefault(); 
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
  if (e.target.closest('.top-config-container') || 
      e.target.closest('#filterTriggerBtn') || 
      e.target.closest('#filterPopover') || 
      e.target.closest('.frame-selector-container') ||
      e.target.closest('.btn') ||
      e.target.closest('.shutter') ||
      e.target.closest('#dateWrapper')) {
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
  if (currentFrameImg) { currentFrameImg.style.transform = `scale(${frameScale})`; }
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

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');

 if (activeFilter === 'old-photo') {
    ctx.filter = 'sepia(0.9) contrast(1.15) brightness(0.85) saturate(0.5)';
  } 
  else if (activeFilter === 'retro-print') {
    // 彩度(saturate)とコントラストを上げ、色相をさらにレトロに
    ctx.filter = 'saturate(1.6) contrast(1.1) brightness(0.98) sepia(0.35) hue-rotate(-15deg) blur(0.5px)';
  } 
  else if (activeFilter === 'heisei-album') {
    // 若干白飛びしたような平成特有のフラッシュ感と色褪せを強調
    ctx.filter = 'contrast(1.3) brightness(1.15) saturate(0.7) sepia(0.1)';
  } 
  else if (activeFilter === 'monochrome') {
    // モノクロ：白黒のコントラストをやや強めに調整
    ctx.filter = 'grayscale(1) contrast(1.2) brightness(0.95)';
  }
  // -----------------------------------------------------------

  drawCoverVideo(ctx, video, canvas.width, canvas.height);
  drawScaledContainImage(ctx, currentFrameImg, canvas.width, canvas.height, frameScale);

  // --- 特殊エフェクト（粒子や周辺減光）の強化 ----------------------
  if (activeFilter === 'old-photo') {
    // （既存の古写真エフェクト処理はそのまま）
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
    // 周辺減光（四隅の暗がり）を強くしてプリント写真らしさをアップ
    const printVignette = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width*0.2, canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height)*1.1);
    printVignette.addColorStop(0, 'rgba(0,0,0,0)'); 
    printVignette.addColorStop(0.6, 'rgba(40,20,0,0.15)'); 
    printVignette.addColorStop(1, 'rgba(30,15,0,0.45)');
    ctx.fillStyle = printVignette; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  else if (activeFilter === 'heisei-album') {
    ctx.save();
    // 平成アルバム用の「カラーノイズ（ザラザラ感）」の密度を2倍に強化
    const grainCount = Math.floor((canvas.width * canvas.height) / 400); // 800→400で密度アップ
    for (let i = 0; i < grainCount; i++) {
      ctx.globalAlpha = Math.random() * 0.09; // 少し濃く
      ctx.fillStyle = `rgb(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255})`;
      ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, 1.8, 1.8);
    }
    ctx.restore();
  }
  else if (activeFilter === 'monochrome') {
    ctx.save();
    // モノクロ用にうっすらと銀塩写真のようなザラつき（白黒ノイズ）をプラス
    const grainCount = Math.floor((canvas.width * canvas.height) / 600);
    for (let i = 0; i < grainCount; i++) {
      ctx.globalAlpha = Math.random() * 0.08;
      ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
      ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, 1.5, 1.5);
    }
    ctx.restore();
  }

 if (configVisibility.checked) {
  const dateString = generateFullText();
  // 撮影前と完全に一致させるため、文字サイズを明示してfont指定
 const size = parseInt(configFontSize.value || "18", 10); // スライダーの文字サイズを取得
  ctx.font = `bold ${size}px ${configFont.value}`; // Canvasに適用
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const textWidth = ctx.measureText(dateString).width;
  
  // 左右余白は 32px*2=64px 固定、上下余白は 14px*2=28px + 文字サイズ(size)
  const boxW = textWidth + 64;
  const boxH = size + 28;

  const targetCenterX = datePercentX * canvas.width;
  const targetCenterY = datePercentY * canvas.height;
  const boxX = targetCenterX - boxW / 2;
  const boxY = targetCenterY - boxH / 2;

  const alphaVal = configBgAlpha.value || "0.55";
  ctx.fillStyle = `rgba(${parseInt(configBgColor.value.slice(1,3),16)}, ${parseInt(configBgColor.value.slice(3,5),16)}, ${parseInt(configBgColor.value.slice(5,7),16)}, ${alphaVal})`;
  
  // 枠線の太さが内側にズレるのを防ぐため、背景と線を正しく描画
  ctx.fillRect(boxX, boxY, boxW, boxH);

  if (configHasBorder.value === 'yes') {
    ctx.strokeStyle = configBorderColor.value;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
  }

  ctx.fillStyle = configTextColor.value;
  
  // 縦軸の文字位置（Baseline）の微微調整（CSSのline-heightによるズレを相殺）
  const fineTunedY = targetCenterY + 1; 

  if (activeFilter === 'retro-print' && configFont.value.includes('Share Tech')) {
    ctx.save(); ctx.shadowColor = "rgba(255, 70, 0, 1)"; ctx.shadowBlur = 6;
    ctx.fillText(dateString, targetCenterX, fineTunedY); ctx.restore();
  } else {
    ctx.fillText(dateString, targetCenterX, fineTunedY);
  }
}

  currentDataUrl = canvas.toDataURL('image/png');
  previewImg.src = currentDataUrl; saveBtn.href = currentDataUrl;
  const now = new Date();
  const timeStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + "_" + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + String(now.getSeconds()).padStart(2, '0');
  saveBtn.download = `photo-frame_${timeStr}.png`;

  preview.style.display = 'block';
  setTimeout(() => preview.classList.add('show'), 30);
});

retakeBtn.addEventListener('click', () => {
  preview.classList.remove('show');
  setTimeout(() => { preview.style.display = 'none'; }, 300);
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
 * 🔄 UI開閉制御イベント (フェード切り替え安定版)
 * ========================================== */
toggleSelectorBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isCurrentlyHidden = selectorContainer.classList.contains('hidden');
  
  if (isCurrentlyHidden) {
    // 【開く】
    selectorContainer.classList.remove('hidden');
    selectorContainer.style.opacity = '1';
    selectorContainer.style.pointerEvents = 'auto';
    toggleArrow.textContent = '▼';
    
    // 上部メニューは閉じる
    const contentHeight = topConfigContent.offsetHeight;
    topConfigContainer.style.transform = `translateX(-50%) translateY(-${contentHeight}px)`;
    topConfigContainer.classList.add('hidden'); 
    topToggleArrow.textContent = '▼';
  } else {
    // 【閉じる】
    selectorContainer.classList.add('hidden');
    selectorContainer.style.opacity = '0';
    selectorContainer.style.pointerEvents = 'none';
    toggleArrow.textContent = '▲';
  }
});

toggleTopBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isCurrentlyHidden = topConfigContainer.classList.contains('hidden');
  
  if (isCurrentlyHidden) {
    // 【開く】
    topConfigContainer.classList.remove('hidden');
    topConfigContainer.style.transform = `translateX(-50%) translateY(0)`; 
    topToggleArrow.textContent = '▲';
    
    // 下部フレーム選択は閉じる
    selectorContainer.classList.add('hidden');
    selectorContainer.style.opacity = '0';
    selectorContainer.style.pointerEvents = 'none';
    toggleArrow.textContent = '▲';
  } else {
    // 【閉じる】
    const contentHeight = topConfigContent.offsetHeight;
    topConfigContainer.style.transform = `translateX(-50%) translateY(-${contentHeight}px)`; 
    topConfigContainer.classList.add('hidden'); 
    topToggleArrow.textContent = '▼';
  }
});

/* ==========================================
 * 📝 日付・カスタム文字の生成とスタイル反映
 * ========================================== */
function generateFullText() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');

  let dateStr = "";
  const format = configFormat.value;
  if (format === 'wareki') {
    const reiwaYear = year - 2018;
    dateStr = `令和${reiwaYear}年${month}月${date}日`;
  } else if (format === 'seireki') {
    dateStr = `${year}年${month}月${date}日`;
  } else if (format === 'hyphen') {
    dateStr = `${year}-${month}-${date}`;
  } else if (format === 'dot') {
    dateStr = `${year}.${month}.${date}`;
  } else if (format === 'slash') {
    dateStr = `${year}/${month}/${date}`;
  }

  const customText = configCustomText.value.trim();
  const order = configTextOrder.value;

  if (order === 'none') {
    return customText;
  } else if (order === 'before' && customText) {
    return `${customText} ${dateStr}`;
  } else if (customText) {
    return `${dateStr} ${customText}`;
  } else {
    return dateStr;
  }
}

function updateDatePreviewStyle() {
  if (!configVisibility.checked) {
    dateWrapper.style.display = 'none';
    return;
  }
  dateWrapper.style.display = 'inline-block';
  dragDatePreview.textContent = generateFullText();

const currentSize = configFontSize.value || "18";
  fontSizeVal.textContent = currentSize + "px"; // 横のテキスト（18pxなど）を更新
  dragDatePreview.style.fontSize = currentSize + "px"; // CSSのフォントサイズを変更
  dragDatePreview.style.fontWeight = 'bold';

  dragDatePreview.style.fontFamily = configFont.value;
  dragDatePreview.style.color = configTextColor.value;
  
  // 背景色と不具合対策の初期値(0.55)フォールバック
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

// カルーセルの矢印ボタンイベント
prevArrow.addEventListener('click', () => slideTo('prev'));
nextArrow.addEventListener('click', () => slideTo('next'));

// フレームドットの直接クリックイベント
frameDots.forEach(dot => {
  dot.addEventListener('click', () => {
    const idx = parseInt(dot.getAttribute('data-index'));
    slideTo('direct', idx);
  });
});

[configVisibility, configCustomText, configTextOrder, configFormat, configFont, 
 configTextColor, configHasBorder, configBorderColor, configBgColor, configBgAlpha,configFontSize].forEach(el => {
  el.addEventListener('input', updateDatePreviewStyle);
  el.addEventListener('change', updateDatePreviewStyle);
});

/* ==========================================
 * 🚀 アプリの初期化と実行 ＆ 🎡 高速自動カルーセル演出
 * ========================================== */
updateDatePreviewStyle();

// 初期位置の割り当て
dateWrapper.style.left = `${window.innerWidth * datePercentX}px`;
dateWrapper.style.top = `${window.innerHeight * datePercentY}px`;

// カメラの起動
startCamera();

// 💡 変更：1枚目がズレることなく、流れてそのままピタッと収まる演出
function playIntroCarousel() {
  if (isAnimating) return;
  isAnimating = true;

  const item0 = document.getElementById('item0');
  const item1 = document.getElementById('item1');
  const item2 = document.getElementById('item2');
  
  if (!item0 || !item1 || !item2) {
    isAnimating = false;
    return;
  }

  // 1. 演出の間だけ、並び順を左から「0 → 1 → 2」に完全固定する
  item0.style.order = '1';
  item1.style.order = '2';
  item2.style.order = '3';

  // 2. 3番目の後ろに「0枚目のコピー」を動的に追加し、完全に隙間を埋める
  const cloneItem0 = item0.cloneNode(true);
  cloneItem0.id = 'intro-clone-item0';
  cloneItem0.style.order = '4';
  frameSlider.appendChild(cloneItem0);

  // 3. アニメーションスタイルを注入（1.5秒かけてスーーッと気持ちよく減速）
  const customFlowStyle = document.createElement('style');
  customFlowStyle.innerHTML = `
    .frame-slider.intro-flow {
      transition: transform 1.5s cubic-bezier(0.25, 1, 0.3, 1) !important;
    }
  `;
  document.head.appendChild(customFlowStyle);

  // 4. 【重要】演出スタート時の初期位置を「完全に左端（0px）」にする
  // これにより、最初は本物の0枚目が綺麗に画面に収まった状態からスタートします
  frameSlider.style.transform = 'translateX(0vw)';

  // 画面が安定した直後に、コピーした4コマ目の0枚目（-300vw）まで一気に滑らせる
  setTimeout(() => {
    frameSlider.classList.add('intro-flow');
    // 0枚目(0vw) → 1枚目(-100vw) → 2枚目(-200vw) → コピーの0枚目(-300vw) へノンストップ移動
    frameSlider.style.transform = 'translateX(-300vw)';
  }, 300);

  // 5. コピーの0枚目でスーーッと完全に静止した後の処理
  setTimeout(() => {
    // アニメーションを一時的にオフにする
    frameSlider.classList.remove('intro-flow');
    
    // コピーの0枚目（-300vw）で止まっている見た目のまま、
    // 通常撮影モードの基点である「本物の0枚目の位置（-100vw）」へ、裏側で並び替え（setupOrder）と同時に瞬間ワープ
    currentFrameIndex = 0;
    setupOrder(); // これを実行すると内部で -100vw に戻り、周囲のコマも正しく再配置されます

    // 演出用のコピー要素とカスタムスタイルを削除してお掃除
    cloneItem0.remove();
    customFlowStyle.remove();
    
    // アニメーションロックを解除し、通常の撮影モードへ移行
    isAnimating = false;
  }, 1900); // 300ms(待機) + 1500ms(アニメーション時間) + 100ms(バッファ)
}

// アプリ起動後、0.4秒後に演出を開始
setTimeout(playIntroCarousel, 400);



/* ==========================================
 * ❓ 使い方ポップアップ ＆ 👁 メニュー表示・非表示の制御
 * ========================================== */

const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const helpModalCloseBtn = document.getElementById('helpModalCloseBtn');
const menuToggleBtn = document.getElementById('menuToggleBtn');

// 1. 使い方ポップアップの開閉処理
if (helpBtn && helpModal) {
  helpBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    helpModal.classList.add('show');
  });
}
if (helpModalCloseBtn && helpModal) {
  helpModalCloseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    helpModal.classList.remove('show');
  });
}
if (helpModal) {
  helpModal.addEventListener('click', () => helpModal.classList.remove('show'));
  const helpContent = helpModal.querySelector('.help-modal-content');
  if (helpContent) {
    helpContent.addEventListener('click', (e) => e.stopPropagation());
  }
}

// 2. メニュー表示・非表示の切り替え処理
if (menuToggleBtn) {
  menuToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // bodyのクラスを切り替える (CSSで一括display:noneになる)
    const isHidden = document.body.classList.toggle('hide-ui-mode');
    
    // ボタンのテキストを変更
    if (isHidden) {
      menuToggleBtn.textContent = 'メニュー表示';
    } else {
      menuToggleBtn.textContent = 'メニュー非表示';
    }
  });
}

// 3. 【重要】非表示モード時はタップしても作成コーナー（カスタムパネル）を出さない制御
// 既存の dragDatePreview のクリックイベント（または touchend）を探し、
// その処理の先頭に以下の条件判定を追加するか、既存の処理を上書き・調整してください。
if (dragDatePreview) {
  dragDatePreview.addEventListener('click', (e) => {
    // 💡 非表示モード（hide-ui-mode）の時は、パネルを開く処理をブロックする
    if (document.body.classList.contains('hide-ui-mode')) {
      return; 
    }
    
    // (ここに元々書いてある「トップ設定パネルを表示する」処理を残します)
    if (topConfigContainer) {
      topConfigContainer.classList.add('show');
    }
  });
}