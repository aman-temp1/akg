/**
 * The "neural field": a grid of nodes that lean toward the pointer and wire up
 * to their neighbours near it, like a network lighting up. Canvas 2D only.
 * With `text`, nodes inside the glyphs are drawn heavier (used on the 404 page)
 * and the pointer scatters them instead of attracting them.
 */
interface Node {
  bx: number;
  by: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number; // weight 0..1 (inside text glyphs)
}

export function mountNeuralField(canvas: HTMLCanvasElement, opts: { text?: string } = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const reduced = !document.documentElement.classList.contains('motion');
  const scatter = !!opts.text;
  let nodes: Node[] = [];
  let grid = new Map<number, Node[]>();
  let w = 0;
  let h = 0;
  let dpr = 1;
  let gap = 28;
  let raf = 0;
  let visible = true;
  let ink = '#0e0e0e';
  const pointer = { x: -9999, y: -9999, active: false, sx: -9999, sy: -9999 };
  const R = () => Math.min(220, Math.max(140, w * 0.14));
  const LINK = () => gap * 1.6;

  const readInk = () => {
    ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || ink;
  };

  const textMask = (cols: number, rows: number) => {
    if (!opts.text) return null;
    const off = document.createElement('canvas');
    off.width = cols;
    off.height = rows;
    const o = off.getContext('2d')!;
    o.fillStyle = '#000';
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    o.font = `600 ${Math.floor(rows * 0.62)}px Geist Variable, system-ui, sans-serif`;
    o.fillText(opts.text, cols / 2, rows / 2);
    return o.getImageData(0, 0, cols, rows).data;
  };

  const build = () => {
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gap = w < 640 ? 22 : opts.text ? 16 : 28;
    const cols = Math.ceil(w / gap) + 1;
    const rows = Math.ceil(h / gap) + 1;
    const mask = textMask(cols, rows);
    const ox = (w - (cols - 1) * gap) / 2;
    const oy = (h - (rows - 1) * gap) / 2;
    nodes = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const bx = ox + i * gap;
        const by = oy + j * gap;
        const wgt = mask ? mask[(j * cols + i) * 4 + 3] / 255 : 0;
        nodes.push({ bx, by, x: bx, y: by, vx: 0, vy: 0, w: wgt });
      }
    }
    readInk();
  };

  const key = (cx: number, cy: number) => cx * 4096 + cy;
  const rehash = () => {
    grid = new Map();
    const cell = LINK();
    for (const n of nodes) {
      const k = key(Math.floor(n.x / cell), Math.floor(n.y / cell));
      const bucket = grid.get(k);
      bucket ? bucket.push(n) : grid.set(k, [n]);
    }
  };

  let moving = false;
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    moving = false;
    const r = R();
    const link = LINK();
    // ease the pointer itself so the field feels heavy
    pointer.sx += (pointer.x - pointer.sx) * 0.18;
    pointer.sy += (pointer.y - pointer.sy) * 0.18;
    const px = pointer.sx;
    const py = pointer.sy;

    for (const n of nodes) {
      const dx = px - n.bx;
      const dy = py - n.by;
      const d = Math.hypot(dx, dy);
      let tx = n.bx;
      let ty = n.by;
      if (pointer.active && d < r) {
        const f = (1 - d / r) ** 2;
        const pull = scatter ? -0.9 : 0.32;
        tx += dx * f * pull;
        ty += dy * f * pull;
      }
      n.vx = (n.vx + (tx - n.x) * 0.08) * 0.82;
      n.vy = (n.vy + (ty - n.y) * 0.08) * 0.82;
      n.x += n.vx;
      n.y += n.vy;
      if (Math.abs(n.vx) + Math.abs(n.vy) > 0.02) moving = true;
    }

    // connections near the pointer
    if (pointer.active) {
      rehash();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 0.6;
      const cell = link;
      for (const n of nodes) {
        const dp = Math.hypot(px - n.x, py - n.y);
        if (dp > r) continue;
        const cx = Math.floor(n.x / cell);
        const cy = Math.floor(n.y / cell);
        for (let a = 0; a <= 1; a++) {
          for (let b = -1; b <= 1; b++) {
            const bucket = grid.get(key(cx + a, cy + b));
            if (!bucket) continue;
            for (const m of bucket) {
              if (m === n || (a === 0 && m.y < n.y) || (a === 0 && m.y === n.y && m.x <= n.x)) continue;
              const dl = Math.hypot(m.x - n.x, m.y - n.y);
              if (dl > link) continue;
              ctx.globalAlpha = (1 - dp / r) * (1 - dl / link) * 0.55;
              ctx.beginPath();
              ctx.moveTo(n.x, n.y);
              ctx.lineTo(m.x, m.y);
              ctx.stroke();
            }
          }
        }
      }
    }

    ctx.fillStyle = ink;
    for (const n of nodes) {
      const dp = pointer.active ? Math.hypot(px - n.x, py - n.y) : Infinity;
      const near = dp < r ? 1 - dp / r : 0;
      ctx.globalAlpha = 0.16 + near * 0.7 + n.w * 0.6;
      const s = 1 + near * 1.4 + n.w * 1.6;
      ctx.fillRect(n.x - s / 2, n.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  };

  const loop = () => {
    draw();
    // Sleep when nothing moves; the next pointer move wakes the loop
    raf = visible && (pointer.active || moving) ? requestAnimationFrame(loop) : 0;
  };
  const start = () => {
    if (!raf && visible && !reduced) raf = requestAnimationFrame(loop);
  };

  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    if (!pointer.active) {
      pointer.sx = pointer.x;
      pointer.sy = pointer.y;
    }
    pointer.active = pointer.y > -40 && pointer.y < h + 40;
    start();
  };
  const onLeave = () => (pointer.active = false);
  const ro = new ResizeObserver(() => {
    build();
    draw();
  });
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    start();
  });
  const mo = new MutationObserver(() => {
    readInk();
    if (reduced) draw();
  });

  build();
  draw();
  ro.observe(canvas);
  io.observe(canvas);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (!reduced) {
    addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    start();
  }

  return () => {
    cancelAnimationFrame(raf);
    raf = 0;
    visible = false;
    ro.disconnect();
    io.disconnect();
    mo.disconnect();
    removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerleave', onLeave);
  };
}
