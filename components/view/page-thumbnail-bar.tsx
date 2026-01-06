import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import * as pdfjs from "pdfjs-dist";

// 設定 PDF.js worker
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

interface PageThumbnailBarProps {
  pageNumber: number;
  numPages: number;
  pages?: { file: string; pageNumber: string }[];
  pdfFile?: string; // PDF 檔案 URL
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
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setMounted(true);
    // 建立離屏 canvas
    canvasRef.current = document.createElement("canvas");
    return () => {
      setMounted(false);
      if (canvasRef.current) {
        canvasRef.current = null;
      }
    };
  }, []);

  // 載入 PDF 文件
  useEffect(() => {
    if (pdfFile && !pdfDocRef.current) {
      pdfjs.getDocument(pdfFile).promise.then((pdf) => {
        pdfDocRef.current = pdf;
      }).catch(console.error);
    }
  }, [pdfFile]);

  // 產生縮圖
  const generateThumbnail = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;
    
    setIsLoadingThumbnail(true);
    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.3 }); // 縮小比例
      
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      await page.render({
        canvasContext: ctx,
        viewport: viewport,
      }).promise;
      
      setThumbnailUrl(canvas.toDataURL());
    } catch (e) {
      console.error("Failed to generate thumbnail:", e);
    } finally {
      setIsLoadingThumbnail(false);
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, page: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    if (hoveredPage !== page) {
      setHoveredPage(page);
      // 如果有 PDF 檔案且沒有預渲染頁面，產生縮圖
      if (pdfFile && (!pages || pages.length === 0)) {
        generateThumbnail(page);
      }
    }
  };

  const handleMouseLeave = () => {
    setHoveredPage(null);
    setThumbnailUrl(null);
  };

  const handlePageClick = (page: number) => {
    if (onPageClick) {
      onPageClick(page);
    }
  };

  const accentColor = brand?.brandColor || "#0d6e6e";
  const hasThumbnails = pages && pages.length > 0;
  const canGenerateThumbnails = pdfFile && !hasThumbnails;

  if (!mounted || numPages === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-4">
      {/* 預渲染頁面縮圖 */}
      {hoveredPage !== null && hasThumbnails && pages[hoveredPage - 1] && (
        <div
          className="pointer-events-none absolute z-[60]"
          style={{
            left: tooltipPosition.x,
            bottom: 80,
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

      {/* PDF 即時產生的縮圖 */}
      {hoveredPage !== null && canGenerateThumbnails && (
        <div
          className="pointer-events-none absolute z-[60]"
          style={{
            left: tooltipPosition.x,
            bottom: 80,
            transform: "translateX(-50%)",
          }}
        >
          <div className="rounded-lg bg-gray-900 p-2 shadow-2xl" style={{ border: "1px solid #0d6e6e" }}>
            {isLoadingThumbnail ? (
              <div className="flex h-32 w-24 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-white"></div>
              </div>
            ) : thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={`頁面 ${hoveredPage}`}
                className="h-32 w-auto rounded object-contain"
                style={{ maxWidth: "160px" }}
              />
            ) : (
              <div className="flex h-32 w-24 items-center justify-center text-gray-500">
                預覽
              </div>
            )}
            <div className="mt-1 text-center text-xs font-medium" style={{ color: accentColor }}>
              頁面 {hoveredPage} / {numPages}
            </div>
          </div>
        </div>
      )}

      {/* 無法產生縮圖時只顯示頁碼 */}
      {hoveredPage !== null && !hasThumbnails && !canGenerateThumbnails && (
        <div
          className="pointer-events-none absolute z-[60]"
          style={{
            left: tooltipPosition.x,
            bottom: 60,
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
