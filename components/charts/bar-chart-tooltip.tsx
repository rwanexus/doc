import { useRouter } from "next/router";
import { useState, useEffect } from "react";

import { getColorForVersion, timeFormatter } from "./utils";

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
    payload && payload.length > 0 && payload[0].payload.versionNumber
      ? parseInt(payload[0].payload.versionNumber)
      : 1;

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<string>("");

  // 獲取縮圖
  useEffect(() => {
    if (!active || pageNumber === 0 || !documentId) {
      setImageUrl(null);
      return;
    }

    const fetchKey = `${documentId}-${pageNumber}-${versionNumber}`;
    if (fetchKey === lastFetched) return;

    setIsLoading(true);
    setImageUrl(null);

    fetch(`/api/jobs/get-thumbnail?documentId=${documentId}&pageNumber=${pageNumber}&versionNumber=${versionNumber}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch thumbnail");
        return res.json();
      })
      .then(data => {
        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
          setLastFetched(fetchKey);
        }
      })
      .catch(err => {
        console.log("Thumbnail not available:", err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [active, pageNumber, documentId, versionNumber, lastFetched]);

  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="w-56 rounded-lg border border-gray-200 bg-white text-sm shadow-xl dark:border-gray-700 dark:bg-gray-900">
      <div className="rounded-t-lg border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
        <p className="font-semibold" style={{ color: "#0d6e6e" }}>
          頁面 {payload[0].payload.pageNumber}
        </p>
      </div>
      
      {/* 縮圖區域 */}
      {(isLoading || imageUrl) && (
        <div className="flex items-center justify-center bg-gray-100 p-2 dark:bg-gray-800" style={{ minHeight: "120px" }}>
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600"></div>
              <span className="text-xs text-gray-500">載入中...</span>
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={`頁面 ${payload[0].payload.pageNumber}`}
              className="max-h-40 w-auto rounded object-contain shadow-sm"
            />
          ) : null}
        </div>
      )}
      
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
