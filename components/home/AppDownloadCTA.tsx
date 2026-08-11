export function AppDownloadCTA() {
  return (
    <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div
        className="flex flex-col items-center gap-6 overflow-hidden rounded-3xl p-8 text-center sm:p-12 lg:flex-row lg:items-center lg:justify-between lg:text-left"
        style={{
          background: "linear-gradient(120deg, #1c1530 0%, #2b1f3d 45%, #3a2a1a 100%)",
        }}
      >
        <div>
          <h3 className="text-2xl font-extrabold text-white sm:text-3xl">
            Carry the vibe in your pocket
          </h3>
          <p className="mt-2 max-w-md text-sm text-slate-300 sm:text-base">
            Get the app for faster booking, instant QR check-in and push alerts the moment a
            flash deal drops nearby.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <span className="cursor-pointer rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white">
            ▶ Google Play
          </span>
          <span className="cursor-pointer rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white">
            App Store
          </span>
        </div>
      </div>
    </section>
  );
}
