"use client";

import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  className?: string;
  boxClassName?: string;
  imageClassName?: string;
  logoBoxClassName?: string;
  textClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  showText?: boolean;
  showTagline?: boolean;
  priority?: boolean;
  href?: string;
};

export function BrandLogo({
  className = "",
  boxClassName = "border-slate-200 bg-white shadow-sm",
  imageClassName = "p-1",
  logoBoxClassName = "h-10 w-10 rounded-xl",
  textClassName = "",
  titleClassName = "text-slate-900",
  subtitleClassName = "text-slate-400",
  showText = true,
  showTagline = true,
  priority = false,
  href = "/",
}: BrandLogoProps) {
  return (
    <Link href={href} className={`flex min-w-0 items-center gap-3 ${className}`.trim()}>
      <div className={`shrink-0 overflow-hidden border bg-white shadow-sm ${boxClassName} ${logoBoxClassName}`.trim()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.jpg"
          alt="Book Your Vibe logo"
          className={`h-full w-full object-contain ${imageClassName}`.trim()}
        />
      </div>

      {showText && (
        <div className={`min-w-0 leading-tight ${textClassName}`.trim()}>
          <p className={`text-sm sm:text-base font-black tracking-tight ${titleClassName}`.trim()}>
            BOOK YOUR <span className="text-brand-600">VIBE</span>
          </p>
          {showTagline && (
            <p className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest ${subtitleClassName}`.trim()}>
              BOOK • PLAY • EAT • REPEAT
            </p>
          )}
        </div>
      )}
    </Link>
  );
}
