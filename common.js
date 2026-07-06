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
  const contentHeight = topConfigContent.offsetHeight;
  // 💡 +30px 余分に引き上げることで、見切れる背景を画面外に完全に隠します
  topConfigContainer.style.transform = `translateX(-50%) translateY(-${contentHeight + 30}px)`;
  topConfigContainer.classList.add('hidden');
  topToggleArrow.textContent = '▼';

  selectorContainer.classList.add('hidden');
  selectorContainer.style.opacity = '0';
  selectorContainer.style.pointerEvents = 'none';
  toggleArrow.textContent = '▲';
}
setTimeout(initPanelPositions, 300);

/* ==========================================
 * 🎨 質感フィルター選択のポップオーバー制御
 * ========================================== */
filterTriggerBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isShow = filterPopover.classList.toggle('show');
  filterTriggerBtn.classList.toggle('on', isShow);
  
  if (isShow) {
    const contentHeight = topConfigContent.offsetHeight;
    topConfigContainer.style.transform = `translateX(-50%) translateY(-${contentHeight + 30}px)`;
    topConfigContainer.classList.add('hidden');
    topToggleArrow.textContent = '▼';
    
    selectorContainer.classList.add('hidden');
    selectorContainer.style.opacity = '0';
    selectorContainer.style.pointerEvents = 'none';
    toggleArrow.textContent = '▲';
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
      // 💡 ここも同様に +30px して完全に隠します
      topConfigContainer.style.transform = `translateX(-50%) translateY(-${contentHeight + 30}px)`;
      topConfigContainer.classList.add('hidden');
      topToggleArrow.textContent = '▼';
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
    ctx.filter = 'saturate(1.6) contrast(1.1) brightness(0.98) sepia(0.35) hue-rotate(-15deg) blur(0.5px)';
  } 
  else if (activeFilter === 'heisei-album') {
    ctx.filter = 'contrast(1.3) brightness(1.15) saturate(0.7) sepia(0.1)';
  } 
  else if (activeFilter === 'monochrome') {
    ctx.filter = 'grayscale(1) contrast(1.2) brightness(0.95)';
  }

  drawCoverVideo(ctx, video, canvas.width, canvas.height);
  drawScaledContainImage(ctx, currentFrameImg, canvas.width, canvas.height, frameScale);

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
// 📸 文字枠描画（257行目付近〜）
  if (configVisibility.checked) {
    const dateString = generateFullText();
    const size = parseInt(configFontSize.value || "16", 10);
    ctx.font = `bold ${size}px ${configFont.value}`;

    // 💡 縦書きモードかどうかの判定
    const isVertical = (configFormat.value === 'kanji-vertical');
    const lines = dateString.split("\n");

    let boxW, boxH;
    const lineHeight = size * 1.4;

    if (isVertical) {
      // 💡 縦書き用のサイズ計算
      let maxLineHeight = 0;
      lines.forEach(line => {
        const h = line.length * size; // 文字数 × フォントサイズが1行の高さ
        if (h > maxLineHeight) maxLineHeight = h;
      });
      boxH = maxLineHeight + 64; // 上下パディング
      boxW = (lines.length * lineHeight) - (lineHeight - size) + 28; // 左右パディング
    } else {
      // 横書き用のサイズ計算
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
      // 💡 縦書きでのレンダリング（右の行から順に描画）
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const startX = targetCenterX + ((lines.length - 1) * lineHeight) / 2;

      lines.forEach((line, lineIndex) => {
        const currentLineX = startX - (lineIndex * lineHeight);
        const chars = line.split('');
        const startY = targetCenterY - (chars.length * size) / 2;

        chars.forEach((char, charIndex) => {
          // 各文字の中心Y座標を算出して配置
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
      // 既存の横書き描画
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
 * 🔄 UI開閉制御イベント
 * ========================================== */
toggleSelectorBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isCurrentlyHidden = selectorContainer.classList.contains('hidden');
  if (isCurrentlyHidden) {
    selectorContainer.classList.remove('hidden');
    selectorContainer.style.opacity = '1';
    selectorContainer.style.pointerEvents = 'auto';
    toggleArrow.textContent = '▼';
    
    const contentHeight = topConfigContent.offsetHeight;
    // 💡 犯人はここでした！「+ 30」を追加して、フレーム選択を開いた時に上部がズレるのを完全に防ぎます！
    topConfigContainer.style.transform = `translateX(-50%) translateY(-${contentHeight + 30}px)`;
    topConfigContainer.classList.add('hidden'); topToggleArrow.textContent = '▼';
  } else {
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
    topConfigContainer.classList.remove('hidden');
    topConfigContainer.style.transform = `translateX(-50%) translateY(0)`; 
    topToggleArrow.textContent = '▲';
    
    // 💡 【重要】作成コーナーを開いたとき、日付枠がOFFになっていたら自動でON（復活）にする
    if (!configVisibility.checked) {
      configVisibility.checked = true;
    }
    updateDatePreviewStyle(); // 画面に復活を即時反映

    selectorContainer.classList.add('hidden');
    selectorContainer.style.opacity = '0';
    selectorContainer.style.pointerEvents = 'none';
    toggleArrow.textContent = '▲';
  } else {
    const contentHeight = topConfigContent.offsetHeight;
    // 💡 閉じる時に +30px して完全に画面外へ隠します
    topConfigContainer.style.transform = `translateX(-50%) translateY(-${contentHeight + 30}px)`; 
    topConfigContainer.classList.add('hidden'); 
    topToggleArrow.textContent = '▼';
  }
});

/* ==========================================================================
 * 日付・カスタム文字の生成
 * ========================================================================== */
function generateFullText() {
  const now = new Date();
  const year = now.getFullYear();
  const month2Digit = String(now.getMonth() + 1).padStart(2, '0');
  const date2Digit = String(now.getDate()).padStart(2, '0');
  const month1Digit = String(now.getMonth() + 1);
  const date1Digit = String(now.getDate());

  // 💡 数字を漢数字に変換するヘルパー
  const toKanjiNum = (numStr) => {
    const kanjiDigits = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    return numStr.split('').map(d => kanjiDigits[parseInt(d)] || d).join('');
  };

  let dateStr = "";
  const format = configFormat.value;

  if (format === 'kanji-vertical') {
    // 💡 和暦（令和）の計算をして漢数字に変換
    const reiwaYear = year - 2018;
    const kYear = toKanjiNum(String(reiwaYear));
    const kMonth = toKanjiNum(month1Digit);
    const kDate = toKanjiNum(date1Digit);
    dateStr = `令和${kYear}年${kMonth}月${kDate}日`;
  } else if (format === 'wareki') {
    const reiwaYear = year - 2018;
    dateStr = `令和${reiwaYear}年${month1Digit}月${date1Digit}日`;
  } else if (format === 'seireki') {
    dateStr = `${year}年${month1Digit}月${date1Digit}日`;
  } else if (format === 'hyphen') {
    dateStr = `${year}-${month2Digit}-${date2Digit}`;
  } else if (format === 'dot') {
    dateStr = `${year}.${month2Digit}.${date2Digit}`;
  } else if (format === 'slash') {
    dateStr = `${year}/${month2Digit}/${date2Digit}`;
  }

  const customText = configCustomText.value;
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

  const rawText = generateFullText();
  dragDatePreview.innerHTML = rawText.replace(/\n/g, '<br>');

  // 💡 縦書き用のCSS切り替え
  if (configFormat.value === 'kanji-vertical') {
    dragDatePreview.style.writingMode = 'vertical-rl'; // 縦書き（右から左へ）
    dragDatePreview.style.textOrientation = 'upright'; // 漢字・数字を真っ直ぐ立たせる
    dragDatePreview.style.padding = '14px 14px';       // パディングを縦長用に反転
  } else {
    dragDatePreview.style.writingMode = 'horizontal-tb'; // 通常の横書き
    dragDatePreview.style.textOrientation = 'mixed';
    dragDatePreview.style.padding = '14px 14px';       // 通常のパディング
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

prevArrow.addEventListener('click', () => slideTo('prev'));
nextArrow.addEventListener('click', () => slideTo('next'));

frameDots.forEach(dot => {
  dot.addEventListener('click', () => {
    const idx = parseInt(dot.getAttribute('data-index'));
    slideTo('direct', idx);
  });
});

[configVisibility, configCustomText, configTextOrder, configFormat, configFont, 
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

  const item0 = document.getElementById('item0');
  const item1 = document.getElementById('item1');
  const item2 = document.getElementById('item2');
  
  if (!item0 || !item1 || !item2) {
    isAnimating = false;
    return;
  }

  item0.style.order = '1';
  item1.style.order = '2';
  item2.style.order = '3';

  const cloneItem0 = item0.cloneNode(true);
  cloneItem0.id = 'intro-clone-item0';
  cloneItem0.style.order = '4';
  frameSlider.appendChild(cloneItem0);

  const customFlowStyle = document.createElement('style');
  customFlowStyle.innerHTML = `
    .frame-slider.intro-flow {
      transition: transform 1.5s cubic-bezier(0.25, 1, 0.3, 1) !important;
    }
  `;
  document.head.appendChild(customFlowStyle);
  frameSlider.style.transform = 'translateX(0vw)';

  setTimeout(() => {
    frameSlider.classList.add('intro-flow');
    frameSlider.style.transform = 'translateX(-300vw)';
  }, 300);

  setTimeout(() => {
    frameSlider.classList.remove('intro-flow');
    currentFrameIndex = 0;
    setupOrder();
    cloneItem0.remove();
    customFlowStyle.remove();
    isAnimating = false;
  }, 1900);
}
setTimeout(playIntroCarousel, 400);

/* ==========================================
 * ❓ 使い方ポップアップ ＆ 👁 メニュー制御
 * ========================================== */
const helpBtn = document.getElementById('helpBtn');
const helpModal = document.getElementById('helpModal');
const helpModalCloseBtn = document.getElementById('helpModalCloseBtn');
const menuToggleBtn = document.getElementById('menuToggleBtn');

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
  if (helpContent) { helpContent.addEventListener('click', (e) => e.stopPropagation()); }
}

if (menuToggleBtn) {
  menuToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = document.body.classList.toggle('hide-ui-mode');
    menuToggleBtn.textContent = isHidden ? 'メニュー表示' : 'メニュー非表示';
  });
}