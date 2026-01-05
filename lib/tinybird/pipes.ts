// Local Analytics - Replacing Tinybird with PostgreSQL

import * as localAnalytics from "@/lib/analytics/local";

// Re-export all functions from local analytics
export const getTotalAvgPageDuration = localAnalytics.getTotalAvgPageDuration;
export const getViewPageDuration = localAnalytics.getViewPageDuration;
export const getViewCompletionStats = localAnalytics.getViewCompletionStats;
export const getTotalDocumentDuration = localAnalytics.getTotalDocumentDuration;
export const getTotalLinkDuration = localAnalytics.getTotalLinkDuration;
export const getTotalViewerDuration = localAnalytics.getTotalViewerDuration;
export const getViewUserAgent = localAnalytics.getViewUserAgent;
export const getViewUserAgent_v2 = localAnalytics.getViewUserAgent_v2;
export const getDocumentDurationPerViewer = localAnalytics.getDocumentDurationPerViewer;
export const getTotalDataroomDuration = localAnalytics.getTotalDataroomDuration;
export const getTotalTeamDuration = localAnalytics.getTotalTeamDuration;
export const getVideoEventsByDocument = localAnalytics.getVideoEventsByDocument;
export const getVideoEventsByView = localAnalytics.getVideoEventsByView;
export const getClickEventsByView = localAnalytics.getClickEventsByView;
export const getWebhookEvents = localAnalytics.getWebhookEvents;
