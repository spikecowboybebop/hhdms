type Tier = {
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  featured?: boolean;
};

const tiers: Tier[] = [
  {
    name: "Essential Care",
    price: "৳1,490",
    cadence: "/ month",
    blurb: "Ideal for individuals seeking routine home healthcare access.",
    features: [
      "2 MBBS home consultations per month",
      "Digital prescription delivery",
      "24/7 call center access",
      "Secure health record vault",
    ],
  },
  {
    name: "Family Care",
    price: "৳3,290",
    cadence: "/ month",
    blurb: "Expanded coverage for families with chronic-condition management needs.",
    features: [
      "6 consultations per month (any service)",
      "Priority dispatch within 30 min",
      "Specialist teleconsultation referrals",
      "Nutritionist diet planning",
      "Up to 4 family members covered",
    ],
    featured: true,
  },
  {
    name: "Complete Care",
    price: "৳5,990",
    cadence: "/ month",
    blurb: "Comprehensive coverage for households requiring full diagnostic access.",
    features: [
      "Unlimited home consultations",
      "Portable USG & X-Ray diagnostics",
      "Dedicated family physician",
      "All specialist categories included",
      "Nursing & caregiver support",
      "Emergency priority dispatch",
    ],
  },
];

export function PricingMatrix() {
  return (
    <section id="providers" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-3 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#00D4B2]">
            Transparent Pricing
          </span>
          <h2 className="text-4xl font-bold tracking-tight text-[#0A2540] sm:text-5xl">
            Care Plans for Every Household
          </h2>
          <p className="mx-auto max-w-2xl text-base text-[#2D3A4A]">
            No hidden fees. Cancel anytime. All plans include the secure HHDMS data tier.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <article
              key={t.name}
              className={`flex flex-col gap-6 rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                t.featured
                  ? "border-[#00D4B2] bg-[#0A2540] text-white"
                  : "border-slate-200/60 bg-white text-[#0A2540]"
              }`}
            >
              {t.featured && (
                <span className="w-fit rounded-full bg-[#00D4B2] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#0A2540]">
                  Most Popular
                </span>
              )}
              <header className="flex flex-col gap-1">
                <h3
                  className={`text-lg font-bold tracking-tight ${
                    t.featured ? "text-white" : "text-[#0A2540]"
                  }`}
                >
                  {t.name}
                </h3>
                <p
                  className={`text-sm ${
                    t.featured ? "text-white/70" : "text-[#2D3A4A]"
                  }`}
                >
                  {t.blurb}
                </p>
              </header>

              <div className="flex items-baseline gap-1">
                <span
                  className={`text-4xl font-bold tracking-tight ${
                    t.featured ? "text-white" : "text-[#0A2540]"
                  }`}
                >
                  {t.price}
                </span>
                <span
                  className={`text-sm ${
                    t.featured ? "text-white/60" : "text-[#2D3A4A]"
                  }`}
                >
                  {t.cadence}
                </span>
              </div>

              <ul
                className={`flex flex-col gap-2 text-sm ${
                  t.featured ? "text-white/80" : "text-[#2D3A4A]"
                }`}
              >
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                        t.featured
                          ? "bg-[#00D4B2] text-[#0A2540]"
                          : "bg-[#00D4B2]/15 text-[#00D4B2]"
                      }`}
                    >
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="#"
                className={`mt-auto inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                  t.featured
                    ? "bg-[#00D4B2] text-[#0A2540] hover:shadow-md"
                    : "border border-[#0A2540] text-[#0A2540] hover:bg-[#F8F9FA]"
                }`}
              >
                Choose {t.name}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PricingMatrix;
