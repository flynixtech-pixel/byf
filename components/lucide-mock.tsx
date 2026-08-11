import React from "react";

const createIcon = (name: string) => {
  return (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <text x="12" y="16" fontSize="10" textAnchor="middle" stroke="none" fill="currentColor">
        {name[0]}
      </text>
    </svg>
  );
};

export const Search = createIcon("Search");
export const Bell = createIcon("Bell");
export const MapPin = createIcon("MapPin");
export const ChevronDown = createIcon("ChevronDown");
export const ChevronRight = createIcon("ChevronRight");
export const Heart = createIcon("Heart");
export const Zap = createIcon("Zap");
export const Users = createIcon("Users");
export const Trophy = createIcon("Trophy");
export const Navigation = createIcon("Navigation");
export const Coffee = createIcon("Coffee");
export const Tag = createIcon("Tag");
export const SlidersHorizontal = createIcon("SlidersHorizontal");
export const Grid3X3 = createIcon("Grid3X3");
export const Menu = createIcon("Menu");
export const X = createIcon("X");
export const CalendarDays = createIcon("CalendarDays");
export const Copy = createIcon("Copy");
export const Check = createIcon("Check");
export const MessageCircle = createIcon("MessageCircle");
export const Plus = createIcon("Plus");

