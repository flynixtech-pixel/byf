"use client";

import { usePathname, useRouter } from "next/navigation";
import { GraduationCap, LayoutGrid, Trophy, UtensilsCrossed } from "lucide-react";
import { NAV_ITEMS_BY_VERTICAL } from "./Sidebar";
import type { VendorVertical } from "@/lib/api/types";

const META: Record<VendorVertical, { label: string; icon: typeof LayoutGrid }> = {
  turf: { label: "Turf", icon: LayoutGrid },
  events: { label: "Events", icon: Trophy },
  food: { label: "Food", icon: UtensilsCrossed },
  coaches: { label: "Coaches", icon: GraduationCap },
};

/**
 * Mobile-only panel switcher shown at the top of every vendor page — a workspace-
 * style pill row so a multi-vertical vendor always sees which panel they're in and
 * can jump between them in one tap. Renders nothing for single-vertical vendors, so
 * they're unaffected. Desktop uses the sidebar's "Switch panel" control instead.
 */
export function VendorPanelSwitcher({ verticals: _verticals }: { verticals: VendorVertical[] }) {
  return null;
}
