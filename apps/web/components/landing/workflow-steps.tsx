const steps = [
  {
    n: "01",
    title: "Call & Register",
    body: "Patient or guardian calls our service center. The agent captures identity, symptoms, and preferences, then registers the patient and books the required service.",
  },
  {
    n: "02",
    title: "Assign & Dispatch",
    body: "The system intelligently assigns the nearest available provider based on service type, location, and urgency. The provider receives instant notification.",
  },
  {
    n: "03",
    title: "Deliver Care",
    body: "Provider arrives at the patient's home. GPS-verified check-in, clinical assessment, diagnostics, and treatment are documented in real time.",
  },
  {
    n: "04",
    title: "Report & Follow-up",
    body: "Consultation reports, prescriptions, and invoices are delivered via SMS/WhatsApp. Follow-up appointments and reminders are scheduled automatically.",
  },
];

export function WorkflowSteps() {
  return (
    <section id="workflow" className="bg-[#F8F9FA] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-3 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#00D4B2]">
            How It Works
          </span>
          <h2 className="text-4xl font-bold tracking-tight text-[#0A2540] sm:text-5xl">
            From Call to Care in Four Steps
          </h2>
          <p className="mx-auto max-w-2xl text-base text-[#2D3A4A]">
            A unified workflow that ensures every patient receives timely, coordinated care —
            from the moment you call to post-visit follow-up.
          </p>
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
