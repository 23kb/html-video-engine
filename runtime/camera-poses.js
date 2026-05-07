// Named camera-pose registry for iframe tutorials.

const poses = new Map();

export function registerCameraPose(name, spec) {
  if (!name) throw new Error('registerCameraPose: name required');
  poses.set(name, { ...(spec || {}) });
}

export function unregisterCameraPose(name) {
  poses.delete(name);
}

export function clearCameraPoses() {
  poses.clear();
}

export function resolveCameraPose(pose) {
  if (!pose) return null;
  if (typeof pose === 'string') {
    const spec = poses.get(pose);
    if (!spec) throw new Error('unknown camera pose: ' + pose);
    return { ...spec, name: pose };
  }
  return pose;
}

