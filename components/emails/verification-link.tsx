import React from "react";

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { Footer } from "./shared/footer";

const VerificationLinkEmail = ({
  url = "https://doc.rwa.nexus",
}: {
  url: string;
}) => {
  return (
    <Html>
      <Head />
      <Preview>您的 Doc 登入連結</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 px-10 py-5">
            <Section className="mt-8">
              <Text className="text-2xl font-bold tracking-tighter" style={{ color: "#1a3a6e" }}>
                Doc
              </Text>
            </Section>
            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              您的登入連結
            </Heading>
            <Text className="text-sm leading-6 text-black">
              歡迎使用 Doc！
            </Text>
            <Text className="text-sm leading-6 text-black">
              請點擊下方按鈕登入您的帳號。
            </Text>
            <Section className="my-8">
              <Link
                className="rounded-lg px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                style={{ backgroundColor: "#1a3a6e" }}
                href={url}
              >
                登入 Doc
              </Link>
            </Section>
            <Text className="text-sm leading-6 text-black">
              或複製以下連結到瀏覽器：
            </Text>
            <Link
              href={url}
              className="max-w-sm flex-wrap break-words font-medium no-underline"
              style={{ color: "#1a3a6e" }}
            >
              {url}
            </Link>
            <Footer />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default VerificationLinkEmail;
