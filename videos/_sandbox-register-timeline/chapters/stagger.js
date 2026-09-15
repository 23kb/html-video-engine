import { loadGsap, registerTimeline, awaitTween } from '../../_shared/kit.js';

export const mode = 'editorial';

export default [
  {
    id: 'stagger',
    effect: async ({ sleep }) => {
      const gsap = await loadGsap({ flip: false, motionPath: false });

      const card = document.createElement('div');
      card.id = 'sandbox-card';
      Object.assign(card.style, {
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '480px',
        padding: '32px 40px',
        background: '#101a2c',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
        zIndex: '40',
        fontFamily: 'system-ui, sans-serif',
        color: '#f7fbff',
      });

      const rows = [];
      for (let i = 0; i < 5; i += 1) {
        const row = document.createElement('div');
        row.className = 'sandbox-row';
        row.textContent = `Row ${i + 1}`;
        Object.assign(row.style, {
          padding: '14px 18px',
          margin: '8px 0',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '8px',
          fontSize: '18px',
        });
        card.appendChild(row);
        rows.push(row);
      }
      document.body.appendChild(card);

      const tl = gsap.timeline({ paused: true, delay: 1.0 });
      tl.from(rows, {
        y: 50,
        autoAlpha: 0,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.1,
      });
      registerTimeline(tl, { id: '_sandbox-register-timeline:stagger' });

      await awaitTween(tl, { duration: 1.0 + 0.6 + 0.1 * 4 });
      await sleep(10000);

      card.remove();
    },
  },
];
