import Image from "next/image";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200/60 bg-[#F8F9FA] px-3 py-1 text-xs font-medium text-[#2D3A4A]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00D4B2]" />
            Bangladesh&apos;s Centralized Telehealth Network
          </span>

          <h1 className="text-5xl font-bold tracking-tight leading-none text-[#0A2540] sm:text-6xl">
            Telehealth Solution
            <span className="block text-[#00D4B2]">Anytime, Anywhere</span>
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-[#2D3A4A]">
            A centralized digital ecosystem linking real-time medical dispatch, portable diagnostics,
            and remote clinical triage across Bangladesh.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-full bg-[#00D4B2] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
            >
              Speak With Doctor <span aria-hidden>→</span>
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 px-6 py-3 text-sm font-semibold text-[#0A2540] transition-all hover:bg-[#F8F9FA]"
            >
              How It Works
            </a>
          </div>

          <div className="mt-4 inline-flex w-fit items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-0.5 text-[#FF9900]" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l2.9 6.6L22 9.7l-5 4.9L18.2 22 12 18.3 5.8 22 7 14.6 2 9.7l7.1-1.1L12 2z" />
                </svg>
              ))}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-[#0A2540]">4.7 Overall Rating</span>
              <span className="text-xs text-[#2D3A4A]">Verified by 12,400+ patients</span>
            </div>
          </div>
        </div>

        {/* Right Column — Mock Clinician Video Interface */}
        <div className="relative">
        <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-[#00D4B2]/15 via-transparent to-[#0A2540]/10 blur-2xl" />
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
            {/* Added overflow-hidden and rounded-t-3xl here */}
            <div className="relative aspect-video w-full bg-gradient-to-br from-[#0A2540] to-[#1a3a5c] overflow-hidden rounded-t-3xl">
            <Image
                src="/doctor_consul.jpg"
                alt="Doctor consulting with a patient via an online telemedicine meeting"
                width={1280}
                height={720}
                className="w-full h-full object-cover aspect-video" // Removed rounded-t-3xl here
            />
            </div>
        </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
