"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DineoutRestaurant } from "@/components/dineout/DineoutRestaurant";
import { ApiError } from "@/lib/api/client";
import { getFoodOutletMenu } from "@/lib/api/foodOrders";
import type { FoodOutlet, MenuItem } from "@/lib/api/types";
import { DINING_SPOTS } from "@/lib/dineout-catalog";

function fallbackOutlet(slugOrId: string): { outlet: FoodOutlet; menu: MenuItem[] } {
  const spot = DINING_SPOTS.find((item) => item.slug === slugOrId) ?? DINING_SPOTS[0]!;
  const now = new Date().toISOString();
  return {
    outlet: {
      _id: slugOrId,
      vendorId: "catalog",
      slug: spot.slug,
      name: spot.name,
      kind: "dining",
      offer: spot.offers[0],
      description: spot.vibe,
      cuisines: spot.cuisines,
      logo: spot.hero,
      banner: spot.hero,
      poster: spot.hero,
      gallery: spot.gallery,
      location: { city: "Udaipur", area: spot.area },
      weeklyAvailability: [],
      leaves: [],
      categoryPrepTimes: [],
      dineout: {
        tableBooking: true,
        payBill: true,
        flatDiscountPct: 10,
        slotMinutes: 60,
        tablesPerSlot: 10,
        maxPartySize: 20,
        advanceDays: 30,
        costForTwo: spot.costForTwo,
        autoConfirm: false,
      },
      serviceBufferMins: 5,
      fulfilment: { preOrder: false, inVenue: false, postMatch: false, dineIn: true },
      status: "Active",
      createdAt: now,
      updatedAt: now,
    },
    menu: [],
  };
}

export default function FoodOutletDetailPage() {
  const params = useParams();
  const vendorId = typeof params.vendorId === "string" ? params.vendorId : Array.isArray(params.vendorId) ? params.vendorId[0] ?? "" : "";
  const [payload, setPayload] = useState<{ outlet: FoodOutlet; menu: MenuItem[] }>(() => fallbackOutlet("bookyourvibe-dining"));

  useEffect(() => {
    if (!vendorId) return;
    let cancelled = false;
    getFoodOutletMenu(vendorId)
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setPayload(fallbackOutlet(vendorId));
          return;
        }
        setPayload(fallbackOutlet(vendorId));
      });
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  return <DineoutRestaurant outlet={payload.outlet} menu={payload.menu} />;
}
