async function getSettings() {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
    const res = await fetch(`${apiBase}/public/site-settings`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as { maintenanceMessage: string | null; maintenanceEndsAt: string | null };
  } catch {
    return null;
  }
}

export default async function MaintenancePage() {
  const settings = await getSettings();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FFFBF9] px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/divyash-logo-everywhere.png" alt="Divyash Digital" className="h-14 w-auto" />
      <h1 className="mt-8 font-display text-3xl font-extrabold text-[#1C1410]">
        We'll be right back
      </h1>
      <p className="mt-3 max-w-md text-[#6E6660]">
        {settings?.maintenanceMessage ||
          "We're making some improvements behind the scenes. Please check back shortly."}
      </p>
      {settings?.maintenanceEndsAt && (
        <p className="mt-2 text-sm text-[#6E6660]">
          Expected back:{" "}
          {new Date(settings.maintenanceEndsAt).toLocaleString("en-IN", {
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
