import { Metadata } from "next";

import RegisterClient from "./page-client";

const data = {
  description: "Signup to Doc",
  title: "Sign up | Doc",
  url: "/register",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://doc.rwa.nexus"),
  title: data.title,
  description: data.description,
  openGraph: {
    title: data.title,
    description: data.description,
    url: data.url,
    siteName: "Doc",
    images: [
      {
        url: "/_static/meta-image.png",
        width: 800,
        height: 600,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: data.title,
    description: data.description,
    creator: "@doc_rwa_nexus",
    images: ["/_static/meta-image.png"],
  },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
