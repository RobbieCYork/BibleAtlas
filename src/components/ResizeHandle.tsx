import { useRef } from "react";

interface ResizeHandleProps {
  width: number;
  minWidth: number;
  maxWidth: number;
  /** 1 if dragging right should grow the panel (handle sits on its right edge), -1 if dragging left should grow it (handle sits on its left edge). */
  direction: 1 | -1;
  onWidthChange: (width: number) => void;
}

export default function ResizeHandle({ width, minWidth, maxWidth, direction, onWidthChange }: ResizeHandleProps) {
  const widthRef = useRef(width);
  widthRef.current = width;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widthRef.current;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = (moveEvent.clientX - startX) * direction;
      const next = Math.min(maxWidth, Math.max(minWidth, startWidth + delta));
      onWidthChange(next);
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.classList.remove("resizing-panels");
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.classList.add("resizing-panels");
  };

  return <div className="resize-handle" onMouseDown={handleMouseDown} />;
}
