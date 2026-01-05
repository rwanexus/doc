import { Metadata } from "next";
import Link from "next/link";

import NotFound from "@/pages/404";

import { generateChecksum } from "@/lib/utils/generate-checksum";

import { Button } from "@/components/ui/button";

const data = {
  description: "驗證登入 Doc",
  title: "驗證 | Doc",
  url: "/verify",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://doc.rwa.nexus"),
  title: data.title,
  description: data.description,
};

export default function VerifyPage({
  searchParams,
}: {
  searchParams: { verification_url?: string; checksum?: string };
}) {
  const { verification_url, checksum } = searchParams;

  if (!verification_url || !checksum) {
    return <NotFound />;
  }

  const isValidVerificationUrl = (url: string, checksum: string): boolean => {
    try {
      const urlObj = new URL(url);
      if (urlObj.origin !== process.env.NEXTAUTH_URL) return false;
      const expectedChecksum = generateChecksum(url);
      return checksum === expectedChecksum;
    } catch {
      return false;
    }
  };

  if (!isValidVerificationUrl(verification_url, checksum)) {
    return <NotFound />;
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#fafafa]">
      <div className="z-10 mx-5 w-full max-w-md overflow-hidden rounded-xl bg-white p-8 shadow-lg">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <img
            src="/_static/doc-logo.png"
            alt="RWA Nexus"
            className="h-16 w-auto"
          />
        </div>
        
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#1a3a6e]">
            驗證您的登入
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            點擊下方按鈕完成驗證
          </p>
        </div>

        {/* Verify Button */}
        <Link href={verification_url}>
          <Button className="h-12 w-full rounded-lg bg-[#1a3a6e] text-white transition-colors hover:bg-[#0f2847]">
            驗證 Email
          </Button>
        </Link>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-500">
          如果這不是您的操作，請忽略此頁面
        </p>
      </div>
    </div>
  );
}
