// Line-draw animation for teasers, section flourishes, outro flourishes.
//
// Declarative: pass an SVG path `d` string and we animate
// `stroke-dashoffset` from the full path length down to 0 so the stroke
// appears to draw itself. Uses no external deps.
//
// Authoring (as a verb):
//   { id: 'sketch', do: 'lineDraw',
//     d: 'M120 240 C 300 80, 520 80, 720 240',
//     stroke: '#E27730', width: 3, duration: 900, holdMs: 1200 }
//
// Or call directly from a teaser:
//   const { dismiss } = await lineDraw({ d: '...', parent: teaserRoot });
//   // ... later:
//   dismiss();

/**
 * Draw a stroked SVG path as if it were being sketched live.
 *
 * @param {object} opts
 * @param {string} opts.d                - SVG path data
 * @param {string} [opts.stroke='#E27730']
 * @param {number} [opts.width=3]        - stroke-width in px
 * @param {number} [opts.duration=900]   - ms to complete the draw
 * @param {number} [opts.holdMs=0]       - wait after draw completes before returning
 * @param {string} [opts.fill='none']
 * @param {HTMLElement} [opts.parent]    - where to mount (default: body, fixed)
 * @param {number} [opts.vw=1440]        - SVG viewBox width
 * @param {number} [opts.vh=900]         - SVG viewBox height
 * @param {string} [opts.linecap='round']
 * @param {number} [opts.zIndex=850]
 * @returns {{ svg: SVGSVGElement, dismiss: () => void, done: Promise<void> }}
 */
export async function lineDraw(opts = {}) {
  const {
    d, stroke = '#E27730', width = 3,
    duration = 900, holdMs = 0, fill = 'none',
    parent, vw = 1440, vh = 900, linecap = 'round',
    zIndex = 850,
  } = opts;

  if (!d) throw new Error('lineDraw: `d` is required');

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  if (parent) {
    svg.style.position = 'absolute';
    svg.style.inset = '0';
    svg.style.width  = '100%';
    svg.style.height = '100%';
  } else {
    svg.style.position = 'fixed';
    svg.style.inset = '0';
    svg.style.width  = '100vw';
    svg.style.height = '100vh';
    svg.style.zIndex = String(zIndex);
  }
  svg.style.pointerEvents = 'none';

  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', fill);
  path.setAttribute('stroke', stroke);
  path.setAttribute('stroke-width', String(width));
  path.setAttribute('stroke-linecap', linecap);
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);

  (parent || document.body).appendChild(svg);

  // Must be in the DOM before getTotalLength returns a real number.
  const len = path.getTotalLength() || 0;
  path.style.strokeDasharray  = String(len);
  path.style.strokeDashoffset = String(len);

  // Two RAFs before the transition change — first lets layout happen with
  // offset=len, second gives the browser a paint tick so the subsequent
  // transition+offset change is observed as a real animation instead of
  // being batched into the same frame (which produces "line appears all at
  // once" — no animation).
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  path.style.transition = `stroke-dashoffset ${duration}ms cubic-bezier(.4,0,.2,1)`;
  path.style.strokeDashoffset = '0';

  const done = new Promise(r => setTimeout(r, duration + holdMs));

  return {
    svg, path,
    done,
    dismiss: () => { svg.remove(); },
  };
}
