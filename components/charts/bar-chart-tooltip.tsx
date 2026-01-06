import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";

import { useDocumentThumbnail, useDocument } from "@/lib/swr/use-document";
import { getFile } from "@/lib/files/get-file";

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
  const documentId = router.query.id as string;

  const pageNumber =
    payload && payload.length > 0 ? parseInt(payload[0].payload.pageNumber) : 0;

  const versionNumber =
    payload && payload.length > 0
      ? parseInt(payload[0].payload.versionNumber)
      : 1;

  // 嘗試獲取預渲染的縮圖
  const { data, error } = useDocumentThumbnail(
    pageNumber,
    documentId,
    versionNumber,
  );

  // 獲取文件資訊以取得 PDF 檔案 URL
  const { document: docData } = useDocument();
  
  const [pdfThumbnail, setPdfThumbnail] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);

  const imageUrl = data && !error ? data.imageUrl : null;

  // 如果沒有預渲染縮圖，嘗試從 PDF 生成
  useEffect(() => {
    if (!active || pageNumber === 0 || imageUrl) return;
    if (!docData?.versions?.[0]?.file) return;
    
    const generatePdfThumbnail = async () => {
      setIsLoadingPdf(true);
      try {
        // 獲取 PDF 檔案 URL
        const pdfUrl = await fetch(`/api/file/s3/get-presigned-get-url-proxy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: docData.versions[0].file }),
        }).then(res => res.json()).then(data => data.url).catch(() => null);
        
        if (!pdfUrl) {
          // 嘗試本地檔案
          const localUrl = `/api/file/local/${docData.versions[0].file}`;
          try {
            const pdf = await pdfjs.getDocument(localUrl).promise;
            pdfDocRef.current = pdf;
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 0.4 });
            
            if (!canvasRef.current) {
              canvasRef.current = document.createElement("canvas");
            }
            const canvas = canvasRef.current;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            const ctx = canvas.getContext("2d");
            if (ctx) {
              await page.render({ canvasContext: ctx, viewport }).promise;
              setPdfThumbnail(canvas.toDataURL());
            }
          } catch (e) {
            console.error("Failed to generate PDF thumbnail:", e);
          }
        } else {
          const pdf = await pdfjs.getDocument(pdfUrl).promise;
          pdfDocRef.current = pdf;
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 0.4 });
          
          if (!canvasRef.current) {
            canvasRef.current = document.createElement("canvas");
          }
          const canvas = canvasRef.current;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            setPdfThumbnail(canvas.toDataURL());
          }
        }
      } catch (e) {
        console.error("Failed to generate PDF thumbnail:", e);
      } finally {
        setIsLoadingPdf(false);
      }
    };

    generatePdfThumbnail();
  }, [active, pageNumber, imageUrl, docData]);

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

  const thumbnailToShow = imageUrl || pdfThumbnail;

  return (
    <div className="w-52 rounded-md border border-tremor-border bg-tremor-background text-sm leading-6 shadow-lg dark:border-dark-tremor-border dark:bg-dark-tremor-background">
      <div className="rounded-t-md border-b border-tremor-border bg-tremor-background px-2.5 py-2 dark:border-dark-tremor-border dark:bg-dark-tremor-background">
        <p className="font-medium text-tremor-content dark:text-dark-tremor-content" style={{ color: "#0d6e6e" }}>
          頁面 {payload[0].payload.pageNumber}
        </p>
        {isLoadingPdf && !thumbnailToShow ? (
          <div className="mt-2 flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600"></div>
          </div>
        ) : thumbnailToShow ? (
          <img
            src={thumbnailToShow}
            alt={`頁面 ${payload[0].payload.pageNumber} 縮圖`}
            className="mt-2 w-full rounded border border-gray-200 object-contain dark:border-gray-700"
            style={{ maxHeight: "160px" }}
          />
        ) : null}
      </div>
      {payload.map((item: any, idx: number) => (
        <div
          className="flex w-full items-center justify-between space-x-4 px-2.5 py-2"
          key={idx}
        >
          <div className="text-overflow-ellipsis flex items-center space-x-2 overflow-hidden whitespace-nowrap">
            <span
              className={`bg-${getColorForVersion(item.dataKey)}-500 h-2.5 w-2.5 flex-shrink-0 rounded-full`}
              aria-hidden="true"
            ></span>
            <p className="text-overflow-ellipsis overflow-hidden whitespace-nowrap text-tremor-content dark:text-dark-tremor-content">
              {item.dataKey}
            </p>
          </div>
          <p className="font-medium text-tremor-content-emphasis dark:text-dark-tremor-content-emphasis">
            {timeFormatter(item.value)}
          </p>
        </div>
      ))}
    </div>
  );
};

export default CustomTooltip;
