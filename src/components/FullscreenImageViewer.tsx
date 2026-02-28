import { useState, useRef, useCallback, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface FullscreenImageViewerProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

const FullscreenImageViewer = ({ images, initialIndex, onClose }: FullscreenImageViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLDivElement>(null);
  const lastDistance = useRef<number | null>(null);
  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const isPanning = useRef(false);
  const lastPan = useRef<{ x: number; y: number } | null>(null);

  const resetTransform = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
    resetTransform();
  }, [resetTransform]);

  const goPrev = useCallback(() => {
    goTo(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  }, [currentIndex, images.length, goTo]);

  const goNext = useCallback(() => {
    goTo(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  }, [currentIndex, images.length, goTo]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goPrev, goNext]);

  // Prevent body scroll when viewer is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const getDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastDistance.current = getDistance(e.touches);
      lastCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    } else if (e.touches.length === 1 && scale > 1) {
      isPanning.current = true;
      lastPan.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDistance.current !== null) {
      e.preventDefault();
      const newDist = getDistance(e.touches);
      const delta = newDist / lastDistance.current;
      setScale((prev) => Math.min(Math.max(prev * delta, 1), 5));
      lastDistance.current = newDist;
    } else if (e.touches.length === 1 && isPanning.current && lastPan.current && scale > 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - lastPan.current.x;
      const dy = e.touches[0].clientY - lastPan.current.y;
      setTranslate((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPan.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      lastDistance.current = null;
      lastCenter.current = null;
    }
    if (e.touches.length === 0) {
      isPanning.current = false;
      lastPan.current = null;
      // Snap back if zoomed out
      if (scale <= 1.05) {
        resetTransform();
      }
    }
  };

  // Double-tap to zoom
  const lastTap = useRef<number>(0);
  const handleTap = (e: React.TouchEvent) => {
    if (e.touches.length > 0) return; // only on touchEnd with 0 remaining
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (scale > 1) {
        resetTransform();
      } else {
        setScale(2.5);
      }
    }
    lastTap.current = now;
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && scale <= 1) onClose();
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-[env(safe-area-inset-top,16px)]">
        <span className="text-white/80 text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Image area */}
      <div
        ref={imgRef}
        className="flex-1 flex items-center justify-center overflow-hidden touch-none relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={(e) => { handleTouchEnd(e); handleTap(e); }}
      >
        {/* Desktop nav arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          className="max-w-[95vw] max-h-[80vh] object-contain select-none"
          style={{
            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
            transition: scale === 1 ? "transform 0.2s ease-out" : "none",
          }}
          draggable={false}
        />
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 justify-center p-3 pb-[env(safe-area-inset-bottom,12px)] overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-12 w-16 flex-shrink-0 rounded-md overflow-hidden transition-all ${
                i === currentIndex ? "ring-2 ring-white" : "opacity-50 hover:opacity-80"
              }`}
            >
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FullscreenImageViewer;
