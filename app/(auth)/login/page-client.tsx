"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useState } from "react";

import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { z } from "zod";

import { cn } from "@/lib/utils";

import { LastUsed, useLastUsed } from "@/components/hooks/useLastUsed";
import Google from "@/components/shared/icons/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { next } = useParams as { next?: string };

  const [lastUsed, setLastUsed] = useLastUsed();
  const authMethods = ["google", "email"] as const;
  type AuthMethod = (typeof authMethods)[number];
  const [clickedMethod, setClickedMethod] = useState<AuthMethod | undefined>(
    undefined,
  );
  const [email, setEmail] = useState<string>("");
  const [emailButtonText, setEmailButtonText] = useState<string>(
    "Continue with Email",
  );

  const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .min(3, { message: "Please enter a valid email." })
    .email({ message: "Please enter a valid email." });

  const emailValidation = emailSchema.safeParse(email);

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
          <h1 className="text-2xl font-bold text-[#1e3a5f]">
            歡迎使用 Doc
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            安全的文件分享平台
          </p>
        </div>

        {/* Email Form */}
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!emailValidation.success) {
              toast.error(emailValidation.error.errors[0].message);
              return;
            }

            setClickedMethod("email");
            signIn("email", {
              email: emailValidation.data,
              redirect: false,
              ...(next && next.length > 0 ? { callbackUrl: next } : {}),
            }).then((res) => {
              if (res?.ok && !res?.error) {
                setEmail("");
                setLastUsed("credentials");
                setEmailButtonText("郵件已發送 - 請檢查收件箱！");
                toast.success("郵件已發送 - 請檢查收件箱！");
              } else {
                setEmailButtonText("發送失敗 - 請重試");
                toast.error("發送失敗 - 請重試");
              }
              setClickedMethod(undefined);
            });
          }}
        >
          <Label className="sr-only" htmlFor="email">
            Email
          </Label>
          <Input
            id="email"
            placeholder="name@example.com"
            type="email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            disabled={clickedMethod === "email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn(
              "h-12 rounded-lg border-2 bg-white px-4 text-gray-900 transition-colors focus:border-[#1e3a5f] focus:ring-0",
              email.length > 0 && !emailValidation.success
                ? "border-red-500"
                : "border-gray-200",
            )}
          />
          <div className="relative">
            <Button
              type="submit"
              loading={clickedMethod === "email"}
              disabled={!emailValidation.success || !!clickedMethod}
              className="h-12 w-full rounded-lg bg-[#1e3a5f] text-white transition-colors hover:bg-[#152a44]"
            >
              {emailButtonText}
            </Button>
            {lastUsed === "credentials" && <LastUsed />}
          </div>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="px-4 text-sm text-gray-500">或</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>

        {/* Google Login */}
        <div className="relative">
          <Button
            onClick={() => {
              setClickedMethod("google");
              setLastUsed("google");
              signIn("google", {
                ...(next && next.length > 0 ? { callbackUrl: next } : {}),
              }).then((res) => {
                setClickedMethod(undefined);
              });
            }}
            loading={clickedMethod === "google"}
            disabled={clickedMethod && clickedMethod !== "google"}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border-2 border-gray-200 bg-white font-normal text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300"
          >
            <Google className="h-5 w-5" />
            <span>使用 Google 登入</span>
          </Button>
          {clickedMethod !== "google" && lastUsed === "google" && (
            <LastUsed />
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-500">
          繼續即表示您同意我們的服務條款和隱私政策
        </p>
      </div>
    </div>
  );
}
