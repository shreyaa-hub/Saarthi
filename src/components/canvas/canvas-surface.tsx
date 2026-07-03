"use client";

import { useEffect, useRef, useState } from "react";
import type { CanvasStoreApi } from "@/lib/canvas/store";
import { useCanvasStore } from "@/lib/canvas/store";
import { ElementBox } from "./element-box";

export function CanvasSurface({ store }: { store: CanvasStoreApi }) {
  const width = useCanvasStore(store, (s) => s.width);
  const height = useCanvasStore(store, (s) => s.height);
  const background = useCanvasStore(store, (s) => s.background);
  const elements = useCanvasStore(store, (s) => s.elements);
  const selectedId = useCanvasStore(store, (s) => s.selectedId);
  const { updateElement, removeElement, duplicateElement, select } = store.getState();

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const compute = () => {
      const availableWidth = el.clientWidth - 48;
      const availableHeight = el.clientHeight - 48;
      const next = Math.min(1, availableWidth / width, availableHeight / height);
      setScale(next > 0 ? next : 1);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);

  return (
    <div
      ref={containerRef}
      className="canvas-surface flex h-full items-center justify-center overflow-auto p-6"
      onPointerDown={() => select(null)}
    >
      <div
        className="relative shrink-0 shadow-lg ring-1 ring-border"
        style={{
          width: width * scale,
          height: height * scale,
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width, height, background, transform: `scale(${scale})` }}
          onPointerDown={(e) => {
            e.stopPropagation();
            select(null);
          }}
        >
          {elements.map((el) => (
            <ElementBox
              key={el.id}
              element={el}
              selected={el.id === selectedId}
              scale={scale}
              onSelect={() => select(el.id)}
              onChange={(patch) => updateElement(el.id, patch)}
              onDelete={() => removeElement(el.id)}
              onDuplicate={() => duplicateElement(el.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
