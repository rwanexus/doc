import { useRouter } from "next/router";
import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjs from "pdfjs-dist";

import { useDocument } from "@/lib/swr/use-document";

import { getColorForVersion, timeFormatter } from "./utils";

// 設定 PDF.js worker
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

const CustomTooltip = ({
  payload,
  active,
}: {
  payload: any;
  active: boolean | undefined;
}) => {
  const router = useRouter();

  const pageNumber =
    payload && payload.length > 0 ? parseInt(payload[0].payload.pageNumber) : 0;

  // 獲取文件資訊
  const { document: docData } = useDocument();
  
  const [pdfThumbnail, setPdfThumbnail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastPageNumber, setLastPageNumber] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);

  // 當頁碼改變時生成新縮圖
  const generateThumbnail = useCallback(async (page: number) => {
    if (page === 0 || !docData?.versions?.[0]) return;
    
    setIsLoading(true);
    setPdfThumbnail(null);
    
    try {
      // 如果還沒載入 PDF，先載入
      if (!pdfDocRef.current) {
        const fileKey = docData.versions[0].file;
        
        // 嘗試本地檔案
        let pdfUrl = `/api/file/local/${fileKey}`;
        
        try {
          const pdf = await pdfjs.getDocument(pdfUrl).promise;
          pdfDocRef.current = pdf;
        } catch (e) {
          // 嘗試 S3
          try {
            const response = await fetch(`/api/file/s3/get-presigned-get-url-proxy`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: fileKey }),
            });
            const data = await response.json();
            if (data.url) {
              const pdf = await pdfjs.getDocument(data.url).promise;
              pdfDocRef.current = pdf;
            }
          } catch (e2) {
            console.error("Failed to load PDF:", e2);
            setIsLoading(false);
            return;
          }
        }
      }
      
      if (!pdfDocRef.current) {
        setIsLoading(false);
        return;
      }
      
      // 渲染頁面
      const pdfPage = await pdfDocRef.current.getPage(page);
      const viewport = pdfPage.getViewport({ scale: 0.5 });
      
      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
      }
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
        setPdfThumbnail(canvas.toDataURL());
      }
    } catch (e) {
      console.error("Failed to generate thumbnail:", e);
    } finally {
      setIsLoading(false);
    }
  }, [docData]);

  // 當 active 且頁碼改變時生成縮圖
  useEffect(() => {
    if (active && pageNumber > 0 && pageNumber !== lastPageNumber) {
      setLastPageNumber(pageNumber);
      generateThumbnail(pageNumber);
    }
  }, [active, pageNumber, lastPageNumber, generateThumbnail]);

  // 清理
  useEffect(() => {
    return () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, []);

  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="w-56 rounded-lg border border-gray-200 bg-white text-sm shadow-xl dark:border-gray-700 dark:bg-gray-900">
      <div className="rounded-t-lg border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
        <p className="font-semibold" style={{ color: "#0d6e6e" }}>
          頁面 {payload[0].payload.pageNumber}
        </p>
      </div>
      
      {/* 縮圖區域 */}
      <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800" style={{ minHeight: "120px" }}>
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600"></div>
            <span className="text-xs text-gray-500">載入中...</span>
          </div>
        ) : pdfThumbnail ? (
          <img
            src={pdfThumbnail}
            alt={`頁面 ${payload[0].payload.pageNumber}`}
            className="max-h-40 w-auto object-contain"
          />
        ) : (
          <div className="py-4 text-center text-xs text-gray-400">
            無法載入預覽
          </div>
        )}
      </div>
      
      {/* 數據 */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        {payload.map((item: any, idx: number) => (
          <div
            className="flex items-center justify-between px-3 py-2"
            key={idx}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full bg-emerald-500`}
                aria-hidden="true"
              ></span>
              <span className="text-gray-600 dark:text-gray-400">
                {item.dataKey}
              </span>
            </div>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {timeFormatter(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomTooltip;
