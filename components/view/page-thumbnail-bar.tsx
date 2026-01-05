import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface PageThumbnailBarProps {
  pageNumber: number;
  numPages: number;
  pages?: { file: string; pageNumber: string }[];
  pdfFile?: string;
  onPageClick?: (page: number) => void;
  brand?: { brandColor?: string | null } | null;
}

export default function PageThumbnailBar({
  pageNumber,
  numPages,
  pages,
  pdfFile,
  onPageClick,
  brand,
}: PageThumbnailBarProps) {
  const [hoveredPage, setHoveredPage] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, page: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    setHoveredPage(page);
  };

  const handleMouseLeave = () => {
    setHoveredPage(null);
  };

  const handlePageClick = (page: number) => {
    if (onPageClick) {
      onPageClick(page);
    }
  };

  // 使用品牌色或預設深綠色 (與 crm.rwa.nexus 一致)
  const accentColor = brand?.brandColor || "#0d6e6e"; // 深藍綠色

  if (!mounted || numPages === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-4">
      {/* Thumbnail Preview Tooltip */}
      {hoveredPage !== null && pages && pages[hoveredPage - 1] && (
        <div
          className="pointer-events-none absolute z-[60] transition-opacity duration-200"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y - 10,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="rounded-lg bg-gray-900/95 p-2 shadow-2xl">
            <img
              src={pages[hoveredPage - 1].file}
              alt={`頁面 ${hoveredPage}`}
              className="h-40 w-auto rounded border border-gray-700 object-contain"
              style={{ maxWidth: "200px" }}
            />
            <div className="mt-1 text-center text-xs text-white">
              頁面 {hoveredPage} / {numPages}
            </div>
          </div>
        </div>
      )}

      {/* Page number tooltip when no thumbnails */}
      {hoveredPage !== null && (!pages || !pages[hoveredPage - 1]) && (
        <div
          className="pointer-events-none absolute z-[60] transition-opacity duration-200"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y - 10,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="rounded-lg bg-gray-900/95 px-3 py-2 shadow-2xl">
            <div className="text-center text-sm font-medium text-white">
              頁面 {hoveredPage}
            </div>
          </div>
        </div>
      )}

      {/* Page Bar - 深綠色主題 */}
      <div
        ref={barRef}
        className="pointer-events-auto flex items-center rounded-full bg-gray-900/80 px-3 py-2 backdrop-blur-sm"
        style={{ border: "1px solid rgba(13, 110, 110, 0.3)" }}
      >
        {/* Page segments */}
        <div className="flex items-center gap-0.5">
          {Array.from({ length: numPages }, (_, i) => {
            const page = i + 1;
            const isCurrentPage = page === pageNumber;
            const isHovered = page === hoveredPage;

            return (
              <div
                key={page}
                className="relative cursor-pointer"
                onMouseEnter={(e) => handleMouseMove(e, page)}
                onMouseMove={(e) => handleMouseMove(e, page)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handlePageClick(page)}
              >
                <div
                  className={`transition-all duration-200 ${
                    numPages <= 20 ? "w-4" : numPages <= 50 ? "w-2" : "w-1"
                  } ${
                    isCurrentPage
                      ? "h-3 rounded-sm"
                      : isHovered
                        ? "h-2.5 rounded-sm"
                        : "h-1.5 rounded-full"
                  }`}
                  style={{
                    backgroundColor: isCurrentPage
                      ? accentColor // 深綠色 - 當前頁面
                      : isHovered
                        ? "#10b981" // 淺綠色 - 懸停
                        : "rgba(255,255,255,0.3)",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Page number indicator - 深綠色強調 */}
        <div className="ml-3 flex items-center text-sm">
          <span 
            className="font-medium" 
            style={{ fontVariantNumeric: "tabular-nums", color: accentColor }}
          >
            {pageNumber}
          </span>
          <span className="mx-1 text-gray-400">/</span>
          <span className="text-gray-400" style={{ fontVariantNumeric: "tabular-nums" }}>
            {numPages}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
