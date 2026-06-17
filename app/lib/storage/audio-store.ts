import localforage from "localforage";

const store = localforage.createInstance({
  name: "rhythm-vision",
  storeName: "audio",
});

const LIBRARY_KEY = "library";
const CURRENT_KEY = "currentTrackId";

export interface StoredTrack {
  id: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
  savedAt: number;
}

function createId() {
  return crypto.randomUUID();
}

async function readLibrary(): Promise<StoredTrack[]> {
  return (await store.getItem<StoredTrack[]>(LIBRARY_KEY)) ?? [];
}

async function writeLibrary(tracks: StoredTrack[]) {
  await store.setItem(LIBRARY_KEY, tracks);
}

export async function getLibrary(): Promise<StoredTrack[]> {
  const tracks = await readLibrary();
  return tracks.sort((a, b) => b.savedAt - a.savedAt);
}

export async function getCurrentTrackId(): Promise<string | null> {
  return store.getItem<string>(CURRENT_KEY);
}

export async function setCurrentTrackId(id: string | null) {
  if (id) await store.setItem(CURRENT_KEY, id);
  else await store.removeItem(CURRENT_KEY);
}

export async function addTrack(file: File): Promise<StoredTrack> {
  const track: StoredTrack = {
    id: createId(),
    fileName: file.name,
    mimeType: file.type || "audio/mpeg",
    blob: file,
    savedAt: Date.now(),
  };
  const tracks = await readLibrary();
  tracks.unshift(track);
  await writeLibrary(tracks);
  await setCurrentTrackId(track.id);
  return track;
}

export async function removeTrack(id: string): Promise<void> {
  const tracks = await readLibrary();
  const next = tracks.filter((t) => t.id !== id);
  await writeLibrary(next);
  const current = await getCurrentTrackId();
  if (current === id) {
    await setCurrentTrackId(next[0]?.id ?? null);
  }
}

export async function getTrack(id: string): Promise<StoredTrack | null> {
  const tracks = await getLibrary();
  return tracks.find((t) => t.id === id) ?? null;
}

export async function clearLibrary(): Promise<void> {
  await store.removeItem(LIBRARY_KEY);
  await store.removeItem(CURRENT_KEY);
}

export function trackToFile(track: StoredTrack): File {
  return new File([track.blob], track.fileName, { type: track.mimeType });
}
