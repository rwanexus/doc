import { Metadata } from "next";
import Link from "next/link";

import NotFound from "@/pages/404";
import { format } from "date-fns";
import { ClockIcon, MailIcon } from "lucide-react";

import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/utils/generate-jwt";

import AcceptInvitationButton from "./AcceptInvitationButton";
import InvitationStatusContent from "./InvitationStatusContent";
import CleanUrlOnExpire from "./status/ClientRedirect";

const data = {
  description: "接受團隊邀請",
  title: "接受邀請 | Doc",
  url: "/verify/invitation",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://doc.rwa.nexus"),
  title: data.title,
  description: data.description,
};

export default async function VerifyInvitationPage({
  searchParams,
}: {
  searchParams: {
    token?: string;
  };
}) {
  const { token: jwtToken } = searchParams;

  if (!jwtToken) {
    return <NotFound />;
  }

  // verify JWT token
  const payload = verifyJWT(jwtToken);

  if (!payload) {
    return <NotFound />;
  }

  const { verification_url, teamId, token, email, expiresAt } = payload;

  // Validate required parameters
  if (!verification_url || !teamId || !token || !email) {
    return <NotFound />;
  }
  const isExpired = expiresAt ? new Date() > new Date(expiresAt) : false;
  let isRevoked = false;
  if (!isExpired) {
    try {
      const invitation = await prisma.invitation.findUnique({
        where: {
          token: token,
        },
      });
      isRevoked = !invitation;
    } catch (error) {
      console.error("Error checking invitation status:", error);
    }
  }
  return (
    <>
      <CleanUrlOnExpire shouldClean={isExpired || isRevoked} />
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
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-[#1e3a5f]">
              團隊邀請
            </h1>
            {!isExpired && !isRevoked && (
              <>
                <p className="mt-2 text-sm text-gray-600">
                  您已被邀請加入 Doc 團隊
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-600">
                  <MailIcon className="h-4 w-4 text-gray-400" />
                  {email}
                </div>
              </>
            )}
          </div>

          {isRevoked || isExpired ? (
            <InvitationStatusContent status="expired" />
          ) : (
            <>
              <AcceptInvitationButton verificationUrl={verification_url} />
              
              {expiresAt && (
                <div className="mt-4 flex items-center justify-center gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  <ClockIcon className="h-4 w-4 text-amber-500" />
                  <span>
                    到期時間: {format(new Date(expiresAt), "yyyy/MM/dd HH:mm")}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-gray-500">
            接受邀請即表示您同意我們的服務條款和隱私政策
          </p>
        </div>
      </div>
    </>
  );
}
