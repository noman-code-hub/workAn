import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';

type ImageCropModalProps = {
  isOpen: boolean;
  imageSrc: string | null;
  imageName?: string;
  outputSize?: number;
  title?: string;
  onCancel: () => void;
  onConfirm: (croppedImage: string) => void;
};

type Point = {
  x: number;
  y: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const INITIAL_SCALE_PADDING = 0.16;

export const ImageCropModal = ({
  isOpen,
  imageSrc,
  imageName,
  outputSize = 300,
  title = 'Crop profile photo',
  onCancel,
  onConfirm,
}: ImageCropModalProps) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ pointerId: number; pointerX: number; pointerY: number; offset: Point } | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [minScale, setMinScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  const maxScale = useMemo(() => Math.max(minScale * 4, minScale + 1.5), [minScale]);

  const getViewportSize = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return 0;
    return Math.min(viewport.clientWidth, viewport.clientHeight);
  }, []);

  const clampPosition = useCallback((nextPosition: Point, nextScale: number) => {
    const viewportSize = getViewportSize();
    if (!viewportSize || !naturalSize.width || !naturalSize.height) return { x: 0, y: 0 };

    const renderedWidth = naturalSize.width * nextScale;
    const renderedHeight = naturalSize.height * nextScale;
    const maxOffsetX = Math.max(0, (renderedWidth - viewportSize) / 2);
    const maxOffsetY = Math.max(0, (renderedHeight - viewportSize) / 2);

    return {
      x: clamp(nextPosition.x, -maxOffsetX, maxOffsetX),
      y: clamp(nextPosition.y, -maxOffsetY, maxOffsetY),
    };
  }, [getViewportSize, naturalSize.height, naturalSize.width]);

  const initializeCrop = useCallback((width: number, height: number) => {
    const viewportSize = getViewportSize();
    if (!viewportSize || !width || !height) return;
    const coverScale = Math.max(viewportSize / width, viewportSize / height);
    const initialScale = coverScale * (1 + INITIAL_SCALE_PADDING);
    setMinScale(coverScale);
    setScale(initialScale);
    setPosition({ x: 0, y: 0 });
  }, [getViewportSize]);

  useEffect(() => {
    if (isOpen) return;
    dragStartRef.current = null;
    setIsDragging(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  useEffect(() => {
    if (!isOpen || !naturalSize.width || !naturalSize.height) return;

    const handleResize = () => {
      const viewportSize = getViewportSize();
      if (!viewportSize) return;
      const nextMinScale = Math.max(viewportSize / naturalSize.width, viewportSize / naturalSize.height);
      setMinScale(nextMinScale);
      setScale((previousScale) => {
        const safeScale = Math.max(previousScale, nextMinScale);
        setPosition((previousPosition) => clampPosition(previousPosition, safeScale));
        return safeScale;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPosition, getViewportSize, isOpen, naturalSize.height, naturalSize.width]);

  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    setNaturalSize({ width: 0, height: 0 });
    setPosition({ x: 0, y: 0 });
    setMinScale(1);
    setScale(1);
  }, [imageSrc, isOpen]);

  const handleImageLoad = useCallback(() => {
    const image = imageRef.current;
    if (!image) return;
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    setNaturalSize({ width, height });
    requestAnimationFrame(() => {
      initializeCrop(width, height);
    });
  }, [initializeCrop]);

  const handleZoomChange = useCallback((nextScale: number) => {
    const safeScale = clamp(nextScale, minScale, maxScale);
    setScale(safeScale);
    setPosition((previousPosition) => clampPosition(previousPosition, safeScale));
  }, [clampPosition, maxScale, minScale]);

  const stopDragging = useCallback((target?: Element | null) => {
    const dragState = dragStartRef.current;
    if (dragState && target instanceof Element && 'releasePointerCapture' in target) {
      try {
        (target as HTMLElement).releasePointerCapture(dragState.pointerId);
      } catch {
        // Ignore release errors if capture is already gone.
      }
    }
    dragStartRef.current = null;
    setIsDragging(false);
  }, []);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragStartRef.current = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      offset: position,
    };
    setIsDragging(true);
  }, [position]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStartRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    event.preventDefault();
    const deltaX = event.clientX - dragState.pointerX;
    const deltaY = event.clientY - dragState.pointerY;
    setPosition(clampPosition({
      x: dragState.offset.x + deltaX,
      y: dragState.offset.y + deltaY,
    }, scale));
  }, [clampPosition, scale]);

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStartRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    stopDragging(event.currentTarget);
  }, [stopDragging]);

  const handleLostPointerCapture = useCallback(() => {
    dragStartRef.current = null;
    setIsDragging(false);
  }, []);

  const handleConfirm = useCallback(() => {
    const image = imageRef.current;
    const viewport = viewportRef.current;
    if (!image || !viewport || !naturalSize.width || !naturalSize.height) return;

    const viewportRect = viewport.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    if (!viewportRect.width || !viewportRect.height || !imageRect.width || !imageRect.height) return;

    const sourceX = clamp(
      ((viewportRect.left - imageRect.left) / imageRect.width) * naturalSize.width,
      0,
      naturalSize.width,
    );
    const sourceY = clamp(
      ((viewportRect.top - imageRect.top) / imageRect.height) * naturalSize.height,
      0,
      naturalSize.height,
    );
    const sourceWidth = clamp(
      (viewportRect.width / imageRect.width) * naturalSize.width,
      1,
      naturalSize.width - sourceX,
    );
    const sourceHeight = clamp(
      (viewportRect.height / imageRect.height) * naturalSize.height,
      1,
      naturalSize.height - sourceY,
    );

    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputSize,
      outputSize,
    );

    onConfirm(canvas.toDataURL('image/png'));
  }, [naturalSize.height, naturalSize.width, onConfirm, outputSize]);

  if (!isOpen || !imageSrc) return null;

  return createPortal(
    <div className="hirevo-crop-modal" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="hirevo-crop-backdrop" aria-label="Close crop modal" onClick={onCancel} />
      <div className="hirevo-crop-panel">
        <div className="hirevo-crop-header">
          <div>
            <h3>{title}</h3>
            <p>{imageName || 'Move and zoom to fit the square frame.'}</p>
          </div>
          <button type="button" className="hirevo-crop-close" onClick={onCancel}>
            Close
          </button>
        </div>

        <div className="hirevo-crop-body">
          <div className="hirevo-crop-stage-shell">
            <div
              className="hirevo-crop-stage"
              ref={viewportRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onLostPointerCapture={handleLostPointerCapture}
            >
              <div
                className="hirevo-crop-image-shell"
                style={{
                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                }}
              >
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop preview"
                  className="hirevo-crop-image"
                  draggable={false}
                  onLoad={handleImageLoad}
                  style={{
                    transform: `scale(${scale})`,
                  }}
                />
              </div>
              <div className="hirevo-crop-grid" aria-hidden="true" />
            </div>
          </div>

          <div className="hirevo-crop-controls">
            <div className="hirevo-crop-zoom-row">
              <button type="button" className="hirevo-crop-zoom-btn" onClick={() => handleZoomChange(scale - minScale * 0.12)}>
                -
              </button>
              <input
                type="range"
                min={minScale}
                max={maxScale}
                step={Math.max(minScale / 100, 0.01)}
                value={scale}
                onChange={(event) => handleZoomChange(Number(event.target.value))}
                className="hirevo-crop-range"
              />
              <button type="button" className="hirevo-crop-zoom-btn" onClick={() => handleZoomChange(scale + minScale * 0.12)}>
                +
              </button>
            </div>
            <div className="hirevo-crop-help">
              Drag to reposition. Use the slider to zoom. The final image will be exported at {outputSize} x {outputSize}px.
            </div>
          </div>
        </div>

        <div className="hirevo-crop-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>
            Apply Crop
          </button>
        </div>
      </div>

      <style>{`
        .hirevo-crop-modal {
          position: fixed;
          inset: 0;
          z-index: var(--z-modal);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .hirevo-crop-backdrop {
          position: absolute;
          inset: 0;
          border: none;
          background: rgba(15, 23, 42, 0.68);
          backdrop-filter: blur(6px);
        }

        .hirevo-crop-panel {
          position: relative;
          z-index: 1;
          width: min(720px, 100%);
          border-radius: 24px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          box-shadow: 0 36px 80px -40px rgba(15, 23, 42, 0.5);
          overflow: hidden;
        }

        .hirevo-crop-header,
        .hirevo-crop-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 22px;
        }

        .hirevo-crop-header {
          border-bottom: 1px solid #e2e8f0;
        }

        .hirevo-crop-header h3 {
          margin: 0 0 6px;
          color: #0f172a;
          font-size: 1.1rem;
          font-weight: 800;
        }

        .hirevo-crop-header p {
          margin: 0;
          color: #64748b;
          font-size: 0.92rem;
        }

        .hirevo-crop-close {
          border: 1px solid #dbe5ef;
          background: #ffffff;
          border-radius: 12px;
          padding: 10px 14px;
          color: #0f172a;
          font-weight: 700;
        }

        .hirevo-crop-body {
          padding: 22px;
          display: grid;
          gap: 18px;
        }

        .hirevo-crop-stage-shell {
          display: flex;
          justify-content: center;
        }

        .hirevo-crop-stage {
          position: relative;
          width: min(100%, 360px);
          aspect-ratio: 1 / 1;
          overflow: hidden;
          border-radius: 24px;
          background:
            linear-gradient(135deg, rgba(30, 41, 59, 0.96) 0%, rgba(15, 23, 42, 0.9) 100%);
          box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.24);
          touch-action: none;
          user-select: none;
          cursor: ${isDragging ? 'grabbing' : 'grab'};
        }

        .hirevo-crop-image-shell {
          position: absolute;
          top: 50%;
          left: 50%;
          will-change: transform;
          pointer-events: none;
          z-index: 1;
        }

        .hirevo-crop-image {
          display: block;
          transform-origin: center center;
          max-width: none;
          will-change: transform;
          pointer-events: none;
        }

        .hirevo-crop-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border: 2px solid rgba(255, 255, 255, 0.82);
          box-shadow: inset 0 0 0 999px rgba(15, 23, 42, 0.18);
          z-index: 2;
        }

        .hirevo-crop-grid::before,
        .hirevo-crop-grid::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, transparent 33.333%, rgba(255, 255, 255, 0.32) 33.333%, rgba(255, 255, 255, 0.32) 34%, transparent 34%, transparent 66.666%, rgba(255, 255, 255, 0.32) 66.666%, rgba(255, 255, 255, 0.32) 67%, transparent 67%),
            linear-gradient(180deg, transparent 33.333%, rgba(255, 255, 255, 0.32) 33.333%, rgba(255, 255, 255, 0.32) 34%, transparent 34%, transparent 66.666%, rgba(255, 255, 255, 0.32) 66.666%, rgba(255, 255, 255, 0.32) 67%, transparent 67%);
        }

        .hirevo-crop-controls {
          display: grid;
          gap: 10px;
        }

        .hirevo-crop-zoom-row {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 12px;
        }

        .hirevo-crop-zoom-btn {
          width: 42px;
          height: 42px;
          border: 1px solid #dbe5ef;
          border-radius: 12px;
          background: #ffffff;
          color: #0f172a;
          font-size: 1.2rem;
          font-weight: 700;
        }

        .hirevo-crop-range {
          width: 100%;
        }

        .hirevo-crop-help {
          color: #64748b;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .hirevo-crop-footer {
          border-top: 1px solid #e2e8f0;
          background: rgba(248, 250, 252, 0.86);
        }

        @media (max-width: 640px) {
          .hirevo-crop-modal {
            padding: 12px;
          }

          .hirevo-crop-panel {
            border-radius: 20px;
          }

          .hirevo-crop-header,
          .hirevo-crop-footer,
          .hirevo-crop-body {
            padding-left: 16px;
            padding-right: 16px;
          }

          .hirevo-crop-header,
          .hirevo-crop-footer {
            flex-direction: column;
            align-items: stretch;
          }

          .hirevo-crop-footer .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default ImageCropModal;
