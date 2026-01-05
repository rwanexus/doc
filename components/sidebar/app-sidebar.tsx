"use client";

import Link from "next/link";
import { useRouter } from "next/router";

import * as React from "react";
import { useEffect, useState } from "react";

import { TeamContextType, initialState, useTeam } from "@/context/team-context";
import { PlanEnum } from "@/ee/stripe/constants";
import Cookies from "js-cookie";
import {
  BrushIcon,
  CogIcon,
  ContactIcon,
  FolderIcon,
  HouseIcon,
  Loader,
  PauseCircleIcon,
  ServerIcon,
  Sparkles as SparklesIcon,
  WorkflowIcon,
} from "lucide-react";

import { useFeatureFlags } from "@/lib/hooks/use-feature-flags";
import { usePlan } from "@/lib/swr/use-billing";
import useDatarooms from "@/lib/swr/use-datarooms";
import useLimits from "@/lib/swr/use-limits";

import { NavMain } from "@/components/sidebar/nav-main";
import { NavUser } from "@/components/sidebar/nav-user";
import { TeamSwitcher } from "@/components/sidebar/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { BadgeTooltip } from "../ui/tooltip";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const { currentTeam, teams, setCurrentTeam, isLoading }: TeamContextType =
    useTeam() || initialState;
  const {
    plan: userPlan,
    isAnnualPlan,
    isPro,
    isBusiness,
    isDatarooms,
    isDataroomsPlus,
    isDataroomsPremium,
    isFree,
    isTrial,
    isPaused,
  } = usePlan();

  const { limits } = useLimits();
  const linksLimit = limits?.links;
  const documentsLimit = limits?.documents;


  // Check feature flags
  const { features } = useFeatureFlags();

  // Fetch datarooms for the current team
  const { datarooms } = useDatarooms();

  // Prepare datarooms items for sidebar (limit to first 5, sorted by most recent)
  const dataroomItems =
    datarooms && datarooms.length > 0
      ? datarooms.slice(0, 5).map((dataroom) => ({
          title: dataroom.name,
          url: `/datarooms/${dataroom.id}/documents`,
          current:
            router.pathname.includes("/datarooms/[id]") &&
            String(router.query.id) === String(dataroom.id),
        }))
      : undefined;

  const data = {
    navMain: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: HouseIcon,
        current: router.pathname.includes("dashboard"),
      },
      {
        title: "All Documents",
        url: "/documents",
        icon: FolderIcon,
        current:
          router.pathname.includes("documents") &&
          !router.pathname.includes("datarooms"),
      },
      {
        title: "All Datarooms",
        url: "/datarooms",
        icon: ServerIcon,
        current: router.pathname === "/datarooms",
        disabled: !isBusiness && !isDatarooms && !isDataroomsPlus && !isTrial,
        trigger: "sidebar_datarooms",
        plan: PlanEnum.Business,
        highlightItem: ["datarooms"],
        isActive:
          router.pathname.includes("datarooms") &&
          (isBusiness || isDatarooms || isDataroomsPlus || isTrial),
        items:
          isBusiness || isDatarooms || isDataroomsPlus || isTrial
            ? dataroomItems
            : undefined,
      },
      {
        title: "Visitors",
        url: "/visitors",
        icon: ContactIcon,
        current: router.pathname.includes("visitors"),
        disabled: isFree && !isTrial,
        trigger: "sidebar_visitors",
        plan: PlanEnum.Pro,
        highlightItem: ["visitors"],
      },
      {
        title: "Workflows",
        url: "/workflows",
        icon: WorkflowIcon,
        current: router.pathname.includes("/workflows"),
        disabled: !features?.workflows,
        trigger: "sidebar_workflows",
        plan: PlanEnum.DataRoomsPlus,
        highlightItem: ["workflows"],
      },
      {
        title: "Branding",
        url: "/branding",
        icon: BrushIcon,
        current:
          router.pathname.includes("branding") &&
          !router.pathname.includes("datarooms"),
      },
      {
        title: "Settings",
        url: "/settings/general",
        icon: CogIcon,
        isActive:
          router.pathname.includes("settings") &&
          !router.pathname.includes("branding") &&
          !router.pathname.includes("datarooms") &&
          !router.pathname.includes("documents"),
        items: [
          {
            title: "General",
            url: "/settings/general",
            current: router.pathname.includes("settings/general"),
          },
          {
            title: "Team",
            url: "/settings/people",
            current: router.pathname.includes("settings/people"),
          },
          {
            title: "Domains",
            url: "/settings/domains",
            current: router.pathname.includes("settings/domains"),
          },
          {
            title: "Webhooks",
            url: "/settings/webhooks",
            current: router.pathname.includes("settings/webhooks"),
          },
          {
            title: "Billing",
            url: "/settings/billing",
            current: router.pathname.includes("settings/billing"),
          },
        ],
      },

    ],
  };

  // Filter out items that should be hidden based on feature flags
  const filteredNavMain = data.navMain.filter((item) => {
    // Hide workflows if feature flag is not enabled
    if (item.title === "Workflows" && !features?.workflows) {
      return false;
    }
    return true;

  });
  return (
    <Sidebar
      className="bg-gray-50 dark:bg-black"
      sidebarClassName="bg-gray-50 dark:bg-black"
      side="left"
      variant="inset"
      collapsible="icon"
      {...props}
    >
      <SidebarHeader className="gap-y-8">
        <p className="hidden w-full justify-center text-2xl font-bold tracking-tighter text-[#1e3a5f] group-data-[collapsible=icon]:inline-flex dark:text-white">
          <Link href="/dashboard"><img src="/_static/doc-icon.svg" alt="Doc" className="h-6 w-6" /></Link>
        </p>
        <p className="ml-2 flex items-center text-2xl font-bold tracking-tighter text-[#1e3a5f] group-data-[collapsible=icon]:hidden dark:text-white">
          <Link href="/dashboard">Doc</Link>
          {userPlan && !isFree && !isDataroomsPlus && !isDataroomsPremium ? (
            <span className="relative ml-4 inline-flex items-center rounded-full bg-background px-2.5 py-1 text-xs tracking-normal text-foreground ring-1 ring-gray-800">
              {userPlan.charAt(0).toUpperCase() + userPlan.slice(1)}
              {isPaused ? (
                <BadgeTooltip content="Subscription paused">
                  <PauseCircleIcon className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-background text-amber-500" />
                </BadgeTooltip>
              ) : null}
            </span>
          ) : null}
          {isDataroomsPlus ? (
            <span className="relative ml-4 inline-flex items-center rounded-full bg-background px-2.5 py-1 text-xs tracking-normal text-foreground ring-1 ring-gray-800">
              Datarooms+
              {isPaused ? (
                <BadgeTooltip content="Subscription paused">
                  <PauseCircleIcon className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-background text-amber-500" />
                </BadgeTooltip>
              ) : null}
            </span>
          ) : null}
          {isDataroomsPremium ? (
            <span className="relative ml-4 inline-flex items-center rounded-full bg-background px-2.5 py-1 text-xs tracking-normal text-foreground ring-1 ring-gray-800">
              Premium
              {isPaused ? (
                <BadgeTooltip content="Subscription paused">
                  <PauseCircleIcon className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-background text-amber-500" />
                </BadgeTooltip>
              ) : null}
            </span>
          ) : null}
          {isTrial ? (
            <span className="ml-2 rounded-sm bg-foreground px-2 py-0.5 text-xs tracking-normal text-background ring-1 ring-gray-800">
              Trial
            </span>
          ) : null}
        </p>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm">
            <Loader className="h-5 w-5 animate-spin" /> Loading teams...
          </div>
        ) : (
          <TeamSwitcher
            currentTeam={currentTeam}
            teams={teams}
            setCurrentTeam={setCurrentTeam}
          />
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}

