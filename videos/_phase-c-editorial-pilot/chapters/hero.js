import { loadGsap, registerTimeline } from '../../_shared/kit.js';
import { mountDarkBackdrop, mountGrain, mountSweep, mountParallaxPair } from '../../_shared/atmospheric.js';
import { mountTextReveal } from '../../_shared/text-kit.js';

export const mode = 'editorial';

export async function setup() {
  document.body.classList.add('phase-c-editorial-pilot');
}

export default [
  {
    id: 'hero',
    effect: async ({ sleep }) => {
      const gsap = await loadGsap({ flip: false, motionPath: false });
      const bg = mountDarkBackdrop({ color: '#071018', zIndex: 10 });
      const grain = mountGrain({ opacity: 0.025, seed: 20260507, zIndex: 20 });
      const sweep = mountSweep({ color: 'rgba(226,119,48,0.16)', angle: 112, zIndex: 24 });
      const parallax = mountParallaxPair({ zIndexBack: 14, zIndexFront: 15 });
      const title = mountTextReveal('WPForms 2.0', {
        preset: 'top-down-letters',
        size: 104,
        weight: 800,
        color: '#f7fbff',
        zIndex: 40,
      });
      const logo = document.createElement('img');
      logo.src = '/assets/wpforms-logo.png';
      logo.alt = '';
      Object.assign(logo.style, {
        position: 'fixed',
        left: '50%',
        top: '58%',
        width: '210px',
        transform: 'translate(-50%, 26px)',
        opacity: '0',
        zIndex: '42',
        pointerEvents: 'none',
      });
      document.body.appendChild(logo);

      const tl = gsap.timeline({ paused: true });
      parallax.tweenInto(tl, { duration: 10.5, position: 0 });
      sweep.tweenInto(tl, { duration: 7.5, position: 0.25 });
      title.tweenInto(tl, { position: 1.1 });
      tl.to(logo, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 2.25)
        .to([title.el, logo], { opacity: 0, y: -18, duration: 0.7, ease: 'power2.inOut' }, 9.5);
      registerTimeline(tl, { id: '_phase-c-editorial-pilot:hero' });

      await sleep(11000);
      title.dispose();
      logo.remove();
      sweep.dispose();
      parallax.dispose();
      grain.dispose();
      bg.dispose();
    },
  },
];
