"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export function ModalShell({
  children,
  onClose,
  title,
  subtitle,
  imagePanel,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  imagePanel?: { src: string; alt: string };
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <style>{`
        @keyframes drawLine {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: 0; }
        }
        .animate-draw-line {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: drawLine 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          animation-delay: 0.3s;
        }
      `}</style>
      <div
        className="fixed inset-0 z-[200] font-sans flex items-center justify-center overflow-y-auto overscroll-none bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm transition-all duration-300"
        onClick={onClose}
        role="presentation"
      >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative my-auto max-h-[calc(100dvh-2rem)] w-full overflow-hidden rounded-3xl bg-white/95 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] backdrop-blur-2xl ring-1 ring-white/50 sm:max-h-[92dvh] ${
          imagePanel ? "max-w-[1050px] flex flex-col md:flex-row md:min-h-[650px]" : "max-w-md p-6 sm:p-8"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {imagePanel && (
          <div className="hidden relative w-full shrink-0 md:block md:h-auto md:w-[55%] bg-slate-900 overflow-hidden md:rounded-l-3xl md:rounded-tr-none">
             <img src={imagePanel.src} alt={imagePanel.alt} className="absolute inset-0 h-full w-full object-cover object-center" />
          </div>
        )}
        <div className={`relative ${imagePanel ? "flex flex-col flex-1 px-5 py-6 sm:p-10 md:w-[45%] md:py-12 z-10" : ""}`}>
          {imagePanel && (
            <div className="pointer-events-none absolute -right-4 -top-4 -z-10 h-64 w-64 opacity-[0.06] sm:-right-12 sm:-top-12 sm:h-96 sm:w-96">
              <img src="/images/loginimagetrasperent.png" alt="" className="h-full w-full object-contain object-right-top" aria-hidden="true" />
            </div>
          )}
          {!imagePanel && (
            <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
              <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`absolute right-3 top-3 z-20 flex h-8 w-8 sm:h-9 sm:w-9 cursor-pointer items-center justify-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
              imagePanel 
                ? "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 sm:right-6 sm:top-6" 
                : "bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
          
          {!imagePanel && (
            <div className="mb-6 flex items-center gap-2">
              <BrandLogo
                className="gap-2"
                logoBoxClassName="h-10 w-10 rounded-xl shadow-sm"
                imageClassName="p-1"
                showText={false}
              />
            </div>
          )}
          
          <h2 id="auth-modal-title" className="pr-8 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {title}
          </h2>
          {subtitle && <p className="mt-2 text-sm text-slate-500 leading-relaxed font-medium">{subtitle}</p>}
          <div className="mt-5 sm:mt-8 flex-1">{children}</div>
        </div>
      </div>
    </div>
    </>,
    document.body,
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">{children}</label>;
}

export const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 sm:py-3 text-sm text-slate-900 outline-none transition-all hover:bg-slate-50 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 placeholder:text-slate-400";
