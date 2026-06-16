const columns = [
  {
    title: "Regulatory",
    links: ["DGHS Compliance", "BMDC Registration", "Telemedicine Guidelines", "Audit Reports"],
  },
  {
    title: "Medical Act",
    links: ["Patient Rights Charter", "Informed Consent", "Emergency Protocols", "Code of Conduct"],
  },
  {
    title: "Data Protection",
    links: ["Privacy Policy", "Data Retention", "HIPAA Equivalence", "Breach Disclosures"],
  },
];

export function Footer() {
  return (
    <footer id="contact" className="bg-[#F8F9FA] text-[#2D3A4A]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0A2540] text-[#00D4B2] font-bold">
                M
              </span>
              <span className="text-base font-bold tracking-tight text-[#0A2540]">
                MEDLY <span className="text-slate-300">/</span> HHDMS
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              A centralized digital ecosystem for telehealth, dispatch, and clinical triage
              across Bangladesh.
            </p>
          </div>

          {columns.map((c) => (
            <div key={c.title} className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-[#0A2540]">
                {c.title}
              </h4>
              <ul className="flex flex-col gap-2 text-sm">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="transition-colors hover:text-[#0A2540]">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-slate-200/60 pt-6 text-xs sm:flex-row sm:items-center">
          <p className="font-mono">
            Copyright © 2026 HHDMS Ecosystem. Secure Data Tier Enforcement Guaranteed.
          </p>
          <p className="font-mono text-slate-500">v1.0.0 · build {`a3f9c1e`}</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
