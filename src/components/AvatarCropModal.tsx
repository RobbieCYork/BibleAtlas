import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () => reject(new Error("Couldn't load the selected image.")));
    img.src = src;
  });
}

/** Renders just the cropped/zoomed circle to a fixed-size square canvas and exports it as a JPEG —
 * this (not the original file) is what gets uploaded, so every avatar is a consistent square regardless
 * of the source photo's shape or resolution. */
async function cropToBlob(imageSrc: string, area: Area, outputSize = 480): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, outputSize, outputSize);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't process the image."))), "image/jpeg", 0.92);
  });
}

interface AvatarCropModalProps {
  imageSrc: string;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}

/** Full-screen crop/zoom/pan step between picking a photo and uploading it — lets the reader choose
 * exactly which part of the photo becomes their (always circular) avatar instead of a naive center-crop. */
export default function AvatarCropModal({ imageSrc, onCancel, onCropped }: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    setError(null);
    try {
      const blob = await cropToBlob(imageSrc, croppedAreaPixels);
      onCropped(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't process the image.");
      setSaving(false);
    }
  };

  return (
    <div className="avatar-crop-overlay" role="dialog" aria-label="Crop profile photo">
      <div className="avatar-crop-modal">
        <div className="avatar-crop-area">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
          />
        </div>
        <input
          type="range"
          className="avatar-crop-zoom"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Zoom"
        />
        {error && <p className="auth-status auth-error">{error}</p>}
        <div className="avatar-crop-actions">
          <button type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving || !croppedAreaPixels}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
