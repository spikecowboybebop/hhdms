export function BentoGrid() {
  return (
    <section id="services" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#00D4B2]">
            Role-Based Access
          </span>
          <h2 className="text-4xl font-bold tracking-tight text-[#0A2540] sm:text-5xl">
            Four Operational Gateways
          </h2>
          <p className="max-w-2xl text-base text-[#2D3A4A]">
            Purpose-built environments for every stakeholder in the HHDMS ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Call Center Agent — Span 2 */}
          <article className="group flex flex-col gap-5 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md md:col-span-2">
            <header className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#00D4B2]">
                  Role 01 · Call Center
                </p>
                <h3 className="mt-1 text-xl font-bold tracking-tight text-[#0A2540]">
                  Call Intake &amp; Routing Hub
                </h3>
              </div>
              <span className="rounded-full bg-[#F8F9FA] px-2.5 py-1 text-[10px] font-medium text-[#2D3A4A]">
                Active
              </span>
            </header>
            <p className="text-sm text-[#2D3A4A]">
              Real-time ticket queue with intelligent routing across verified clinicians.
            </p>
            <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-[#F8F9FA] font-mono text-xs">
              <div className="grid grid-cols-3 gap-2 border-b border-slate-200/60 bg-white px-3 py-2 font-semibold text-[#0A2540]">
                <span>Ticket ID</span>
                <span>Incoming Phone Stream</span>
                <span>Urgency Tier</span>
              </div>
              {[
                ["TKT-2026-00421", "+880 1712 •••• 42", "EMERGENCY"],
                ["TKT-2026-00420", "+880 1815 •••• 91", "ROUTINE"],
                ["TKT-2026-00419", "+880 1933 •••• 07", "URGENT"],
                ["TKT-2026-00418", "+880 1611 •••• 55", "ROUTINE"],
              ].map(([id, phone, tier]) => (
                <div key={id} className="grid grid-cols-3 gap-2 border-b border-slate-200/60 px-3 py-2 text-[#2D3A4A] last:border-b-0">
                  <span>{id}</span>
                  <span>{phone}</span>
                  <span
                    className={
                      tier === "EMERGENCY"
                        ? "font-semibold text-[#FF9900]"
                        : tier === "URGENT"
                          ? "font-semibold text-[#0A2540]"
                          : "text-[#2D3A4A]"
                    }
                  >
                    {tier}
                  </span>
                </div>
              ))}
            </div>
          </article>

          {/* MBBS Doctor — Span 1 */}
          <article className="group flex flex-col gap-5 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <header>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#00D4B2]">
                Role 02 · MBBS
              </p>
              <h3 className="mt-1 text-xl font-bold tracking-tight text-[#0A2540]">
                Clinical Triage Gateway
              </h3>
            </header>
            <p className="text-sm text-[#2D3A4A]">Rapid patient file entry with vitals capture.</p>
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200/60 bg-[#F8F9FA] p-3 font-mono text-xs text-[#2D3A4A]">
              {[
                ["Blood Pressure", "128 / 82 mmHg"],
                ["Heart Rate", "74 bpm"],
                ["SpO₂", "98 %"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-slate-200/60 pb-1.5 last:border-b-0 last:pb-0">
                  <span className="text-[#0A2540]">{k}</span>
                  <span className="font-semibold">{v}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white p-3">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                ICD-10 Diagnostic Catalog
              </label>
              <div className="mt-1 flex items-center justify-between rounded-md border border-slate-200/60 bg-[#F8F9FA] px-2 py-1.5 text-xs">
                <span className="text-[#2D3A4A]">J45.909 · Asthma, unspecified</span>
                <span className="text-[#00D4B2]">●</span>
              </div>
            </div>
          </article>

          {/* Specialist Doctor — Span 1 */}
          <article className="group flex flex-col gap-5 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <header>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#00D4B2]">
                Role 03 · Specialist
              </p>
              <h3 className="mt-1 text-xl font-bold tracking-tight text-[#0A2540]">
                Diagnostic Workspace Console
              </h3>
            </header>
            <div className="flex flex-col gap-2 rounded-xl bg-[#0A2540] p-3 font-mono text-[10px] text-white/80">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <span>EXIF</span>
                <span className="text-[#00D4B2]">parsed</span>
              </div>
              {[
                ["Modality", "DX"],
                ["Patient ID", "BD-2026-7720"],
                ["Study Date", "2026-06-14"],
                ["Body Part", "CHEST"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-white/60">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-lg border border-[#00D4B2] bg-[#00D4B2]/10 px-3 py-1.5 text-xs font-semibold text-[#00D4B2]"
              >
                Ultrasound
              </button>
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-[#F8F9FA] px-3 py-1.5 text-xs font-medium text-[#2D3A4A]"
              >
                X-Ray
              </button>
            </div>
            <p className="text-xs text-[#2D3A4A]">DICOM layer · 24 slices loaded</p>
          </article>

          {/* Nutritionist — Span 2 */}
          <article className="group flex flex-col gap-5 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md md:col-span-2">
            <header>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#00D4B2]">
                Role 04 · Nutrition
              </p>
              <h3 className="mt-1 text-xl font-bold tracking-tight text-[#0A2540]">
                Metabolic &amp; Diet Optimization Engine
              </h3>
            </header>
            <p className="text-sm text-[#2D3A4A]">
              Caloric and macronutrient allocation mapped to common Bangladeshi food composition datasets.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { name: "Carbohydrates", value: 52, color: "#00D4B2" },
                { name: "Protein", value: 28, color: "#0A2540" },
                { name: "Fats", value: 20, color: "#FF9900" },
              ].map((m) => (
                <div key={m.name} className="rounded-xl border border-slate-200/60 bg-[#F8F9FA] p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-[#0A2540]">{m.name}</span>
                    <span className="font-mono text-xs text-[#2D3A4A]">{m.value}%</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${m.value}%`, background: m.color }}
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-[#2D3A4A]">
                    {m.name === "Carbohydrates"
                      ? "Rice, lentils, root vegetables"
                      : m.name === "Protein"
                        ? "Hilsa, chicken, paneer"
                        : "Mustard oil, ghee, nuts"}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export default BentoGrid;
