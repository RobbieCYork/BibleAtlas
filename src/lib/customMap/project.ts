/* The saved custom-map project: several slides, kept on this device only. */
import { PLACES, type PlaceKey } from "./places";

export interface MapViewState {
  lng: number;
  lat: number;
  /** MapLibre zoom as it applies to the slide's reference map width (geometry.ts MAP_W). */
  zoom: number;
}

export interface Slide {
  id: string;
  title: string;
  /** In list order. A place may repeat only on a journey (out and back). */
  places: PlaceKey[];
  /** Number the pins in list order and join them. */
  journey: boolean;
  /** Modern roads, borders and background place names. */
  modern: boolean;
  /** null = frame the places automatically. */
  view: MapViewState | null;
}

export interface Project {
  version: 1;
  slides: Slide[];
  current: string;
}

export const MAX_SLIDES = 30;
export const MAX_PLACES = 30;
export const MAX_TITLE = 80;

export const newId = () => Math.random().toString(36).slice(2, 10);

export const newSlide = (): Slide => ({ id: newId(), title: "", places: [], journey: false, modern: false, view: null });

export function newProject(): Project {
  const slide = newSlide();
  return { version: 1, slides: [slide], current: slide.id };
}

const storageKey = (userId: string) => `custom-map-project-v1:${userId}`;

const isView = (v: unknown): v is MapViewState => {
  const o = v as MapViewState | null;
  return !!o && Number.isFinite(o.lng) && Number.isFinite(o.lat) && Number.isFinite(o.zoom);
};

/** Reads whatever is stored and keeps only what still makes sense: a place whose record has been
 * removed or renamed is dropped rather than drawn from stale data. */
export function loadProject(userId: string): Project {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return newProject();
    const data = JSON.parse(raw) as Partial<Project>;
    if (data.version !== 1 || !Array.isArray(data.slides)) return newProject();
    const slides = data.slides.slice(0, MAX_SLIDES).map((s): Slide => ({
      id: typeof s?.id === "string" ? s.id : newId(),
      title: typeof s?.title === "string" ? s.title.slice(0, MAX_TITLE) : "",
      places: Array.isArray(s?.places) ? s.places.filter((k) => PLACES.has(k)).slice(0, MAX_PLACES) : [],
      journey: s?.journey === true,
      modern: s?.modern === true,
      view: isView(s?.view) ? s.view : null,
    }));
    if (slides.length === 0) return newProject();
    const current = slides.some((s) => s.id === data.current) ? data.current! : slides[0].id;
    return { version: 1, slides, current };
  } catch {
    return newProject();
  }
}

/** False when this device will not store it (private window, storage full). */
export function saveProject(userId: string, project: Project): boolean {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(project));
    return true;
  } catch {
    return false;
  }
}
