// Stub — returns empty data until the backend is wired up.
const delay = (ms = 60) => new Promise(r => setTimeout(r, ms));

export async function getFrames() {
  await delay();
  return [];
}

export async function createAnimation() {
  await delay();
  return { id: `anim_${Date.now()}`, frames: [] };
}
