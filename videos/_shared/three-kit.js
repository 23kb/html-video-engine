// videos/_shared/three-kit.js
//
// Shared Three.js scene helpers for editorial-mode videos. Split from
// kit.js so GSAP-only videos don't pull the ~600 KB Three.js bundle.
//
// Vendored at /vendor/three/0.169.0/three.module.min.js (ESM-only since
// r148). Loaded once, cached on window.THREE so a chapter that mounts a
// Three.js scene and another chapter that does the same in the same
// playback share one library instance.
//
// See docs/chapter-module-contract.md "Shared video-author kit" for the
// import allowlist amendment.

let threePromise = null;

export function loadThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (threePromise) return threePromise;
  threePromise = (async () => {
    const mod = await import('/vendor/three/0.169.0/three.module.min.js');
    window.THREE = mod;
    return mod;
  })();
  return threePromise;
}

// Mount a transparent WebGL canvas in its own stage layer. Returns
// { THREE, scene, camera, renderer, animate, dispose, layer }. Caller
// populates `scene` and drives `camera` (typically via GSAP). Caller is
// responsible for calling dispose() on chapter teardown to free the GL
// context — browsers cap concurrent contexts (~16) and leaks across
// chapter boundaries leak quickly.
export async function mountThreeScene(stageLayerId, opts = {}) {
  const THREE = await loadThree();
  const {
    z = 70,
    alpha = true,
    fov = 45,
    cameraZ = 8,
    background = null,
    antialias = true,
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2),
  } = opts;

  const layer = document.createElement('div');
  layer.id = stageLayerId;
  Object.assign(layer.style, {
    position: 'fixed', inset: '0', pointerEvents: 'none',
    zIndex: String(z), overflow: 'hidden',
  });
  document.body.appendChild(layer);

  const w = window.innerWidth, h = window.innerHeight;
  const renderer = new THREE.WebGLRenderer({ alpha, antialias });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(w, h);
  if (background !== null) renderer.setClearColor(background, 1);
  else renderer.setClearColor(0x000000, 0);
  layer.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 1000);
  camera.position.set(0, 0, cameraZ);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(5, 6, 8);
  scene.add(key);

  let rafId = 0;
  let onTick = null;

  function animate(tickFn) {
    onTick = tickFn || null;
    const loop = (t) => {
      rafId = requestAnimationFrame(loop);
      if (onTick) onTick(t);
      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(loop);
  }

  function onResize() {
    const W = window.innerWidth, H = window.innerHeight;
    renderer.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);

  function dispose() {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', onResize);
    onTick = null;

    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          for (const k in m) {
            const v = m[k];
            if (v && typeof v === 'object' && 'minFilter' in v) v.dispose?.();
          }
          m.dispose?.();
        });
      }
    });
    renderer.dispose();
    renderer.forceContextLoss?.();
    renderer.domElement?.remove();
    layer.remove();
  }

  return { THREE, scene, camera, renderer, animate, dispose, layer };
}
