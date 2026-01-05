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

  const accentColor = brand?.brandColor || "#0d6e6e";
  const hasThumbnails = pages && pages.length > 0;

  if (!mounted || numPages === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-4">
      {/* Thumbnail Preview Tooltip - 顯示在頁面條上方 */}
      {hoveredPage !== null && hasThumbnails && pages[hoveredPage - 1] && (
        <div
          className="pointer-events-none absolute z-[60]"
          style={{
            left: tooltipPosition.x,
            bottom: 80, // 固定在頁面條上方
            transform: "translateX(-50%)",
          }}
        >
          <div className="rounded-lg bg-gray-900 p-2 shadow-2xl" style={{ border: "1px solid #0d6e6e" }}>
            <img
              src={pages[hoveredPage - 1].file}
              alt={`頁面 ${hoveredPage}`}
              className="h-32 w-auto rounded object-contain"
              style={{ maxWidth: "160px" }}
            />
            <div className="mt-1 text-center text-xs font-medium" style={{ color: accentColor }}>
              頁面 {hoveredPage} / {numPages}
            </div>
          </div>
        </div>
      )}

      {/* Page number tooltip - 無縮圖時顯示頁碼 */}
      {hoveredPage !== null && !hasThumbnails && (
        <div
          className="pointer-events-none absolute z-[60]"
          style={{
            left: tooltipPosition.x,
            bottom: 60, // 固定在頁面條上方
            transform: "translateX(-50%)",
          }}
        >
          <div className="rounded-lg bg-gray-900 px-4 py-2 shadow-2xl" style={{ border: "1px solid #0d6e6e" }}>
            <div className="text-center text-sm font-medium" style={{ color: accentColor }}>
              頁面 {hoveredPage}
            </div>
          </div>
        </div>
      )}

      {/* Page Bar */}
      <div
        ref={barRef}
        className="pointer-events-auto flex items-center rounded-full bg-gray-900/90 px-3 py-2 backdrop-blur-sm"
        style={{ border: "1px solid rgba(13, 110, 110, 0.4)" }}
      >
        <div className="flex items-center gap-0.5">
          {Array.from({ length: numPages }, (_, i) => {
            const page = i + 1;
            const isCurrentPage = page === pageNumber;
            const isHovered = page === hoveredPage;

            return (
              <div
                key={page}
                className="relative cursor-pointer px-0.5"
                onMouseEnter={(e) => handleMouseMove(e, page)}
                onMouseMove={(e) => handleMouseMove(e, page)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handlePageClick(page)}
              >
                <div
                  className={`transition-all duration-150 ${
                    numPages <= 20 ? "w-3" : numPages <= 50 ? "w-2" : "w-1"
                  } ${
                    isCurrentPage
                      ? "h-4 rounded"
                      : isHovered
                        ? "h-3 rounded"
                        : "h-2 rounded-full"
                  }`}
                  style={{
                    backgroundColor: isCurrentPage
                      ? accentColor
                      : isHovered
                        ? "#0a5555"
                        : "rgba(255,255,255,0.25)",
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="ml-3 flex items-center text-sm">
          <span className="font-bold" style={{ fontVariantNumeric: "tabular-nums", color: accentColor }}>
            {pageNumber}
          </span>
          <span className="mx-1 text-gray-500">/</span>
          <span className="text-gray-400" style={{ fontVariantNumeric: "tabular-nums" }}>
            {numPages}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
