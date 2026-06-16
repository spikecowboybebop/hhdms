const steps = [
  {
    n: "01",
    title: "Phone Call Intake",
    body: "Patient or family initiates service via verified hotline. Identity, location, and chief complaint captured.",
  },
  {
    n: "02",
    title: "Automated Dispatch & Verification",
    body: "Smart routing engine matches the nearest available clinician and dispatches with cryptographic identity proof.",
  },
  {
    n: "03",
    title: "Geofenced Care Delivery",
    body: "Clinician arrives on-site. Geofence unlock triggers portable diagnostic activation and live triage sync.",
  },
  {
    n: "04",
    title: "Immutable Diagnostic Record Archival",
    body: "Encounter data sealed to a tamper-evident audit ledger and synced to the patient's longitudinal health record.",
  },
];

export function WorkflowSteps() {
  return (
    <section id="mission" className="bg-[#F8F9FA] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#00D4B2]">
            Operational Pipeline
          </span>
          <h2 className="text-4xl font-bold tracking-tight text-[#0A2540] sm:text-5xl">
            How a Service Ticket Moves
          </h2>
        </div>

        <ol className="relative grid grid-cols-1 gap-6 md:grid-cols-4">
          {steps.map((s, i) => (
            <li
              key={s.n}
              className="relative flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm"
            >
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-1/2 top-12 hidden h-px w-12 -translate-y-1/2 bg-[#00D4B2] md:block"
                  style={{ left: "calc(50% + 24px)", width: "calc(100% - 48px)" }}
                />
              )}
              <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#00D4B2] bg-white font-mono text-sm font-bold text-[#0A2540]">
                {s.n}
              </div>
              <h3 className="text-lg font-bold tracking-tight text-[#0A2540]">{s.title}</h3>
              <p className="text-sm leading-relaxed text-[#2D3A4A]">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default WorkflowSteps;
