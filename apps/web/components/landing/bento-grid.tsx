const services = [
  {
    icon: "🏥",
    title: "MBBS Doctor",
    subtitle: "First-Call Assessment",
    description:
      "Our general practitioners perform the initial patient assessment, record vitals, order diagnostic tests, and coordinate specialist referrals — the clinical gateway of the system.",
    features: [
      "Vital signs recording & flagging",
      "ICD-10 coded diagnosis",
      "Diagnostic test ordering",
      "Digital prescriptions",
    ],
  },
  {
    icon: "🫀",
    title: "Specialist Consultation",
    subtitle: "11 Specialty Categories",
    description:
      "Access specialists across Pulmonology, Cardiology, Neurology, Nephrology, Dermatology, ENT, General Surgery, Gynaecology, Internal Medicine, Pain Management, and Oncology.",
    features: [
      "Home visit or teleconsultation",
      "DICOM imaging annotation",
      "Specialty-specific templates",
      "Follow-up scheduling",
    ],
  },
  {
    icon: "👩‍⚕️",
    title: "Nursing Care",
    subtitle: "Adult & Pediatric",
    description:
      "Skilled nursing care at home — from vital monitoring and medication administration to IV therapy, wound care, and pediatric growth tracking against WHO standards.",
    features: [
      "Medication administration record",
      "IV fluid monitoring",
      "Wound care with photo documentation",
      "Pediatric growth & vaccination tracking",
    ],
  },
  {
    icon: "🥗",
    title: "Nutritionist",
    subtitle: "Diet Planning & Counselling",
    description:
      "Personalized diet plans based on medical conditions — diabetes, CKD, heart disease, obesity, and more — featuring Bangladeshi food composition data and bilingual PDF plans.",
    features: [
      "Anthropometric measurement & BMI",
      "Condition-specific templates",
      "Calorie & macronutrient calculation",
      "Bengali/English diet charts",
    ],
  },
  {
    icon: "🤝",
    title: "Caregiver Support",
    subtitle: "Day · Night · 24H · Respite",
    description:
      "Trained caregivers for daily living support — personal hygiene, mobility assistance, feeding, and companionship. Choose by gender, patient type, and care duration.",
    features: [
      "GPS-verified shift check-in/out",
      "Daily activity logging",
      "Condition change reporting",
      "Ratings & feedback system",
    ],
  },
  {
    icon: "🔬",
    title: "Portable Diagnostics",
    subtitle: "USG & X-Ray at Home",
    description:
      "Portable ultrasound and X-Ray services dispatched to your home with qualified sonologists and technicians. DICOM-compliant imaging with structured reporting.",
    features: [
      "USG: Abdomen, Pelvis, Obstetric, Thyroid, MSK, Echo",
      "X-Ray: Chest, Spine, Limbs, Skull",
      "DICOM image annotation",
      "Radiology report delivery",
    ],
  },
];

export function BentoGrid() {
  return (
    <section id="services" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-3 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#00D4B2]">
            Our Services
          </span>
          <h2 className="text-4xl font-bold tracking-tight text-[#0A2540] sm:text-5xl">
            Comprehensive Home Healthcare
          </h2>
          <p className="mx-auto max-w-2xl text-base text-[#2D3A4A]">
            From emergency first-call doctors to specialist consultations, nursing care, diagnostics,
            and daily caregiver support — we bring the full spectrum of healthcare to your home.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <article
              key={s.title}
              className="group flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <header className="flex items-start justify-between">
                <div>
                  <span className="text-2xl" aria-hidden>{s.icon}</span>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-[#00D4B2]">
                    {s.subtitle}
                  </p>
                  <h3 className="mt-1 text-lg font-bold tracking-tight text-[#0A2540]">
                    {s.title}
                  </h3>
                </div>
              </header>
              <p className="text-sm leading-relaxed text-[#2D3A4A]">{s.description}</p>
              <ul className="flex flex-col gap-1.5 text-sm text-[#2D3A4A]">
                {s.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#00D4B2]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default BentoGrid;
