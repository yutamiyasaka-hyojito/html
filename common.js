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

// 下部 UI 関連
const selectorContainer = document.getElementById('frameSelectorContainer');
const stampContainer = document.getElementById('stampSelectorContainer');
const frameBtn = document.getElementById('toggleSelectorBtn');
const stampBtn = document.getElementById('toggleStampBtn');
const frameArrow = document.getElementById('toggleArrow');
const stampArrow = document.getElementById('stampToggleArrow');
const frameDots = document.querySelectorAll('.frame-dot:not(.stamp-thumb)');
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
const totalFrames = 4; 
let isAnimating = false;

let datePercentX = 0.5; 
let datePercentY = 0.70; 
let activeFilter = 'none';

// デフォルトでフレームもスタンプも閉じた状態に設定
let isFrameOpen = false;
let isStampOpen = false;

// 💡 拡大縮小（ピンチ）判定用の管理フラグ
let isPinching = false;

// 💡 案内メッセージ用の初回タップ判定フラグ
let hasShownFirstTapMessage = false;

/* ==========================================
 * 🔄 メニュー開閉・排他制御の初期化
 * ========================================== */
function initPanelPositions() {
  const contentHeight = topConfigContent.offsetHeight;
  // 💡 不要な translateX(-50%) を完全に削除し、純粋に上に隠すアニメーションにします
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
    topConfigContainer.style.transform = `translateX(-50%) translateY(-${contentHeight + 30}px)`;
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
  if (isPinching) return; // 拡大縮小中は作成コーナーの動作を完全ブロック

  if (!hasMoved) {
    const isHidden = topConfigContainer.classList.contains('hidden');
    
    if (isHidden) {
      // 【閉じていた場合】作成コーナーを開く
      topConfigContainer.classList.remove('hidden');
      topConfigContainer.style.transform = 'translateY(0)';
      topToggleArrow.textContent = '▲';
      
      isFrameOpen = false;
      isStampOpen = false;
      updateSelectorVisibility();
    } else {
      // 【すでに開いていた場合】中の黒いパネル（topConfigContent）だけを一瞬ピカッと光らせる
      topConfigContent.classList.remove('panel-highlight-effect');
      void topConfigContent.offsetWidth; // 再描画を促すおまじない
      topConfigContent.classList.add('panel-highlight-effect');
    }

    // 初回タップ時のみの案内トースト表示（途中で改行を挟みました）
    if (!hasShownFirstTapMessage) {
      hasShownFirstTapMessage = true; // 次回以降は表示しない

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
  const timeStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + "_" + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + String(now.getSeconds()).padStart(2, '0');
  saveBtn.download = `photo-frame_${timeStr}.png`;

  preview.style.display = 'block';
  setTimeout(() => preview.classList.add('show'), 30);
});

retakeBtn.addEventListener('click', () => {
  preview.classList.remove('show');
  setTimeout(() => { preview.style.display = 'none'; }, 300);
});

shareBtn.addEventListener('click', async () => {
  if (!currentDataUrl) return;

  try {
    const response = await fetch(currentDataUrl);
    const blob = await response.blob();
    const file = new File([blob], "photo-frame.png", { type: "image/png" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: '日付付きフォトフレーム',
        text: '新しく写真を撮影しました！'
      });
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
    // 💡 修正：translateX(-50%) を完全に消去し、純粋に translateY だけにします
    topConfigContainer.style.transform = `translateY(-${contentHeight + 30}px)`; 
    topConfigContainer.classList.add('hidden'); 
    topToggleArrow.textContent = '▼';
  }
});

/* ==========================================================================
 * 日付・カスタム文字の生成＆HTMLパーツ化（ひとかたまり化対応）
 * ========================================================================== */
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
  
  // 初期位置を画面中央にセット
  wrapper.style.left = '50%';
  wrapper.style.top = '50%';
  wrapper.style.transform = 'translate(-50%, -50%) scale(1)';
  
  const img = document.createElement('img');
  img.src = src;
  img.className = 'placed-stamp-img';
  
  // 移動ハンドル（左上）
  const handleBtn = document.createElement('div');
  handleBtn.className = 'drag-handle-btn';
  handleBtn.innerHTML = '<img src="img/ico_move.png" alt="移動">';
  
  // 閉じるボタン（右上）
  const closeBtn = document.createElement('div');
  closeBtn.className = 'close-box-btn';
  closeBtn.innerHTML = '<img src="img/ico_close.png" alt="閉じる">';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    wrapper.remove(); 
  });
  
  // 💡 拡大縮小ハンドル（右下）
  const resizeBtn = document.createElement('div');
  resizeBtn.className = 'resize-handle-btn';
  resizeBtn.innerHTML = '<img src="img/ico_size.png" alt="拡大縮小">'; 
  

  wrapper.appendChild(img);
  wrapper.appendChild(handleBtn);
  wrapper.appendChild(closeBtn);
  wrapper.appendChild(resizeBtn);
  document.body.appendChild(wrapper);
  
  // ドラッグ移動と拡大縮小の機能を紐付け
  makeStampInteractive(wrapper, resizeBtn);
}

function makeStampInteractive(el, resizeBtn) {
  let startX = 0, startY = 0;
  let currentX = 0, currentY = 0;
  let currentScale = 1;

  // 1. ドラッグ移動の処理（スタンプ本体または左上ハンドルを掴んだとき）
  el.addEventListener('touchstart', (e) => {
    if (document.body.classList.contains('hide-ui-mode')) return;
    // 右下ハンドルを触っているときは移動処理を走らせない
    if (e.target.closest('.resize-handle-btn')) return;

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
    if (e.target.closest('.resize-handle-btn')) return;

    const touch = e.touches[0];
    currentX = touch.clientX - startX;
    currentY = touch.clientY - startY;
    
    // 現在の拡大率（currentScale）を維持したまま移動させる
    el.style.transform = `translate(calc(-50% + ${currentX}px), calc(-50% + ${currentY}px)) scale(${currentScale})`;
  }, { passive: true });


  // 2. 💡 右下ハンドルによる拡大縮小処理
  let startDist = 0;
  let startScale = 1;

  resizeBtn.addEventListener('touchstart', (e) => {
    e.stopPropagation(); // 移動イベントと混ざるのを防ぐ
    if (document.body.classList.contains('hide-ui-mode')) return;

    const touch = e.touches[0];
    const rect = el.getBoundingClientRect();
    
    // スタンプの中心座標を計算
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // タップした位置から中心までの初期距離を計算
    startDist = Math.sqrt(Math.pow(touch.clientX - centerX, 2) + Math.pow(touch.clientY - centerY, 2));
    startScale = currentScale;
  }, { passive: true });

  resizeBtn.addEventListener('touchmove', (e) => {
    e.stopPropagation();
    if (document.body.classList.contains('hide-ui-mode')) return;

    const touch = e.touches[0];
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // 動かした位置から中心までの現在の距離を計算
    const currentDist = Math.sqrt(Math.pow(touch.clientX - centerX, 2) + Math.pow(touch.clientY - centerY, 2));
    
    // 縮小されすぎ・拡大されすぎを防ぐ制限（0.4倍〜3倍まで）
    currentScale = Math.max(0.4, Math.min(startScale * (currentDist / startDist), 3));
    
    // 位置（currentX, currentY）をキープしたまま、大きさだけをリアルタイム変形
    el.style.transform = `translate(calc(-50% + ${currentX}px), calc(-50% + ${currentY}px)) scale(${currentScale})`;
  }, { passive: true });
}