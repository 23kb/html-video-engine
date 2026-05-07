// Persistent per-video scene registry.
//
// Used for long-lived editorial/Three.js surfaces that should survive chapter
// teardown. The mount callback runs once per id; later calls return the same
// instance.

const scenes = new Map();

export async function getSharedScene({ id, mount } = {}) {
  if (!id) throw new Error('getSharedScene: { id } required');
  if (scenes.has(id)) return scenes.get(id).instance;
  if (typeof mount !== 'function') {
    throw new Error('getSharedScene: first call for "' + id + '" requires mount(stage, gsap)');
  }
  const stage = document.body;
  const gsap = window.gsap || null;
  const instance = await mount(stage, gsap);
  scenes.set(id, { instance });
  return instance;
}

export async function disposeSharedScene(id) {
  const entry = scenes.get(id);
  if (!entry) return;
  scenes.delete(id);
  try {
    await entry.instance?.dispose?.();
  } catch (e) {
    console.warn('[shared-scene] dispose failed', id, e);
  }
}

export async function disposeAllSharedScenes() {
  for (const id of [...scenes.keys()]) await disposeSharedScene(id);
}

