import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_H, MAP_W } from "../../lib/customMap/geometry";
import { drawOverlay, loadFonts } from "../../lib/customMap/draw";
import { mapStyle } from "../../lib/customMap/render";
import { slideView } from "../../lib/customMap/export";
import type { MapViewState, Slide } from "../../lib/customMap/project";

/** Names on a narrow preview stay readable instead of shrinking with the frame. */
const MIN_UI = 0.62;

interface Frame {
  /** Stage size on screen, and the slide's map area centred inside it. */
  width: number;
  height: number;
  frameH: number;
  top: number;
}

/**
 * The slide's map, live: pan and zoom here and the saved page shows the same area. The bright frame
 * is exactly what is saved; on a tall (phone) stage the dimmed strips above and below are not.
 */
export default function StageMap({ slide, onViewChange }: { slide: Slide; onViewChange: (view: MapViewState) => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const frameRef = useRef<Frame | null>(null);
  frameRef.current = frame;
  const slideRef = useRef(slide);
  slideRef.current = slide;
  const changeRef = useRef(onViewChange);
  changeRef.current = onViewChange;
  const drawRef = useRef(() => {});

  /** The view now on screen, in the slide's own reference zoom. */
  const currentView = (map: maplibregl.Map, f: Frame): MapViewState => {
    const c = map.getCenter();
    return { lng: c.lng, lat: c.lat, zoom: map.getZoom() - Math.log2(f.width / MAP_W) };
  };

  drawRef.current = () => {
    const map = mapRef.current;
    const canvas = canvasRef.current;
    const f = frameRef.current;
    if (!map || !canvas || !f) return;
    const ratio = window.devicePixelRatio || 1;
    const w = Math.round(f.width * ratio);
    const h = Math.round(f.height * ratio);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, f.width, f.height);
    if (f.top > 0.5) {
      ctx.fillStyle = "rgba(25,18,10,0.42)";
      ctx.fillRect(0, 0, f.width, f.top);
      ctx.fillRect(0, f.top + f.frameH, f.width, f.height - f.top - f.frameH);
    }
    // Lay out in slide units scaled by k, so names sit where the saved page will put them.
    const k = f.width / MAP_W;
    const ui = Math.max(k, MIN_UI);
    const view = currentView(map, f);
    ctx.save();
    ctx.translate(0, f.top);
    drawOverlay(
      ctx,
      slideRef.current,
      { ...view, zoom: view.zoom + Math.log2(k) },
      { width: f.width, height: f.frameH, ui, mode: "names" }
    );
    ctx.restore();
    // What the checks read: the view the saved page will use.
    canvas.dataset.view = `${view.lng.toFixed(5)},${view.lat.toFixed(5)},${view.zoom.toFixed(3)}`;
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (!width || !height) return;
      const frameH = (width * MAP_H) / MAP_W;
      setFrame({ width, height, frameH, top: Math.max(0, (height - frameH) / 2) });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    measure();
    return () => observer.disconnect();
  }, []);

  const ready = frame !== null;
  useEffect(() => {
    if (!ready || !holderRef.current) return;
    let cancelled = false;
    let map: maplibregl.Map | null = null;
    void loadFonts().then(() => drawRef.current());
    mapStyle(slideRef.current.modern)
      .then((style) => {
        if (cancelled || !holderRef.current) return;
        const view = slideView(slideRef.current);
        map = new maplibregl.Map({
          container: holderRef.current,
          style,
          center: [view.lng, view.lat],
          zoom: view.zoom + Math.log2(frameRef.current!.width / MAP_W),
          attributionControl: false,
          // A map on a page is read north-up and flat.
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          maxPitch: 0,
        });
        map.touchZoomRotate.disableRotation();
        map.keyboard.disableRotation();
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        map.on("render", () => drawRef.current());
        map.on("moveend", (e) => {
          if ((e as { originalEvent?: Event }).originalEvent && frameRef.current)
            changeRef.current(currentView(map!, frameRef.current));
        });
        map.on("load", () => setStatus("ready"));
        map.on("error", () => setStatus((s) => (s === "ready" ? s : "error")));
        mapRef.current = map;
        drawRef.current();
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
      mapRef.current = null;
      map?.remove();
    };
  }, [ready]);

  const modernRef = useRef(slide.modern);
  useEffect(() => {
    if (modernRef.current === slide.modern) return;
    modernRef.current = slide.modern;
    void mapStyle(slide.modern)
      .then((style) => mapRef.current?.setStyle(style))
      .catch(() => {});
  }, [slide.modern]);

  // Another slide, other places, "Fit to places" or a new screen size: move the camera to match.
  const view = slideView(slide);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !frame) return;
    map.resize();
    if (!map.isMoving())
      map.jumpTo({ center: [view.lng, view.lat], zoom: view.zoom + Math.log2(frame.width / MAP_W) });
    drawRef.current();
  }, [frame, view.lng, view.lat, view.zoom, status]);

  useEffect(() => {
    drawRef.current();
  }, [slide.places, slide.journey]);

  return (
    <div className="cm-stage" ref={stageRef}>
      <div className="cm-stage-map" ref={holderRef} />
      <canvas
        className="cm-stage-overlay"
        ref={canvasRef}
        role="img"
        aria-label={`Map preview with ${slide.places.length} place${slide.places.length === 1 ? "" : "s"}`}
      />
      {status !== "ready" && (
        <div className="cm-stage-status" role="status">
          {status === "loading" ? "Loading map…" : "The map couldn't load. Check your connection."}
        </div>
      )}
    </div>
  );
}
