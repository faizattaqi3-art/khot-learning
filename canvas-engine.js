const arabicFont = '64px "Noto Naskh Arabic", "Amiri", "Traditional Arabic", serif';

export function initCanvasEngine({ mode = 'free', onSave = () => {}, onSubmit = () => {} } = {}) {
  const guide = document.getElementById('guide-canvas');
  const ink = document.getElementById('ink-canvas');
  if (!guide || !ink) return null;
  const gctx = guide.getContext('2d');
  const ctx = ink.getContext('2d');
  const wrap = ink.parentElement;
  const controls = {
    color: document.getElementById('pen-color'),
    size: document.getElementById('pen-size'),
    opacity: document.getElementById('guide-opacity'),
    template: document.getElementById('template-select'),
    paper: document.getElementById('paper-select')
  };
  let activeTool = 'pen';
  let drawing = false;
  let lastPoint = null;
  let history = [];
  let historyIndex = -1;
  let dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  let cssWidth = 0;
  let cssHeight = 0;

  function pointFromEvent(event) {
    const rect = ink.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (cssWidth / rect.width), y: (event.clientY - rect.top) * (cssHeight / rect.height) };
  }

  function drawGuide() {
    const width = cssWidth, height = cssHeight;
    gctx.clearRect(0, 0, width, height);
    if (mode === 'tracing') {
      const text = controls.template?.value || 'ا ب ت ث';
      const opacity = Number(controls.opacity?.value ?? 25) / 100;
      gctx.save();
      gctx.globalAlpha = opacity;
      gctx.fillStyle = '#9a7950';
      gctx.font = ` ${Math.max(34, Math.min(78, width / 9))}px "Noto Naskh Arabic", "Amiri", "Traditional Arabic", serif`;
      gctx.textAlign = 'center';
      gctx.textBaseline = 'middle';
      gctx.direction = 'rtl';
      gctx.fillText(text, width / 2, height / 2 - 10, width * .84);
      gctx.restore();
      gctx.save();
      gctx.strokeStyle = 'rgba(181,139,77,.30)';
      gctx.setLineDash([5, 7]);
      gctx.beginPath();
      gctx.moveTo(width * .08, height * .76);
      gctx.lineTo(width * .92, height * .76);
      gctx.stroke();
      gctx.restore();
    } else {
      gctx.save();
      gctx.strokeStyle = 'rgba(181,139,77,.20)';
      gctx.setLineDash([3, 7]);
      gctx.beginPath();
      gctx.moveTo(width * .06, height * .76);
      gctx.lineTo(width * .94, height * .76);
      gctx.stroke();
      gctx.restore();
    }
  }

  function resize() {
    const rect = wrap.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const old = ink.width ? ink.toDataURL() : null;
    cssWidth = rect.width;
    cssHeight = rect.height;
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    [guide, ink].forEach(canvas => {
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
    });
    gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (old) {
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0, cssWidth, cssHeight);
      image.src = old;
    }
    drawGuide();
    if (!history.length) pushHistory();
  }

  function pushHistory() {
    const snapshot = ink.toDataURL('image/png');
    history = history.slice(0, historyIndex + 1);
    history.push(snapshot);
    if (history.length > 35) history.shift();
    historyIndex = history.length - 1;
    updateHistoryButtons();
  }

  function restoreSnapshot(index) {
    if (index < 0 || index >= history.length) return;
    historyIndex = index;
    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.drawImage(image, 0, 0, cssWidth, cssHeight);
      updateHistoryButtons();
    };
    image.src = history[index];
  }

  function updateHistoryButtons() {
    const undo = document.getElementById('canvas-undo');
    const redo = document.getElementById('canvas-redo');
    if (undo) undo.disabled = historyIndex <= 0;
    if (redo) redo.disabled = historyIndex >= history.length - 1;
  }

  function startDrawing(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    drawing = true;
    lastPoint = pointFromEvent(event);
    try { ink.setPointerCapture(event.pointerId); } catch {}
    const p = lastPoint;
    ctx.save();
    ctx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = controls.color?.value || '#302116';
    ctx.fillStyle = controls.color?.value || '#302116';
    ctx.lineWidth = Number(controls.size?.value || 4) * (event.pressure && event.pressure > 0 ? Math.max(.55, event.pressure * 1.5) : 1);
    ctx.beginPath();
    ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function moveDrawing(event) {
    if (!drawing || !lastPoint) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    ctx.save();
    ctx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = controls.color?.value || '#302116';
    ctx.lineWidth = Number(controls.size?.value || 4) * (event.pressure && event.pressure > 0 ? Math.max(.55, event.pressure * 1.5) : 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    const midX = (lastPoint.x + point.x) / 2;
    const midY = (lastPoint.y + point.y) / 2;
    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midX, midY);
    ctx.stroke();
    ctx.restore();
    lastPoint = point;
  }

  function endDrawing(event) {
    if (!drawing) return;
    drawing = false;
    lastPoint = null;
    try { ink.releasePointerCapture(event.pointerId); } catch {}
    pushHistory();
  }

  function exportPng() {
    const output = document.createElement('canvas');
    output.width = ink.width;
    output.height = ink.height;
    const out = output.getContext('2d');
    out.fillStyle = '#fffdf8';
    out.fillRect(0, 0, output.width, output.height);
    out.drawImage(guide, 0, 0);
    out.drawImage(ink, 0, 0);
    return output.toDataURL('image/png');
  }

  function save() {
    const dataUrl = exportPng();
    onSave(dataUrl);
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = `khot-learning-${Date.now()}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  ink.addEventListener('pointerdown', startDrawing);
  ink.addEventListener('pointermove', moveDrawing);
  ink.addEventListener('pointerup', endDrawing);
  ink.addEventListener('pointercancel', endDrawing);
  ink.addEventListener('lostpointercapture', endDrawing);
  controls.opacity?.addEventListener('input', drawGuide);
  controls.template?.addEventListener('change', drawGuide);
  controls.paper?.addEventListener('change', () => {
    wrap.classList.remove('grid-paper', 'ruled-paper');
    if (controls.paper.value === 'grid') wrap.classList.add('grid-paper');
    if (controls.paper.value === 'ruled') wrap.classList.add('ruled-paper');
  });

  document.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', () => {
    activeTool = button.dataset.tool;
    document.querySelectorAll('[data-tool]').forEach(item => item.classList.toggle('active', item === button));
  }));
  document.getElementById('canvas-undo')?.addEventListener('click', () => restoreSnapshot(historyIndex - 1));
  document.getElementById('canvas-redo')?.addEventListener('click', () => restoreSnapshot(historyIndex + 1));
  document.getElementById('canvas-clear')?.addEventListener('click', () => {
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    pushHistory();
  });
  document.getElementById('canvas-reset')?.addEventListener('click', () => {
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    drawGuide();
    pushHistory();
  });
  document.getElementById('canvas-save')?.addEventListener('click', save);
  document.getElementById('canvas-submit')?.addEventListener('click', () => onSubmit(exportPng()));

  const observer = new ResizeObserver(() => resize());
  observer.observe(wrap);
  requestAnimationFrame(resize);

  return { exportPng, clear() { ctx.clearRect(0, 0, cssWidth, cssHeight); pushHistory(); }, destroy() { observer.disconnect(); } };
}
