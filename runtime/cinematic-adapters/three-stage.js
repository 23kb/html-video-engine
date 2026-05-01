// Cinematic adapter · Three.js stage.
//
// Lifecycle-only helper for intro / outro / post-intro cinematics. It creates
// a transparent WebGL canvas inside a caller-owned container and returns a
// small render-loop contract with cleanup. No player/compiler coupling.

const THREE_URL = 'https://unpkg.com/three@0.160.0/build/three.module.js';

let threeReady = null;

export function loadThree() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('cinematic-adapters/three-stage: window required'));
  }
  if (!threeReady) threeReady = import(THREE_URL);
  return threeReady;
}

function disposeObject(THREE, object) {
  object.traverse((child) => {
    if (child.geometry && typeof child.geometry.dispose === 'function') {
      child.geometry.dispose();
    }
    const materials = Array.isArray(child.material)
      ? child.material
      : child.material ? [child.material] : [];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value && value.isTexture && typeof value.dispose === 'function') {
          value.dispose();
        }
      }
      if (typeof material.dispose === 'function') material.dispose();
    }
  });
}

/**
 * Create a transparent Three.js stage in a container.
 *
 * @param {HTMLElement} container
 * @param {object} [opts]
 * @returns {Promise<{
 *   THREE: object,
 *   scene: object,
 *   camera: object,
 *   renderer: object,
 *   render: () => void,
 *   start: (tick?: (dt:number, elapsed:number) => void) => void,
 *   stop: () => void,
 *   cleanup: () => void
 * }>}
 */
export async function createThreeStage(container, opts = {}) {
  if (!container) throw new Error('createThreeStage: container required');

  const THREE = await loadThree();
  const scene = new THREE.Scene();
  const cameraOpts = opts.camera || {};
  const camera = new THREE.PerspectiveCamera(
    cameraOpts.fov || 35,
    1,
    cameraOpts.near || 0.1,
    cameraOpts.far || 100
  );
  camera.position.set(
    cameraOpts.x || 0,
    cameraOpts.y || 0,
    cameraOpts.z || 5
  );

  const renderer = new THREE.WebGLRenderer({
    alpha: opts.alpha !== false,
    antialias: opts.antialias !== false,
    preserveDrawingBuffer: opts.preserveDrawingBuffer === true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio || 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.inset = '0';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  let raf = 0;
  let running = false;
  let last = 0;
  let elapsed = 0;

  function resize() {
    const rect = container.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function render() {
    resize();
    renderer.render(scene, camera);
  }

  function loop(now) {
    if (!running) return;
    const dt = last ? (now - last) / 1000 : 0;
    last = now;
    elapsed += dt;
    if (typeof stage.tick === 'function') stage.tick(dt, elapsed);
    render();
    raf = window.requestAnimationFrame(loop);
  }

  function start(tick) {
    if (typeof tick === 'function') stage.tick = tick;
    if (running) return;
    running = true;
    last = 0;
    raf = window.requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  }

  function cleanup() {
    stop();
    window.removeEventListener('resize', render);
    disposeObject(THREE, scene);
    renderer.dispose();
    renderer.domElement.remove();
  }

  const stage = {
    THREE, scene, camera, renderer,
    tick: null,
    render, start, stop, cleanup,
  };

  resize();
  render();
  window.addEventListener('resize', render, { passive: true });
  return stage;
}
