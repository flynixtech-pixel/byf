"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PackageStudio, type AcademyDraft } from "@/components/vendor/PackageStudio";
import { EventStudio } from "@/components/vendor/EventStudio";
import { Listing as MockListing, ListingType } from "@/lib/types";
import { addAcademyToListing, createVendorListing } from "@/lib/api/vendor";
import { mockListingToApiInput } from "@/lib/api/listingAdapter";
import { ApiError } from "@/lib/api/client";
import { Toast } from "@/components/admin/Toast";

function NewListingStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kind = searchParams.get("kind");
  const initialType: ListingType = kind === "event" ? "Event" : "Turf";
  const [toast, setToast] = useState<string | null>(null);

  async function handleSave(listing: MockListing, academy?: AcademyDraft) {
    try {
      const created = await createVendorListing(mockListingToApiInput(listing));

      // An academy needs the listing id to attach to, so it's created right after.
      // A failure here must not lose the listing that was just created successfully —
      // send the vendor to it with a note instead of blowing up the whole save.
      if (academy) {
        const price = Number(academy.price) || 0;
        try {
          await addAcademyToListing(created._id, {
            name: academy.name.trim(),
            category: academy.sports[0],
            categories: academy.sports,
            batches: [
              {
                name: "Main Batch",
                startTime: academy.startTime,
                endTime: academy.endTime,
                days: academy.days,
                capacity: Number(academy.capacity) || 1,
                // priceMonthly/priceYearly stay populated whatever the vendor quotes
                // in, so enrolment (which is always demo/monthly/yearly) keeps working.
                priceMonthly: price,
                priceYearly: price * 10,
                pricingMode: academy.pricingMode,
                pricePerSession: academy.pricingMode === "session" ? price : undefined,
                pricePerDay: academy.pricingMode === "day" ? price : undefined,
              },
            ],
          });
          // Adding an academy grants the vendor a new "coaches" vertical server-side.
          // A full navigation (not router.push) is what makes the panel layout re-read
          // that session, so Coaches actually appears in the nav without a re-login.
          window.location.assign(`/vendor/listings/${created._id}`);
          return;
        } catch (err) {
          setToast(
            err instanceof ApiError
              ? `Listing saved, but the academy didn't: ${err.describe()}`
              : "Listing saved, but the academy didn't. You can add it from Coaches."
          );
          return;
        }
      }

      router.push(`/vendor/listings/${created._id}`);
    } catch (err) {
      setToast(err instanceof ApiError ? err.describe() : "Failed to create listing");
    }
  }

  if (kind === "event") {
    return (
      <EventStudio
        mode="create"
        onClose={() => router.push("/vendor/listings")}
        onSave={handleSave}
      />
    );
  }

  return (
    <>
      <PackageStudio
        mode="create"
        initialType={initialType}
        onClose={() => router.push("/vendor/listings")}
        onSave={handleSave}
      />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

export default function NewListingPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-50 bg-cream-200" />}>
      <NewListingStudio />
    </Suspense>
  );
}
