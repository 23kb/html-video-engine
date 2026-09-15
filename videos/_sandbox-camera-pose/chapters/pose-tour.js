import { registerCameraPose } from '../../_shared/kit.js';
import { sel } from './_selectors.js';

export async function setup() {
  registerCameraPose('focus',    { focus: sel.focus,    level: 1.6, pad: 14 });
  registerCameraPose('station',  { focus: sel.station,  level: 1.1, pad: 24 });
  registerCameraPose('overview', { focus: sel.overview, level: 1.0, pad: 0  });
}

export default [
  {
    id: 'overview',
    camera: 'overview',
    effect: async ({ sleep }) => {
      await sleep(2000);
    },
  },
  {
    id: 'station',
    camera: 'station',
    effect: async ({ sleep }) => {
      await sleep(2000);
    },
  },
  {
    id: 'focus',
    camera: 'focus',
    effect: async ({ sleep }) => {
      await sleep(2000);
    },
  },
];
