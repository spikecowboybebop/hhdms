export function TelemetryStrip() {
  const items = [
    {
      label: "Service Categories",
      value: "6+",
      unit: "Specialized",
      highlight: true,
    },
    {
      label: "Specialist Fields",
      value: "11",
      unit: "Categories",
      highlight: false,
    },
    {
      label: "Patients Served",
      value: "12,400+",
      unit: "Nationwide",
      highlight: false,
    },
    {
      label: "Average Response",
      value: "< 30",
      unit: "Minutes",
      highlight: false,
    },
  ];

  return (
    <section className="w-full bg-[#0A2540] text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col gap-1 border-l border-white/10 pl-4 first:border-l-0 first:pl-0"
          >
            <span className="text-[10px] font-medium uppercase tracking-widest text-white/60">
              {item.label}
            </span>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span
                className={`text-2xl font-bold tracking-tight sm:text-3xl ${
                  item.highlight ? "text-[#00D4B2]" : "text-white"
                }`}
              >
                {item.value}
              </span>
              <span className="text-xs text-white/70">{item.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TelemetryStrip;
