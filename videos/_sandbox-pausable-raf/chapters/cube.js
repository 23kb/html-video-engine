import { pausableRaf } from '../../_shared/kit.js';
import { mountThreeScene } from '../../_shared/three-kit.js';

export const mode = 'editorial';

export default [
  {
    id: 'cube',
    effect: async ({ sleep }) => {
      const { THREE, scene, camera, renderer, dispose } =
        await mountThreeScene('sandbox-pausable-raf-stage', {
          z: 60,
          fov: 45,
          cameraZ: 6,
          background: 0x0b1320,
        });

      const geom = new THREE.BoxGeometry(2, 2, 2);
      const mat = new THREE.MeshStandardMaterial({ color: 0xe27730 });
      const cube = new THREE.Mesh(geom, mat);
      scene.add(cube);

      let accumulated = 0;
      let lastTs = null;
      const stop = pausableRaf((ts) => {
        if (lastTs == null || ts - lastTs > 100) lastTs = ts;
        accumulated += ts - lastTs;
        lastTs = ts;
        cube.rotation.x = accumulated / 1000;
        cube.rotation.y = accumulated / 700;
        renderer.render(scene, camera);
      });

      await sleep(30000);

      stop();
      dispose();
    },
  },
];
