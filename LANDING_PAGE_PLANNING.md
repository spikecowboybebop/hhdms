# HHDMS Landing Page Implementation Blueprint (Design Only)

This blueprint serves as a definitive context and instruction set for generating the HHDMS Landing Page within our Turborepo workspace. The goal is to build a high-fidelity, component-driven UI utilizing Next.js (App Router, React 19) and Tailwind CSS inside `apps/web`. 

No authentication systems, backend hooks, or complex state engines are to be implemented during this phase. Focus entirely on pristine visual execution, semantic HTML, responsive flex/grid layouts, and text-based mockups.

---

## 1. Design System & Style Guide Tokens

When writing styles, use Tailwind CSS arbitrary properties or map them into the local theme config. Deliver a premium, authoritative, clinical look inspired by high-trust healthcare dashboards.

- **Primary Base Palette:**
  - Deep Clinical Navy (Main backgrounds, primary headers): `#0A2540`
  - Tech-Forward Teal (Primary CTAs, active highlights): `#00D4B2`
  - Dark Slate Gray (Body copy, subtitles): `#2D3A4A`
  - Soft Light Slate (Card containers, page alternating blocks): `#F8F9FA`
  - Warning/Alert Amber (Emergency labels, micro tags): `#FF9900`
- **Typography Matrix:**
  - Font Family: Clean, high-readability geometric sans-serif (e.g., `Geist Sans`, `Inter`, or `Plus Jakarta Sans`).
  - Headings: Bold tracking-tight (`tracking-tight font-bold text-[#0A2540]`).
- **Global Component Decoration:**
  - Borders: Sharp, ultra-subtle styling (`border border-slate-200/60`).
  - Corners: Clean, modern rounded curves (`rounded-2xl` or `rounded-xl`).
  - Shadows: Soft, modern ambient diffusion (`shadow-sm` elevating to `hover:shadow-md transition-all duration-300`).

---

## 2. Directory Architecture for Creation

All component nodes must live in the `apps/web` sub-workspace. Use modular, self-contained functional components:

apps/web/
├── app/
│   └── page.tsx                    # Core Landing Assembly Page
└── components/
└── landing/
├── navbar.tsx              # Brand header navigation
├── hero.tsx                # Context banner & quick trigger CTAs
├── telemetry-strip.tsx     # Real-time operational data ticker
├── bento-grid.tsx          # The Core 4 role gateway grid
├── workflow-steps.tsx      # "How It Works" step timeline
├── pricing-matrix.tsx      # Transparent pricing tier presentation
└── footer.tsx              # Institutional site footer

---

## 3. Step-by-Step Component Generation Prompts

> **Global Instruction for Copilot:** All components must use Tailwind CSS utility classes. If a component uses interactive states or transitions, include the `'use client';` directive at the very top of the file. For iconography, do not import external asset images; use custom inline SVG elements or basic geometric text shapes.

### Step 3.1: The Navigation Header (`components/landing/navbar.tsx`)
**Copilot Prompt:**
> Create a responsive, sticky React component for the `Navbar` inside `apps/web/components/landing/navbar.tsx`. Include the 'use client' directive if managing mobile menu states. It must contain a left-aligned brand slot "M MEDLY / HHDMS" using Deep Clinical Navy bold typography. The center layout should feature a desktop horizontal navigation menu with links for "Our Services", "Mission", "Providers", and "Contact Us" using soft text transitions on hover. The right alignment requires a styled structural "Sign In" CTA outline button (`border border-[#0A2540] text-[#0A2540] hover:bg-[#F8F9FA] px-5 py-2 rounded-full font-medium text-sm transition-all`). No routing logic is needed; use passive `href="#"` tags.

### Step 3.2: The Hero Section (`components/landing/hero.tsx`)
**Copilot Prompt:**
> Generate a split-column hero component inside `apps/web/components/landing/hero.tsx`. 
> - **Left Column:** Features a large, stacked typographic layout. Main title: "Telehealth Solution - Anytime, Anywhere" in `#0A2540` text size `text-5xl font-bold tracking-tight leading-none`. Underneath, place a descriptive paragraph: "A centralized digital ecosystem linking real-time medical dispatch, portable diagnostics, and remote clinical triage across Bangladesh." Below the copy, add a primary CTA button component labeled "Speak With Doctor →" using a solid background color of `#00D4B2` with white text. Include a soft star-rating badge container below the button indicating "4.7 Overall Rating" using a clean layout frame.
> - **Right Column:** Build a simulated visual graphic box representing a high-fidelity clinician video interface framework. Construct a container using CSS layers (`bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 relative aspect-video`). Inside this container, render a mockup text layout of an active teleconsultation window. Include an overlay bar showing a toolbar row containing text labels representing video, microphone, screen share, and an end-call element framework to accurately represent a real-time doctor interface.

### Step 3.3: Live Telemetry Strip (`components/landing/telemetry-strip.tsx`)
**Copilot Prompt:**
> Code an operational telemetry ticker component inside `apps/web/components/landing/telemetry-strip.tsx`. The design must be a full-width horizontal banner using a `#0A2540` deep navy background with crisp white and teal text. Divide the layout into four equal columns showing real-time system metrics using a clean monospace typography layer for the numbers:
> 1. "Average Dispatch Tracking Precision" -> "≤ 10 Meters" (Highlight "10 Meters" in `#00D4B2`)
> 2. "Active Emergency Triage Dispatch" -> "Live Core Active"
> 3. "Clinicians En-Route / On-Duty" -> "84 Verified"
> 4. "Average Gateway Triage Queue" -> "< 15 Mins"
> Ensure it is visually clean, low-profile, and communicates structural technical infrastructure capability.

### Step 3.4: The Core 4 Bento Feature Grid (`components/landing/bento-grid.tsx`)
**Copilot Prompt:**
> Create a comprehensive Bento Grid layout representing the entry gates for our four target user roles inside `apps/web/components/landing/bento-grid.tsx`. Use a 4-card asymmetric layout matrix (`grid grid-cols-1 md:grid-cols-3 gap-6`). Each block should represent a role using specific text-based mockup visual structures:
> 1. **Call Center Agent Block (Large - Span 2 Columns):** Card titled "Call Intake & Routing Hub". Include a text-based mockup representing a rolling log table with columns for `Ticket ID`, `Incoming Phone Stream`, and `Urgency Tier` (e.g., `TKT-2026-00421`, `EMERGENCY` marked in amber).
> 2. **MBBS Doctor Block (Span 1 Column):** Card titled "Clinical Triage Gateway". Render a text-based layout simulating a rapid patient file entry box with rows for recording patient vitals (Blood Pressure, Heart Rate, SpO2) alongside a mock text lookup field labeled "ICD-10 Diagnostic Catalog".
> 3. **Specialist Doctor Block (Span 1 Column):** Card titled "Diagnostic Workspace Console". Create a styled component box that simulates a dark-themed medical image analyzer. Render text blocks mimicking image metadata parameters (EXIF headers, DICOM tags, and an active view toggle labeled "Ultrasound/X-Ray Layer").
> 4. **Nutritionist Block (Span 2 Columns):** Card titled "Metabolic & Diet Optimization Engine". Draw a clean layout tracking nutritional metrics using simple text progress blocks representing total carbohydrate, protein, and fat allocations tailored to common Bangladeshi food composition datasets.
> Every bento card must possess a white background, slate-200 borders, precise micro-copy descriptions, and a hover transform effect (`hover:-translate-y-1 transition-all duration-300`).

### Step 3.5: Workflow Timeline & Pricing (`components/landing/workflow-steps.tsx` & `pricing-matrix.tsx`)
**Copilot Prompt:**
> Generate the transactional operational workflow timeline section and a pricing card matrix:
> - **Workflow Steps Component:** Create a multi-step vertical or horizontal timeline block showing how a service ticket moves from "1. Phone Call Intake" -> "2. Automated Dispatch & Verification" -> "3. Geofenced Care Delivery" -> "4. Immutable Diagnostic Record Archival". Use clean typography lines and circular numbering badges.
> - **Pricing Matrix Component:** Build three side-by-side pricing product cards ("Basic Care", "Plus Care", "Premium Family"). Each card should display an itemized list of mockup bulleted details (e.g., "Home consultations per month", "Prescription delivery support", "24/7 medical chat access") using a clear pricing header layout with call-to-action buttons styled to match the site's design guidelines.

### Step 3.6: Footer (`components/landing/footer.tsx`)
**Copilot Prompt:**
> Implement a minimal corporate site footer inside `apps/web/components/landing/footer.tsx`. Use a soft, alternating light background (`bg-[#F8F9FA] text-[#2D3A4A]`). Arrange it into links for regulatory frameworks, medical act compliance notifications, and corporate data protection policies. Include a static string timestamp line: "Copyright © 2026 HHDMS Ecosystem. Secure Data Tier Enforcement Guaranteed."s

---

## 4. Final Layout Composition Assembly

**Copilot Prompt:**
> Open `apps/web/app/page.tsx`. Clean out all default boilerplate styling. Import the newly created modular landing components from `@/components/landing/`. Assemble them into a clean semantic sequence inside a main wrapper: `<Navbar />`, `<Hero />`, `<TelemetryStrip />`, `<BentoGrid />`, `<WorkflowSteps />`, `<PricingMatrix />`, and `<Footer />`. Enforce clean wrapper padding constraints (`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12`) to match the grid boundaries exactly as specified in the HHDMS blueprint design rules. Ensure the entire layout builds correctly with zero TypeScript compilation warnings.