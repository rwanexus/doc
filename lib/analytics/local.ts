import prisma from "@/lib/prisma";

// Type definitions
type VideoEvent = {
  timestamp: string;
  view_id: string;
  event_type: string;
  start_time: number;
  end_time: number;
  playback_rate: number;
  volume: number;
  is_muted: number;
  is_focused: number;
  is_fullscreen: number;
};

type ClickEvent = {
  timestamp: string;
  document_id: string;
  dataroom_id: string | null;
  view_id: string;
  page_number: string;
  version_number: number;
  href: string;
};

// Get total average page duration for a document
export async function getTotalAvgPageDuration(params: {
  documentId: string;
  excludedLinkIds?: string;
  excludedViewIds?: string;
  since: number;
}) {
  const { documentId, excludedViewIds, since } = params;
  
  const excludedIds = excludedViewIds ? excludedViewIds.split(",") : [];
  const sinceDate = new Date(since);

  const result = await prisma.pageView.groupBy({
    by: ["pageNumber", "versionNumber"],
    where: {
      documentId,
      viewId: excludedIds.length > 0 ? { notIn: excludedIds } : undefined,
      createdAt: { gte: sinceDate },
    },
    _avg: {
      duration: true,
    },
  });

  return {
    data: result.map((r) => ({
      pageNumber: r.pageNumber.toString(),
      versionNumber: r.versionNumber,
      avg_duration: r._avg.duration || 0,
    })),
  };
}

// Get page duration per view
export async function getViewPageDuration(params: {
  documentId: string;
  viewId: string;
  since: number;
  until?: number;
}) {
  const { documentId, viewId, since, until } = params;

  const result = await prisma.pageView.findMany({
    where: {
      documentId,
      viewId,
      createdAt: {
        gte: new Date(since),
        ...(until ? { lte: new Date(until) } : {}),
      },
    },
    select: {
      pageNumber: true,
      duration: true,
    },
    orderBy: {
      pageNumber: "asc",
    },
  });

  return {
    data: result.map((r) => ({
      pageNumber: r.pageNumber.toString(),
      sum_duration: r.duration,
    })),
  };
}

// Get view completion stats
export async function getViewCompletionStats(params: {
  documentId: string;
  excludedViewIds?: string;
  since: number;
}) {
  const { documentId, excludedViewIds, since } = params;
  
  const excludedIds = excludedViewIds ? excludedViewIds.split(",") : [];

  const result = await prisma.pageView.groupBy({
    by: ["viewId", "versionNumber"],
    where: {
      documentId,
      viewId: excludedIds.length > 0 ? { notIn: excludedIds } : undefined,
      createdAt: { gte: new Date(since) },
    },
    _count: {
      pageNumber: true,
    },
  });

  return {
    data: result.map((r) => ({
      viewId: r.viewId,
      versionNumber: r.versionNumber,
      pages_viewed: r._count.pageNumber,
    })),
  };
}

// Get total document duration
export async function getTotalDocumentDuration(params: {
  documentId: string;
  excludedLinkIds?: string;
  excludedViewIds?: string;
  since: number;
  until?: number;
}) {
  const { documentId, excludedViewIds, since, until } = params;
  
  const excludedIds = excludedViewIds ? excludedViewIds.split(",") : [];

  const result = await prisma.pageView.aggregate({
    where: {
      documentId,
      viewId: excludedIds.length > 0 ? { notIn: excludedIds } : undefined,
      createdAt: {
        gte: new Date(since),
        ...(until ? { lte: new Date(until) } : {}),
      },
    },
    _sum: {
      duration: true,
    },
  });

  return {
    data: [{ sum_duration: result._sum.duration || 0 }],
  };
}

// Get total link duration
export async function getTotalLinkDuration(params: {
  linkId: string;
  documentId: string;
  excludedViewIds?: string;
  since: number;
  until?: number;
}) {
  const { linkId, documentId, excludedViewIds, since, until } = params;
  
  const excludedIds = excludedViewIds ? excludedViewIds.split(",") : [];

  const views = await prisma.view.findMany({
    where: {
      linkId,
      documentId,
      id: excludedIds.length > 0 ? { notIn: excludedIds } : undefined,
      viewedAt: {
        gte: new Date(since),
        ...(until ? { lte: new Date(until) } : {}),
      },
    },
    select: { id: true },
  });

  const viewIds = views.map((v) => v.id);

  const result = await prisma.pageView.aggregate({
    where: {
      viewId: { in: viewIds },
    },
    _sum: {
      duration: true,
    },
  });

  return {
    data: [{
      sum_duration: result._sum.duration || 0,
      view_count: viewIds.length,
    }],
  };
}

// Get total viewer duration
export async function getTotalViewerDuration(params: {
  viewIds: string;
  since: number;
  until?: number;
}) {
  const { viewIds: viewIdsStr, since, until } = params;
  
  const viewIds = viewIdsStr.split(",");

  const result = await prisma.pageView.aggregate({
    where: {
      viewId: { in: viewIds },
      createdAt: {
        gte: new Date(since),
        ...(until ? { lte: new Date(until) } : {}),
      },
    },
    _sum: {
      duration: true,
    },
  });

  return {
    data: [{ sum_duration: result._sum.duration || 0 }],
  };
}

// Get view user agent (v3 - viewId only)
export async function getViewUserAgent(params: { viewId: string }) {
  const { viewId } = params;

  const metadata = await prisma.viewMetadata.findUnique({
    where: { viewId },
  });

  if (!metadata) {
    return { data: [] as { country: string; city: string; browser: string; os: string; device: string }[] };
  }

  return {
    data: [{
      country: metadata.country || "Unknown",
      city: metadata.city || "Unknown",
      browser: metadata.browser || "Unknown",
      os: metadata.os || "Unknown",
      device: metadata.device || "Unknown",
    }],
  };
}

// Get view user agent (v2 - with documentId and since)
export async function getViewUserAgent_v2(params: {
  documentId: string;
  viewId: string;
  since: number;
}) {
  const { viewId } = params;
  return getViewUserAgent({ viewId });
}

// Get document duration per viewer
export async function getDocumentDurationPerViewer(params: {
  documentId: string;
  viewIds: string;
}) {
  const { documentId, viewIds: viewIdsStr } = params;
  
  const viewIds = viewIdsStr.split(",");

  const result = await prisma.pageView.aggregate({
    where: {
      documentId,
      viewId: { in: viewIds },
    },
    _sum: {
      duration: true,
    },
  });

  return {
    data: [{ sum_duration: result._sum.duration || 0 }],
  };
}

// Get total dataroom duration
export async function getTotalDataroomDuration(params: {
  dataroomId: string;
  excludedLinkIds?: string[];
  excludedViewIds?: string[];
  since: number;
}) {
  const { dataroomId, excludedViewIds, since } = params;

  const views = await prisma.view.findMany({
    where: {
      dataroomId,
      id: excludedViewIds && excludedViewIds.length > 0 ? { notIn: excludedViewIds } : undefined,
      viewedAt: { gte: new Date(since) },
    },
    select: { id: true },
  });

  const viewIds = views.map((v) => v.id);

  const result = await prisma.pageView.groupBy({
    by: ["viewId"],
    where: {
      viewId: { in: viewIds },
    },
    _sum: {
      duration: true,
    },
  });

  return {
    data: result.map((r) => ({
      viewId: r.viewId,
      sum_duration: r._sum.duration || 0,
    })),
  };
}

// Get total team duration
export async function getTotalTeamDuration(params: {
  documentIds: string;
  since: number;
  until: number;
}) {
  const { documentIds: docIdsStr, since, until } = params;
  
  const documentIds = docIdsStr.split(",");

  const result = await prisma.pageView.aggregate({
    where: {
      documentId: { in: documentIds },
      createdAt: {
        gte: new Date(since),
        lte: new Date(until),
      },
    },
    _sum: {
      duration: true,
    },
  });

  const countries = await prisma.viewMetadata.findMany({
    where: {
      view: {
        documentId: { in: documentIds },
        viewedAt: {
          gte: new Date(since),
          lte: new Date(until),
        },
      },
    },
    select: { country: true },
    distinct: ["country"],
  });

  return {
    data: [{
      total_duration: result._sum.duration || 0,
      unique_countries: countries.map((c) => c.country || "Unknown"),
    }],
  };
}

// Video events - return empty array with proper type
export async function getVideoEventsByDocument(_params: { document_id: string }): Promise<{ data: VideoEvent[] }> {
  return { data: [] };
}

export async function getVideoEventsByView(_params: { document_id: string; view_id: string }): Promise<{ data: VideoEvent[] }> {
  return { data: [] };
}

// Click events - return empty array with proper type
export async function getClickEventsByView(params: { document_id: string; view_id: string }): Promise<{ data: ClickEvent[] }> {
  const clickEvents = await prisma.clickEvent.findMany({
    where: {
      documentId: params.document_id,
      viewId: params.view_id,
    },
    orderBy: {
      timestamp: 'desc',
    },
  });
  
  return {
    data: clickEvents.map(e => ({
      timestamp: e.timestamp.toISOString(),
      document_id: e.documentId,
      dataroom_id: e.dataroomId,
      view_id: e.viewId,
      page_number: e.pageNumber,
      version_number: e.versionNumber,
      href: e.href,
    })),
  };
}

// Webhook events - return empty for now
export async function getWebhookEvents(_params: { webhookId: string }) {
  return { data: [] as any[] };
}
