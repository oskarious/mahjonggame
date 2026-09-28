<script lang="ts">
  import { onMount } from 'svelte';

  // The background pattern (tokens --bg-pattern* / --bg-drift-period in app.css), drawn on a canvas and drifting from
  // top-right to bottom-left. A canvas rather than a CSS transform animation: Firefox snaps slowly moving layers to
  // whole pixels, so at a few px/s the drift moved in visible steps. Canvas drawing at fractional offsets is smoothed.

  /** Redraw at most this often while drifting (~5 px/s needs no more than 30 fps to look smooth). */
  const FRAME_MS = 1000 / 30;

  let canvas: HTMLCanvasElement;

  onMount(() => {
    const css = getComputedStyle(document.documentElement);
    const src = /url\(\s*['"]?([^'")]+)['"]?\s*\)/.exec(css.getPropertyValue('--bg-pattern'))?.[1];
    if (!src) return;
    const size = parseFloat(css.getPropertyValue('--bg-pattern-size')) || 128;
    const invert = css.getPropertyValue('--bg-pattern-invert').trim() === '1';
    const periodRaw = css.getPropertyValue('--bg-drift-period').trim();
    const period = (parseFloat(periodRaw) || 24) * (periodRaw.endsWith('ms') ? 1 : 1000);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const still = matchMedia('(prefers-reduced-motion: reduce)');

    let pattern: CanvasPattern | null = null;
    let frame = 0;
    let last = -Infinity;

    function draw(t: number) {
      if (!pattern || !ctx) return;
      const off = still.matches ? 0 : ((t % period) / period) * size;
      ctx.setTransform(1, 0, 0, 1, -off, off);
      ctx.fillStyle = pattern;
      ctx.fillRect(-size, -size, canvas.width + 2 * size, canvas.height + 2 * size);
    }
    function tick(t: number) {
      frame = requestAnimationFrame(tick);
      if (t - last < FRAME_MS) return;
      last = t;
      draw(t);
    }
    function start() {
      cancelAnimationFrame(frame);
      if (still.matches) draw(0);
      else frame = requestAnimationFrame(tick);
    }
    function resize() {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      draw(performance.now());
    }

    const img = new Image();
    img.onload = () => {
      // One tile at the drawn size, inverted once here if the motif is the white part.
      const tile = document.createElement('canvas');
      tile.width = tile.height = size;
      const t = tile.getContext('2d');
      if (!t) return;
      t.drawImage(img, 0, 0, size, size);
      if (invert) {
        t.globalCompositeOperation = 'difference';
        t.fillStyle = '#fff';
        t.fillRect(0, 0, size, size);
      }
      pattern = ctx.createPattern(tile, 'repeat');
      resize();
      start();
    };
    img.src = src;

    addEventListener('resize', resize);
    still.addEventListener('change', start);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('resize', resize);
      still.removeEventListener('change', start);
    };
  });
</script>

<canvas class="bg-pattern" bind:this={canvas} aria-hidden="true"></canvas>
