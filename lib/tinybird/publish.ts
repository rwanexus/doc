import { z } from "zod";
import prisma from "@/lib/prisma";

import { VIDEO_EVENT_TYPES } from "../constants";
import { WEBHOOK_TRIGGERS } from "../webhook/constants";

// Check if Tinybird is configured
const TINYBIRD_ENABLED = !!process.env.TINYBIRD_TOKEN;

// Dynamically import Tinybird only if enabled
let tb: any = null;
if (TINYBIRD_ENABLED) {
  import("@chronark/zod-bird").then(({ Tinybird }) => {
    tb = new Tinybird({ token: process.env.TINYBIRD_TOKEN! });
  }).catch(err => {
    console.warn("Failed to load Tinybird:", err);
  });
}

// Page view schema
const pageViewSchema = z.object({
  id: z.string(),
  linkId: z.string(),
  documentId: z.string(),
  viewId: z.string(),
  dataroomId: z.string().nullable().optional(),
  versionNumber: z.number().int().min(1).max(65535).optional().default(1),
  time: z.number().int(),
  duration: z.number().int(),
  pageNumber: z.string(),
  country: z.string().optional().default("Unknown"),
  city: z.string().optional().default("Unknown"),
  region: z.string().optional().default("Unknown"),
  latitude: z.string().optional().default("Unknown"),
  longitude: z.string().optional().default("Unknown"),
  ua: z.string().optional().default("Unknown"),
  browser: z.string().optional().default("Unknown"),
  browser_version: z.string().optional().default("Unknown"),
  engine: z.string().optional().default("Unknown"),
  engine_version: z.string().optional().default("Unknown"),
  os: z.string().optional().default("Unknown"),
  os_version: z.string().optional().default("Unknown"),
  device: z.string().optional().default("Desktop"),
  device_vendor: z.string().optional().default("Unknown"),
  device_model: z.string().optional().default("Unknown"),
  cpu_architecture: z.string().optional().default("Unknown"),
  bot: z.boolean().optional(),
  referer: z.string().optional().default("(direct)"),
  referer_url: z.string().optional().default("(direct)"),
});

// Local page view storage
async function publishPageViewLocal(data: z.infer<typeof pageViewSchema>) {
  try {
    // Upsert page view duration
    await prisma.pageView.upsert({
      where: {
        viewId_documentId_pageNumber: {
          viewId: data.viewId,
          documentId: data.documentId,
          pageNumber: parseInt(data.pageNumber, 10),
        },
      },
      update: {
        duration: {
          increment: data.duration,
        },
        updatedAt: new Date(),
      },
      create: {
        viewId: data.viewId,
        documentId: data.documentId,
        pageNumber: parseInt(data.pageNumber, 10),
        versionNumber: data.versionNumber || 1,
        duration: data.duration,
      },
    });

    // Upsert view metadata
    await prisma.viewMetadata.upsert({
      where: { viewId: data.viewId },
      update: {},
      create: {
        viewId: data.viewId,
        country: data.country,
        city: data.city,
        browser: data.browser,
        os: data.os,
        device: data.device,
      },
    });
  } catch (error) {
    console.error("Failed to store page view locally:", error);
  }
}

// Export publishPageView - uses Tinybird if available, otherwise local storage
export const publishPageView = TINYBIRD_ENABLED && tb
  ? tb.buildIngestEndpoint({
      datasource: "page_views__v3",
      event: pageViewSchema,
    })
  : publishPageViewLocal;

// Webhook events - local no-op if Tinybird not enabled
export const recordWebhookEvent = TINYBIRD_ENABLED && tb
  ? tb.buildIngestEndpoint({
      datasource: "webhook_events__v1",
      event: z.object({
        event_id: z.string(),
        webhook_id: z.string(),
        message_id: z.string(),
        event: z.enum(WEBHOOK_TRIGGERS),
        url: z.string(),
        http_status: z.number(),
        request_body: z.string(),
        response_body: z.string(),
      }),
    })
  : async () => {}; // No-op for self-hosted

// Video views - local no-op if Tinybird not enabled
export const recordVideoView = TINYBIRD_ENABLED && tb
  ? tb.buildIngestEndpoint({
      datasource: "video_views__v1",
      event: z.object({
        timestamp: z.string(),
        id: z.string(),
        link_id: z.string(),
        document_id: z.string(),
        view_id: z.string(),
        dataroom_id: z.string().nullable(),
        version_number: z.number(),
        event_type: z.enum(VIDEO_EVENT_TYPES),
        start_time: z.number(),
        end_time: z.number().optional(),
        playback_rate: z.number(),
        volume: z.number(),
        is_muted: z.number(),
        is_focused: z.number(),
        is_fullscreen: z.number(),
        country: z.string().optional().default("Unknown"),
        city: z.string().optional().default("Unknown"),
        region: z.string().optional().default("Unknown"),
        latitude: z.string().optional().default("Unknown"),
        longitude: z.string().optional().default("Unknown"),
        ua: z.string().optional().default("Unknown"),
        browser: z.string().optional().default("Unknown"),
        browser_version: z.string().optional().default("Unknown"),
        engine: z.string().optional().default("Unknown"),
        engine_version: z.string().optional().default("Unknown"),
        os: z.string().optional().default("Unknown"),
        os_version: z.string().optional().default("Unknown"),
        device: z.string().optional().default("Desktop"),
        device_vendor: z.string().optional().default("Unknown"),
        device_model: z.string().optional().default("Unknown"),
        cpu_architecture: z.string().optional().default("Unknown"),
        bot: z.boolean().optional(),
        referer: z.string().optional().default("(direct)"),
        referer_url: z.string().optional().default("(direct)"),
        ip_address: z.string().nullable(),
      }),
    })
  : async () => {};

// Click events - local no-op if Tinybird not enabled
export const recordClickEvent = TINYBIRD_ENABLED && tb
  ? tb.buildIngestEndpoint({
      datasource: "click_events__v1",
      event: z.object({
        timestamp: z.string(),
        event_id: z.string(),
        session_id: z.string(),
        link_id: z.string(),
        document_id: z.string(),
        view_id: z.string(),
        page_number: z.string(),
        href: z.string(),
        version_number: z.number(),
        dataroom_id: z.string().nullable(),
      }),
    })
  : async () => {};

// Link view events - local no-op if Tinybird not enabled
export const recordLinkViewTB = TINYBIRD_ENABLED && tb
  ? tb.buildIngestEndpoint({
      datasource: "pm_click_events__v1",
      event: z.object({
        timestamp: z.string(),
        click_id: z.string(),
        view_id: z.string(),
        link_id: z.string(),
        document_id: z.string().nullable(),
        dataroom_id: z.string().nullable(),
        continent: z.string().optional().default("Unknown"),
        country: z.string().optional().default("Unknown"),
        city: z.string().optional().default("Unknown"),
        region: z.string().optional().default("Unknown"),
        latitude: z.string().optional().default("Unknown"),
        longitude: z.string().optional().default("Unknown"),
        device: z.string().optional().default("Desktop"),
        device_model: z.string().optional().default("Unknown"),
        device_vendor: z.string().optional().default("Unknown"),
        browser: z.string().optional().default("Unknown"),
        browser_version: z.string().optional().default("Unknown"),
        os: z.string().optional().default("Unknown"),
        os_version: z.string().optional().default("Unknown"),
        engine: z.string().optional().default("Unknown"),
        engine_version: z.string().optional().default("Unknown"),
        cpu_architecture: z.string().optional().default("Unknown"),
        ua: z.string().optional().default("Unknown"),
        bot: z.boolean().optional(),
        referer: z.string().optional().default("(direct)"),
        referer_url: z.string().optional().default("(direct)"),
        ip_address: z.string().nullable(),
      }),
    })
  : async () => {};
