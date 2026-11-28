import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Copy, Plus, Trash2, X } from "lucide-react";
import BackButton from "../BackButton";
import Icon from "../Icon";
import { CERTAINTY_LABEL, PLACES, type PlaceKey } from "../../lib/customMap/places";
import {
  MAX_PLACES,
  MAX_SLIDES,
  MAX_TITLE,
  loadProject,
  newId,
  newProject,
  newSlide,
  saveProject,
  type Project,
  type Slide,
} from "../../lib/customMap/project";
import { placesInFrame, slideTitle, stackedPins } from "../../lib/customMap/draw";
import { slideView } from "../../lib/customMap/export";
import StageMap from "./StageMap";
import PlaceSearch from "./PlaceSearch";
import PassagePicker from "./PassagePicker";
import ExportSheet from "./ExportSheet";
import PresentView from "./PresentView";
import "./CustomMap.css";

export default function CustomMapBuilder({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [project, setProject] = useState<Project>(() => loadProject(userId));
  const [unsaved, setUnsaved] = useState(false);
  const [adding, setAdding] = useState<"search" | "passage">("search");
  const [exporting, setExporting] = useState(false);
  const [presentAt, setPresentAt] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setUnsaved(!saveProject(userId, project)), [userId, project]);
  useEffect(() => rootRef.current?.focus(), []);

  const index = Math.max(0, project.slides.findIndex((s) => s.id === project.current));
  const slide = project.slides[index];

  const patch = (changes: Partial<Slide> | ((s: Slide) => Partial<Slide>)) => {
    const id = slide.id;
    setProject((p) => ({
      ...p,
      slides: p.slides.map((s) => (s.id === id ? { ...s, ...(typeof changes === "function" ? changes(s) : changes) } : s)),
    }));
  };
  const addPlaces = (keys: PlaceKey[]) =>
    patch((s) => {
      const places = [...s.places];
      for (const key of keys) {
        const repeat = s.journey ? places[places.length - 1] === key : places.includes(key);
        if (!repeat && places.length < MAX_PLACES) places.push(key);
      }
      return { places };
    });
  const removeAt = (i: number) => patch((s) => ({ places: s.places.filter((_, n) => n !== i) }));
  const movePlace = (i: number, step: number) =>
    patch((s) => {
      const places = [...s.places];
      [places[i], places[i + step]] = [places[i + step], places[i]];
      return { places };
    });

  const addSlide = (copy?: Slide) =>
    setProject((p) => {
      if (p.slides.length >= MAX_SLIDES) return p;
      const made = copy ? { ...copy, id: newId() } : newSlide();
      const slides = [...p.slides];
      slides.splice(index + 1, 0, made);
      return { ...p, slides, current: made.id };
    });
  const moveSlide = (step: number) =>
    setProject((p) => {
      const slides = [...p.slides];
      [slides[index], slides[index + step]] = [slides[index + step], slides[index]];
      return { ...p, slides };
    });
  const deleteSlide = () => {
    if (slide.places.length && !window.confirm(`Delete “${slideTitle(slide, index)}”?`)) return;
    setProject((p) => {
      const slides = p.slides.filter((s) => s.id !== slide.id);
      if (!slides.length) return newProject();
      return { ...p, slides, current: slides[Math.min(index, slides.length - 1)].id };
    });
  };
  const startOver = () => {
    if (window.confirm("Clear every slide and start a new map?")) setProject(newProject());
  };

  const outside = useMemo(() => {
    const inside = new Set(placesInFrame(slide, slideView(slide)));
    return new Set(slide.places.filter((k) => !inside.has(k)));
  }, [slide]);

  const stacked = useMemo(() => stackedPins(slide, slideView(slide)), [slide]);

  const presentable = project.slides.map((s, i) => ({ slide: s, index: i })).filter((i) => i.slide.places.length > 0);
  const present = () => {
    // Asked for inside the tap; iPhones have no full screen for a page, and the view covers it anyway.
    void document.documentElement.requestFullscreen?.().catch(() => {});
    const from = presentable.findIndex((i) => i.index >= index);
    setPresentAt(from < 0 ? 0 : from);
  };

  return (
    <div className="cm-root" role="dialog" aria-modal="true" aria-label="Custom map builder" ref={rootRef} tabIndex={-1}>
      <header className="cm-header">
        <BackButton onClick={onClose} label="Map" ariaLabel="Back to the map" />
        <h1>Custom map</h1>
        <button type="button" className="cm-button" disabled={!presentable.length} onClick={present}>
          <Icon name="play" inline /> Present
        </button>
        <button type="button" className="cm-button cm-button-primary" disabled={!presentable.length} onClick={() => setExporting(true)}>
          Save
        </button>
      </header>
      {unsaved && (
        <p className="cm-error cm-unsaved" role="alert">
          This device isn't keeping your map. Save it as a PDF before you leave.
        </p>
      )}
      <div className="cm-body">
        <div className="cm-add">
          <div className="cm-tabs" role="group" aria-label="Add places by">
            <button type="button" aria-pressed={adding === "search"} onClick={() => setAdding("search")}>
              Search places
            </button>
            <button type="button" aria-pressed={adding === "passage"} onClick={() => setAdding("passage")}>
              From a passage
            </button>
          </div>
          {adding === "search" ? (
            <PlaceSearch
              key={slide.id}
              added={slide.places}
              journey={slide.journey}
              full={slide.places.length >= MAX_PLACES}
              onAdd={(key) => addPlaces([key])}
            />
          ) : (
            <PassagePicker
              key={slide.id}
              added={slide.places}
              room={MAX_PLACES - slide.places.length}
              onAdd={addPlaces}
            />
          )}
        </div>

        <div className="cm-main">
          <input
            type="text"
            className="cm-title"
            value={slide.title}
            maxLength={MAX_TITLE}
            placeholder="Map title"
            aria-label="Map title"
            onChange={(e) => patch({ title: e.target.value })}
          />
          <StageMap slide={slide} onViewChange={(view) => patch({ view })} />
          <div className="cm-framing">
            <span role="status">
              {outside.size > 0
                ? `${outside.size} place${outside.size === 1 ? " is" : "s are"} outside the frame.`
                : slide.view
                  ? "Your framing is kept."
                  : "Framed to fit your places. Drag or zoom to adjust."}
            </span>
            <button type="button" className="cm-button" disabled={!slide.view} onClick={() => patch({ view: null })}>
              Fit to places
            </button>
          </div>
          {stacked > 1 && (
            <p className="cm-warning">
              {stacked} pins sit almost on top of each other. Zoom in, or put some of them on another slide.
            </p>
          )}
          <p className="cm-credit">
            Map: <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>{" "}
            <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a> Data from{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
          </p>
          <nav className="cm-slides" aria-label="Slides">
            <ol>
              {project.slides.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="cm-slide-tab"
                    aria-current={s.id === slide.id ? "true" : undefined}
                    onClick={() => setProject((p) => ({ ...p, current: s.id }))}
                  >
                    <span className="cm-slide-number">{i + 1}</span>
                    <span className="cm-slide-name">{s.title.trim() || (s.places.length ? PLACES.get(s.places[0])?.name : "Empty")}</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="cm-slide-actions">
              <button type="button" className="cm-button" disabled={project.slides.length >= MAX_SLIDES} onClick={() => addSlide()}>
                <Plus size={16} aria-hidden="true" /> Add slide
              </button>
              <button type="button" className="cm-icon-button" aria-label="Duplicate this slide" title="Duplicate this slide" disabled={project.slides.length >= MAX_SLIDES} onClick={() => addSlide(slide)}>
                <Copy size={18} aria-hidden="true" />
              </button>
              <button type="button" className="cm-icon-button" aria-label="Move this slide earlier" title="Move this slide earlier" disabled={index === 0} onClick={() => moveSlide(-1)}>
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
              <button type="button" className="cm-icon-button" aria-label="Move this slide later" title="Move this slide later" disabled={index === project.slides.length - 1} onClick={() => moveSlide(1)}>
                <ChevronRight size={20} aria-hidden="true" />
              </button>
              <button type="button" className="cm-icon-button" aria-label="Delete this slide" title="Delete this slide" onClick={deleteSlide}>
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </div>
          </nav>
        </div>

        <div className="cm-panel">
          <h2>
            Places on this slide <span>{slide.places.length ? `${slide.places.length} of ${MAX_PLACES}` : ""}</span>
          </h2>
          {slide.places.length === 0 ? (
            <p className="cm-notice">Search for a place, or add the places in a passage.</p>
          ) : (
            <ol className="cm-places">
              {slide.places.map((key, i) => {
                const place = PLACES.get(key)!;
                return (
                  <li key={`${key}-${i}`}>
                    <span className="cm-place-number">{i + 1}</span>
                    <div className="cm-place-text">
                      <span className="cm-result-name">
                        {place.name}
                        {place.certainty && (
                          <span className={`cm-chip cm-chip-${place.certainty.level}`}>{CERTAINTY_LABEL[place.certainty.level]}</span>
                        )}
                        {outside.has(key) && <span className="cm-chip">Outside the frame</span>}
                      </span>
                      <span className="cm-result-detail">{place.detail}</span>
                      {place.certainty && <span className="cm-place-note">{place.certainty.note}</span>}
                    </div>
                    <div className="cm-place-actions">
                      <button type="button" className="cm-icon-button" aria-label={`Move ${place.name} up`} disabled={i === 0} onClick={() => movePlace(i, -1)}>
                        <ArrowUp size={18} aria-hidden="true" />
                      </button>
                      <button type="button" className="cm-icon-button" aria-label={`Move ${place.name} down`} disabled={i === slide.places.length - 1} onClick={() => movePlace(i, 1)}>
                        <ArrowDown size={18} aria-hidden="true" />
                      </button>
                      <button type="button" className="cm-icon-button" aria-label={`Remove ${place.name}`} onClick={() => removeAt(i)}>
                        <X size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <h2>This slide</h2>
          <label className="cm-check">
            <input
              type="checkbox"
              checked={slide.journey}
              onChange={(e) => {
                const journey = e.target.checked;
                // Off a journey each place is listed once.
                patch((s) => ({ journey, places: journey ? s.places : [...new Set(s.places)] }));
              }}
            />
            <span>
              <strong>Journey</strong>: number the pins in list order and join them
              <span className="cm-hint">Straight lines between places, not the actual road or sea route.</span>
            </span>
          </label>
          <label className="cm-check">
            <input type="checkbox" checked={slide.modern} onChange={(e) => patch({ modern: e.target.checked })} />
            <span>
              Show today's roads, borders and place names
              <span className="cm-hint">Quiz handouts always leave them off.</span>
            </span>
          </label>
          <p className="cm-hint">Your map is kept on this device only.</p>
          <button type="button" className="cm-button cm-start-over" onClick={startOver}>
            Start over
          </button>
        </div>
      </div>
      {exporting && <ExportSheet project={project} onClose={() => setExporting(false)} />}
      {presentAt !== null && presentable.length > 0 && (
        <PresentView items={presentable} start={presentAt} onClose={() => setPresentAt(null)} />
      )}
    </div>
  );
}
