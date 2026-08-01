# HHDMS — Full System Flowchart

> Generated from SRS document (`Home Healthcare System.docx.pdf`).
> All 15 modules, all actors, end-to-end data flow.
> Rendered with [Mermaid](https://mermaid.js.org/).

---

## 1. High-Level System Context

```mermaid
graph TB
    subgraph Actors
        P[Patient / Guardian]
        CA[Call Center Agent]
        MB[MBBS Doctor]
        SP[Specialist Doctor]
        NS[Nurse]
        CG[Caregiver]
        NU[Nutritionist]
        SO[Sonologist]
        XR[X-Ray Technician]
        AD[System Admin]
    end

    subgraph HHDMS["HHDMS Platform"]
        direction TB
        WEB[Web Dashboard<br/>Next.js 16]
        API[REST API<br/>NestJS 11]
        DB[(PostgreSQL<br/>Prisma ORM)]
        FCM[FCM Push<br/>Notifications]
        SMS[SMS Gateway<br/>SSL Wireless/Twilio]
        WA[WhatsApp<br/>Business API]
        SOCK[Socket.IO<br/>Real-Time]
        WRT[Agora RTC<br/>Voice/Video]
        DICOM[DICOM Viewer<br/>Orthanc]
        GPS[GPS Tracking<br/>Google Maps API]
        PAY[Payment Gateway<br/>SSLCommerz/bKash]
        STORE[Cloud Storage<br/>S3 / R2]
    end

    subgraph Mobile["Android App"]
        PATAPP[Patient App<br/>Jetpack Compose]
    end

    P -->|Books service| CA
    P -->|Receives care| MB & SP & NS & CG & NU & SO & XR
    P -->|Uses| PATAPP
    CA -->|Operates| WEB
    MB & SP & NS & CG & NU & SO & XR -->|Operates| WEB
    AD -->|Manages| WEB

    WEB -->|REST JSON| API
    PATAPP -->|REST JSON| API
    API -->|ORM| DB
    API -->|Push| FCM
    API -->|SMS| SMS
    API -->|WhatsApp| WA
    API -->|Real-time| SOCK
    API -->|Signaling| WRT
    API -->|Storage| STORE
    API -->|DICOM| DICOM
    API -->|Maps| GPS
    API -->|Payments| PAY

    FCM -->|Deliver| PATAPP
    SMS -->|Alert| P
    WA -->|Notify| P
    SOCK -->|Live updates| WEB
    WRT -->|Calls| PATAPP
    GPS -->|Track| PATAPP
```

---

## 2. End-to-End Patient Journey

```mermaid
flowchart TD
    START([Patient needs care]) --> REG[Register / Login]
    REG --> BOOK{Choose service type}

    BOOK -->|MBBS Doctor| MB_PATH[MBBS Clinical Path]
    BOOK -->|Specialist| SP_PATH[Referral / Specialist Path]
    BOOK -->|Nurse| NS_PATH[Nursing Care Path]
    BOOK -->|Caregiver| CG_PATH[Caregiver Support Path]
    BOOK -->|Nutritionist| NU_PATH[Nutritionist Path]
    BOOK -->|Sonologist| US_PATH[Diagnostic Imaging Path]
    BOOK -->|X-Ray| XR_PATH[X-Ray Path]

    MB_PATH & SP_PATH & NS_PATH & CG_PATH & NU_PATH & US_PATH & XR_PATH --> CC_INT[Call Center Intake]
    CC_INT --> CC_REG{Patient exists?}
    CC_REG -->|No| CC_CREATE[Create patient record<br/>MRN, demographics, GPS address]
    CC_REG -->|Yes| CC_VERIFY[Verify & update info]
    CC_CREATE --> CC_SERVICE[Select service type + urgency]
    CC_VERIFY --> CC_SERVICE
    CC_SERVICE --> CC_MATCH[Match provider<br/>Geo-proximity + availability + fee calc]
    CC_MATCH --> CC_BOOK[Book appointment<br/>Create service ticket + session]
    CC_BOOK --> NOTIFY_PROV[Notify provider<br/>Push / SMS / WhatsApp]
    NOTIFY_PROV --> NOTIFY_PAT[Notify patient<br/>Confirmation + ETA]

    NOTIFY_PAT --> SERVICE_DELIVER{Service delivery}
    SERVICE_DELIVER -->|Home visit| GPS_DISPATCH[GPS dispatch<br/>Provider en route]
    SERVICE_DELIVER -->|Teleconsultation| TELECON[Video/audio call]
    GPS_DISPATCH --> PROVIDER_ARRIVE[Provider arrives<br/>GPS check-in]
    PROVIDER_ARRIVE --> CONSENT[Patient consent obtained]
    CONSENT --> CLINICAL_WORK[Clinical work performed]
    TELECON --> CLINICAL_WORK

    CLINICAL_WORK --> CLOSE[Appointment completed<br/>GPS check-out]
    CLOSE --> FOLLOW_UP{Follow-up needed?}
    FOLLOW_UP -->|Yes| SCHEDULE_FU[Schedule follow-up<br/>Auto-reminders]
    FOLLOW_UP -->|No| BILL[Generate invoice]
    SCHEDULE_FU --> BILL
    BILL --> PAYMENT[Process payment<br/>bKash/Nagad/card/cash]
    PAYMENT --> REVIEW[Patient rating + feedback]
    REVIEW --> END([Care episode complete])
```

---

## 3. Call Center Module (CC) — Detailed Flow

```mermaid
flowchart TD
    INCOMING([Incoming call / web request]) --> CC_DASH[Call Center Dashboard]
    CC_DASH --> CC_IDENTIFY{Identify caller}
    CC_IDENTIFY -->|Phone match| CC_PULL[Pull patient record]
    CC_IDENTIFY -->|New caller| CC_REGISTER[Register patient<br/>Name, phone, address, NID, emergency contact]
    CC_PULL --> CC_NEED{Assess need}
    CC_REGISTER --> CC_NEED

    CC_NEED --> CC_TRIAGE[Quick triage questionnaire]
    CC_TRIAGE --> CC_SERVICES{Select service(s)}
    CC_SERVICES -->|Medical| CC_MBBS[MBBS Doctor]
    CC_SERVICES -->|Specialist| CC_SP[Specialist<br/>Pick from 11 categories]
    CC_SERVICES -->|Nursing| CC_NS[Adult / Pediatric Nurse]
    CC_SERVICES -->|Caregiver| CC_CG[Caregiver<br/>Male/Female/Child + duration]
    CC_SERVICES -->|Diet| CC_NU[Nutritionist]
    CC_SERVICES -->|Imaging| CC_US[Sonologist]
    CC_SERVICES -->|X-Ray| CC_XR[X-Ray Technician]
    CC_SERVICES -->|Multiple| CC_MULTI[Multi-service bundle]

    CC_MBBS & CC_SP & CC_NS & CC_CG & CC_NU & CC_US & CC_XR & CC_MULTI --> CC_CHECK[Check availability<br/>Geo-filter + calendar]
    CC_CHECK --> CC_AVAIL{Available?}
    CC_AVAIL -->|Yes| CC_FEE[Display fee estimate]
    CC_AVAIL -->|No| CC_ALT[Suggest alternatives<br/>Different time / provider]
    CC_FEE --> CC_CONFIRM[Confirm booking<br/>Create service_ticket + booking_session]
    CC_CONFIRM --> CC_ASSIGN[Auto-assign provider<br/>Least-loaded + geo-proximity]
    CC_ASSIGN --> CC_NOTIFY[Notify all parties<br/>SMS + WhatsApp + Push]
    CC_NOTIFY --> CC_TICKET[Open ticket in queue]
    CC_TICKET --> CC_TRACK[Track via dashboard<br/>Live status updates]
```

---

## 4. MBBS Doctor Module (MB) — Clinical Workflow

```mermaid
flowchart TD
    MB_START([MBBS Doctor logs in]) --> MB_DASH[MBBS Dashboard<br/>Triage queue + assigned patients]
    MB_DASH --> MB_SELECT[Select patient from list]
    MB_SELECT --> MB_VISIT{Visit state}
    MB_VISIT -->|Not visited| MB_START_VISIT[Click 'Visit Patient']
    MB_START_VISIT --> MB_ARRIVING[State: arriving<br/>FCM push to patient]
    MB_ARRIVING --> MB_TRACK[Patient tracks doctor arrival<br/>60s ETA animation]
    MB_TRACK --> MB_ARRIVED[State: arrived<br/>Patient confirms arrival]

    MB_VISIT -->|Arrived| MB_CONSENT{Consent state}
    MB_CONSENT -->|Not asked| MB_ASK_CONSENT[Ask for consent<br/>FCM push to patient]
    MB_ASK_CONSENT --> MB_PATIENT_DECIDE{Patient decides}
    MB_PATIENT_DECIDE -->|Granted| MB_CLINICAL[Clinical workspace unlocked]
    MB_PATIENT_DECIDE -->|Denied| MB_RETRY[Show 'Ask Again' button]

    MB_CONSENT -->|Granted| MB_CLINICAL
    MB_CLINICAL --> MB_ACTIONS{Clinical actions}

    MB_ACTIONS --> MB_VITALS[Record vital signs<br/>BP, pulse, temp, SpO2, glucose]
    MB_ACTIONS --> MB_HISTORY[Full medical history<br/>Chronic conditions, allergies, meds]
    MB_ACTIONS --> MB_EXAM[Physical exam notes]
    MB_ACTIONS --> MB_DIAGNOSIS[Diagnosis<br/>ICD-10 search + selection]
    MB_ACTIONS --> MB_PRESCRIPTION[Prescription<br/>Drug DB + dosage + instructions<br/>Digital signature]
    MB_ACTIONS --> MB_TEST_ORDER[Test orders<br/>Lab/diagnostics]
    MB_ACTIONS --> MB_REFERRAL[Referral to specialist<br/>Select from 11 categories + urgency]
    MB_ACTIONS --> MB_EMERGENCY[Emergency flag<br/>Priority dispatch]
    MB_ACTIONS --> MB_DOCUMENT[Document upload<br/>Photos, records]

    MB_VITALS & MB_HISTORY & MB_EXAM & MB_DIAGNOSIS & MB_PRESCRIPTION & MB_TEST_ORDER & MB_REFERRAL & MB_DOCUMENT --> MB_COMPLETE[Complete consultation]

    MB_COMPLETE --> MB_FOLLOW_UP{Follow-up?}
    MB_FOLLOW_UP -->|Yes| MB_SCHEDULE_FU[Schedule follow-up<br/>Auto-reminder 24h + 1h]
    MB_FOLLOW_UP -->|No| MB_SIGN[Digital sign-off]
    MB_SCHEDULE_FU --> MB_SIGN
    MB_SIGN --> MB_CONSENT_REQUIRED[Patient consent flag]
    MB_CONSENT_REQUIRED --> MB_DONE([Visit complete])
```

---

## 5. Referral & Specialist Module (SP) — Chain Flow

```mermaid
flowchart TD
    REF_START([MBBS refers to specialist]) --> REF_CREATE[Create specialist_referrals record<br/>Specialty code + reason + urgency]
    REF_CREATE --> REF_CHAIN[Log to referral_chain timeline]
    REF_CHAIN --> REF_NOTIFY{Notify specialist}
    REF_NOTIFY -->|Push| REF_PUSH[FCM to specialist topic]
    REF_NOTIFY -->|SMS| REF_SMS[SMS alert]
    REF_NOTIFY -->|WhatsApp| REF_WA[WhatsApp message]

    REF_PUSH & REF_SMS & REF_WA --> REF_LOGIN([Specialist logs in])
    REF_LOGIN --> REF_DASH[Specialist Dashboard<br/>View incoming referrals]
    REF_DASH --> REF_SELECT[Select referral]

    REF_SELECT --> REF_REVIEW[Review full referral chain]
    REF_REVIEW --> REF_TIMELINE[Chronological timeline:<br/>Call Center intake → MBBS assessment + vitals → Lab results → Imaging]
    REF_REVIEW --> REF_HISTORY[Patient history:<br/>Conditions, meds, allergies, past consultations]
    REF_REVIEW --> REF_IMAGING[DICOM imaging viewer]
    REF_IMAGING --> REF_ANNOTATE[Annotate images<br/>Arrows, measurements, labels]

    REF_ANNOTATE --> REF_CLINICAL{Clinical actions}
    REF_CLINICAL --> REF_DIAGNOSIS[Diagnosis & Plan<br/>ICD-10 + treatment plan]
    REF_CLINICAL --> REF_PRESCRIPTION[Specialist prescription<br/>Drug interaction check]
    REF_CLINICAL --> REF_REPORT[Generate consultation report]
    REF_REPORT --> REF_PDF[PDF generation<br/>Summary, findings, diagnosis, plan]
    REF_CLINICAL --> REF_TEST_ORDER[Additional test requests]
    REF_CLINICAL --> REF_TEMPLATE[Use specialty template<br/>E.g. Cardiac Stress Protocol]

    REF_DIAGNOSIS & REF_PRESCRIPTION & REF_REPORT & REF_TEST_ORDER & REF_TEMPLATE --> REF_FOLLOW_UP{Follow-up?}
    REF_FOLLOW_UP -->|Yes| REF_SCHEDULE[Schedule follow-up<br/>+ auto-reminders 24h/1h]
    REF_FOLLOW_UP -->|No| REF_SIGN_OFF[Digital sign-off]

    REF_SCHEDULE --> REF_DELIVER[Deliver report to patient + MBBS<br/>SMS/WhatsApp PDF link]
    REF_SIGN_OFF --> REF_DELIVER
    REF_DELIVER --> REF_DONE([Referral complete])
```

---

## 6. Nurse Module (NS) — Clinical Workflow

```mermaid
flowchart TD
    NS_START([Nurse logs in]) --> NS_DASH[Nurse Dashboard<br/>Assigned patients + schedule]
    NS_DASH --> NS_SELECT[Select patient]
    NS_SELECT --> NS_DISPATCH[GPS dispatch to patient location]
    NS_DISPATCH --> NS_CHECK_IN[GPS check-in at location]
    NS_CHECK_IN --> NS_CONSENT[Patient consent]
    NS_CONSENT --> NS_CARE{Type of care}

    NS_CARE -->|Adult| NS_ADULT[Adult nursing procedures]
    NS_CARE -->|Pediatric| NS_PED[Pediatric nursing procedures<br/>Neonates/infants]

    NS_ADULT & NS_PED --> NS_VITALS[Record vital signs]
    NS_VITALS --> NS_WOUND[Wound care<br/>Assessment + dressing + photo]
    NS_WOUND --> NS_MED[Medication administration<br/>Type, dose, route, time]
    NS_MED --> NS_INVENTORY[Supply usage logging<br/>Track consumables used]
    NS_INVENTORY --> NS_NOTE[Clinical progress notes]

    NS_NOTE --> NS_ESCALATE{Escalate?}
    NS_ESCALATE -->|Yes| NS_CONSULT[Request consultation<br/>MBBS or Specialist]
    NS_ESCALATE -->|No| NS_COMPLETE[Complete visit]

    NS_CONSULT --> NS_COMPLETE
    NS_COMPLETE --> NS_CHECK_OUT[GPS check-out]
    NS_CHECK_OUT --> NS_REPORT[Generate nursing report]
    NS_REPORT --> NS_DONE([Nursing visit complete])
```

---

## 7. Caregiver Module (CG) — Support Workflow

```mermaid
flowchart TD
    CG_START([Caregiver logs in]) --> CG_DASH[Caregiver Dashboard<br/>Assigned shifts]
    CG_DASH --> CG_SELECT[Select shift]
    CG_SELECT --> CG_CHECK_IN[GPS check-in at patient home]
    CG_CHECK_IN --> CG_CARE{Type of care}

    CG_CARE -->|Day Care 8h| CG_DAY[Day care activities<br/>Meal prep, hygiene, mobility]
    CG_CARE -->|Night Care 8h| CG_NIGHT[Night care<br/>Bedtime routine, monitoring]
    CG_CARE -->|24-Hour Care| CG_24H[Full-day support<br/>All ADLs]
    CG_CARE -->|Respite Care| CG_RES[Respite<br/>Temporary relief for family]

    CG_DAY & CG_NIGHT & CG_24H & CG_RES --> CG_ACTIVITY[Log activities throughout shift]
    CG_ACTIVITY --> CG_DAILY[Daily activity report<br/>Meals, meds, mood, mobility]
    CG_DAILY --> CG_SOS{SOS / Emergency?}
    CG_SOS -->|Yes| CG_EMERGENCY[Emergency alert<br/>Notify call center + family]
    CG_SOS -->|No| CG_CHECK_OUT[GPS check-out]
    CG_EMERGENCY --> CG_CHECK_OUT
    CG_CHECK_OUT --> CG_REPORT[Generate care report]
    CG_REPORT --> CG_DONE([Shift complete])
```

---

## 8. Nutritionist Module (NU) — Diet Planning Workflow

```mermaid
flowchart TD
    NU_START([Nutritionist logs in]) --> NU_DASH[Nutritionist Dashboard<br/>Appointments + patients]
    NU_DASH --> NU_SELECT[Select patient]
    NU_SELECT --> NU_REVIEW[Review medical context]
    NU_REVIEW --> NU_CONTEXT[Display:<br/>Conditions + medications + labs + specialist notes]
    NU_CONTEXT --> NU_ANTHRO[Record anthropometrics]
    NU_ANTHRO --> NU_CALC[Auto-calculate:<br/>BMI, category, IBW, BMR, caloric needs]

    NU_CALC --> NU_TEMPLATE{Pick template}
    NU_TEMPLATE -->|Diabetes| NU_DM[Diabetes Type 1/2]
    NU_TEMPLATE -->|CKD| NU_CKD[CKD Stage 3-5]
    NU_TEMPLATE -->|Heart| NU_HT[Heart Disease / DASH]
    NU_TEMPLATE -->|Obesity| NU_OB[Weight Loss]
    NU_TEMPLATE -->|Malnutrition| NU_MAL[Recovery]
    NU_TEMPLATE -->|Post-surgical| NU_POST[Post-Surgical]
    NU_TEMPLATE -->|Cancer| NU_ONC[Oncology Support]
    NU_TEMPLATE -->|Pediatric| NU_PED[Pediatric Malnutrition]
    NU_TEMPLATE -->|Custom| NU_CUSTOM[Start from scratch]

    NU_DM & NU_CKD & NU_HT & NU_OB & NU_MAL & NU_POST & NU_ONC & NU_PED & NU_CUSTOM --> NU_DIET[Build diet chart]
    NU_DIET --> NU_MEALS[Define meals:<br/>Breakfast → Mid-Morning → Lunch → Afternoon → Dinner → Bedtime]
    NU_MEALS --> NU_FOODS[Select foods + quantities<br/>Bangladeshi food DB with nutritional data]
    NU_FOODS --> NU_NUTRIENTS[Live nutrient calculation<br/>Calories, protein, carbs, fat, fiber]
    NU_NUTRIENTS --> NU_PDF[Generate bilingual PDF<br/>Bengali + English]
    NU_PDF --> NU_DELIVER[Deliver diet plan<br/>SMS/WhatsApp + patient portal]

    NU_DELIVER --> NU_FOLLOW_UP[Schedule follow-up<br/>2 weeks / 1 month / 3 months]
    NU_FOLLOW_UP --> NU_ADHERENCE[At follow-up:<br/>Record adherence score + challenges + modifications]
    NU_ADHERENCE --> NU_TRACK[Track weight trend over time]
    NU_TRACK --> NU_EDUCATION[Share education materials<br/>Portion guides, label reading, handouts]
    NU_EDUCATION --> NU_REVISE[Revise diet plan as needed]
    NU_REVISE --> NU_DONE([Nutrition consultation complete])
```

---

## 9. Sonologist Module (US) — Imaging Workflow

```mermaid
flowchart TD
    US_START([Sonologist logs in]) --> US_DASH[Sonologist Dashboard<br/>Pending scans + schedule]
    US_DASH --> US_SELECT[Select patient / appointment]
    US_SELECT --> US_PREP[Review referral + reason for USG]
    US_PREP --> US_EQUIP{Select equipment}
    US_EQUIP -->|Portable USG| US_PORT[Portable machine<br/>USB/WiFi/Bluetooth DICOM export]
    US_EQUIP -->|Fixed USG| US_FIXED[Fixed machine]

    US_PORT & US_FIXED --> US_SCAN[Perform ultrasound]
    US_SCAN --> US_IMAGES[Capture images + loops<br/>DICOM format]
    US_IMAGES --> US_UPLOAD[Upload to cloud storage<br/>S3 / R2]
    US_UPLOAD --> US_MEASURE[Take measurements<br/>Structured report fields]
    US_MEASURE --> US_REPORT_GEN[Generate USG report]
    US_REPORT_GEN --> US_FINDINGS[Document findings + impression]
    US_FINDINGS --> US_SIGN[Digital signature]
    US_SIGN --> US_SHARE[Share with referring doctor<br/>Notify MBBS / Specialist]

    US_SHARE --> US_ANNOTATE[Referring doctor annotates images]
    US_ANNOTATE --> US_DONE([Imaging complete])
```

---

## 10. X-Ray Technician Module (XR) — Workflow

```mermaid
flowchart TD
    XR_START([X-Ray Technician logs in]) --> XR_DASH[X-Ray Dashboard<br/>Pending X-Ray requests]
    XR_DASH --> XR_SELECT[Select patient / requisition]
    XR_SELECT --> XR_PREP[Review clinical indication + body part]
    XR_PREP --> XR_RADIATION[Check radiation safety<br/>Certificate valid + dose log]
    XR_RADIATION --> XR_MACHINE{Select machine}
    XR_MACHINE -->|Portable CR/DR| XR_PORT[Portable X-Ray<br/>WiFi/USB from detector]
    XR_MACHINE -->|Fixed X-Ray| XR_FIXED[Fixed X-Ray]

    XR_PORT & XR_FIXED --> XR_CAPTURE[Capture X-Ray]
    XR_CAPTURE --> XR_PARAMS[Record technical params<br/>kVp, mAs, exposure time]
    XR_PARAMS --> XR_UPLOAD[Upload DICOM to cloud]
    XR_UPLOAD --> XR_QUALITY[Quality check<br/>Reject / accept images]
    XR_QUALITY -->|Reject| XR_RETAK[Retake X-Ray]
    XR_QUALITY -->|Accept| XR_REPORT[Generate X-Ray report]
    XR_REPORT --> XR_FINDINGS[Document findings + impression]
    XR_FINDINGS --> XR_SIGN[Technician sign-off]
    XR_SIGN --> XR_NOTIFY[Notify referring doctor<br/>Results available]

    XR_NOTIFY --> XR_INTERPRET[Radiologist / specialist interpretation]
    XR_INTERPRET --> XR_DONE([X-Ray complete])
```

---

## 11. Billing & Payments Module (BP) — Financial Flow

```mermaid
flowchart TD
    BP_START([Appointment completed]) --> BP_CALC[Calculate charges]
    BP_CALC --> BP_LINE_ITEMS[Line items:<br/>Consultation fee + diagnostics + supplies + travel]
    BP_LINE_ITEMS --> BP_DISCOUNT[Apply discounts / insurance]
    BP_DISCOUNT --> BP_INVOICE[Generate invoice]
    BP_INVOICE --> BP_PRESENT[Present invoice to patient]
    BP_PRESENT --> BP_METHOD{Payment method}

    BP_METHOD -->|bKash| BP_BKASH[bKash payment]
    BP_METHOD -->|Nagad| BP_NAGAD[Nagad payment]
    BP_METHOD -->|Card| BP_CARD[Card payment]
    BP_METHOD -->|Cash| BP_CASH[Cash payment]
    BP_METHOD -->|Insurance| BP_INSURANCE[Insurance claim]

    BP_BKASH & BP_NAGAD & BP_CARD --> BP_ONLINE[Online payment gateway<br/>IPN callback]
    BP_ONLINE --> BP_CONFIRM[Payment confirmed]
    BP_CASH --> BP_CASH_CONFIRM[Cash recorded]
    BP_INSURANCE --> BP_CLAIM[Submit insurance claim]
    BP_CLAIM --> BP_CLAIM_STATUS{Claim status}
    BP_CLAIM_STATUS -->|Approved| BP_CONFIRM
    BP_CLAIM_STATUS -->|Partial| BP_BALANCE[Collect balance]
    BP_CLAIM_STATUS -->|Denied| BP_BILL_PATIENT[Bill patient directly]
    BP_BALANCE & BP_BILL_PATIENT --> BP_CONFIRM

    BP_CONFIRM --> BP_RECEIPT[Generate receipt]
    BP_RECEIPT --> BP_PROV_PAY[Provider commission calculation]
    BP_PROV_PAY --> BP_REFUND{Refund?}
    BP_REFUND -->|Yes| BP_REFUND_PROC[Process refund<br/>Full / partial]
    BP_REFUND -->|No| BP_DONE([Payment complete])
```

---

## 12. Notification Engine (NT) — Multi-Channel Delivery

```mermaid
flowchart TD
    NT_EVENT([System event triggered]) --> NT_IDENTIFY{Event type}

    NT_IDENTIFY -->|Booking confirmed| NT_BOOKING[Booking Confirmation]
    NT_IDENTIFY -->|Provider assigned| NT_ASSIGN[Provider Assignment]
    NT_IDENTIFY -->|Provider coming| NT_COMING[Provider en route]
    NT_IDENTIFY -->|Consent request| NT_CONSENT[Consent Request]
    NT_IDENTIFY -->|Follow-up reminder| NT_REMINDER[Follow-up Reminder]
    NT_IDENTIFY -->|Report ready| NT_REPORT[Report / Result Ready]
    NT_IDENTIFY -->|Payment receipt| NT_PAYMENT[Payment Receipt]
    NT_IDENTIFY -->|Emergency alert| NT_EMERGENCY[Emergency Alert]
    NT_IDENTIFY -->|Diet plan| NT_DIET[Diet Plan Delivered]

    NT_BOOKING & NT_ASSIGN & NT_COMING & NT_CONSENT & NT_REMINDER & NT_REPORT & NT_PAYMENT & NT_EMERGENCY & NT_DIET --> NT_TEMPLATE[Load notification template<br/>Bilingual: Bengali + English]

    NT_TEMPLATE --> NT_CHANNELS{Delivery channels}
    NT_CHANNELS -->|Push| NT_FCM[Firebase Cloud Messaging<br/>To Android/iOS app]
    NT_CHANNELS -->|SMS| NT_SMS[SMS Gateway<br/>SSL Wireless / Twilio]
    NT_CHANNELS -->|WhatsApp| NT_WA[WhatsApp Business API<br/>Template messages]

    NT_FCM --> NT_FCM_CHECK{Token valid?}
    NT_FCM_CHECK -->|Yes| NT_FCM_DELIVER[Delivered]
    NT_FCM_CHECK -->|No| NT_FCM_CLEANUP[Remove invalid token + fallback to SMS]

    NT_SMS --> NT_SMS_CHECK{Delivery status}
    NT_SMS_CHECK -->|Success| NT_SMS_DELIVER[Delivered]
    NT_SMS_CHECK -->|Fail| NT_SMS_RETRY[Retry + fallback to push]

    NT_WA --> NT_WA_CHECK{Template approved?}
    NT_WA_CHECK -->|Yes| NT_WA_DELIVER[Delivered]
    NT_WA_CHECK -->|No| NT_WA_FALLBACK[Fallback to SMS]

    NT_FCM_DELIVER & NT_SMS_DELIVER & NT_WA_DELIVER --> NT_LOG[Log delivery status]
    NT_LOG --> NT_DONE([Notification complete])
```

---

## 13. GPS & Live Tracking Module (LT) — Location Flow

```mermaid
flowchart TD
    LT_START([Provider starts shift]) --> LT_REGISTER[Register GPS device<br/>Background location permission]
    LT_REGISTER --> LT_IDLE[Idle tracking<br/>Periodic location pings]

    LT_IDLE --> LT_DISPATCH{Appointment assigned}
    LT_DISPATCH -->|Yes| LT_ROUTE[Calculate optimal route<br/>Google Maps API + OSRM fallback]
    LT_ROUTE --> LT_ETA[Display ETA to patient + CC]
    LT_ETA --> LT_NAVIGATE[Provider navigates to patient]
    LT_NAVIGATE --> LT_GEOFENCE[Approaching geofence<br/>150m tolerance]
    LT_GEOFENCE --> LT_CHECK_IN[Auto check-in<br/>Patient notified]
    LT_CHECK_IN --> LT_SERVICE[Service delivery]
    LT_SERVICE --> LT_CHECK_OUT[Provider departs<br/>GPS check-out]
    LT_CHECK_OUT --> LT_LOG[Log to GPSLog table<br/>Lat/lon + timestamp + accuracy]
    LT_LOG --> LT_IDLE

    LT_NAVIGATE --> LT_DELAY{Delay detected?}
    LT_DELAY -->|Yes| LT_DELAY_NOTIFY[Notify patient + CC<br/>Updated ETA]
    LT_DELAY -->|No| LT_CONTINUE[Continue]

    LT_NAVIGATE --> LT_SOS{SOS button pressed}
    LT_SOS -->|Yes| LT_EMERGENCY[Emergency alert<br/>Dispatch nearest available provider]
    LT_EMERGENCY --> LT_IDLE
```

---

## 14. Scheduling & Dispatch Module (SD) — Calendar Flow

```mermaid
flowchart TD
    SD_START([Provider manages schedule]) --> SD_AVAIL[Set availability<br/>Regular hours + blocks]
    SD_AVAIL --> SD_CAL[Visual calendar view<br/>Desktop + mobile]
    SD_CAL --> SD_BOOK{New booking request}
    SD_BOOK -->|Check availability| SD_CHECK[Verify provider calendar<br/>Geo-area + time slot + service type]
    SD_CHECK --> SD_MATCH{Auto-assign?}
    SD_MATCH -->|Yes| SD_AUTO[Auto-assignment engine<br/>Least-loaded + proximity]
    SD_MATCH -->|No| SD_MANUAL[Manual dispatch by CC]
    SD_AUTO --> SD_CONFIRM[Confirm appointment]
    SD_MANUAL --> SD_CONFIRM

    SD_CONFIRM --> SD_REMINDER[Schedule reminders<br/>SMS/WhatsApp at 24h + 1h before]
    SD_CONFIRM --> SD_RECUR{Recurring?}
    SD_RECUR -->|Yes| SD_RECUR_SET[Set recurring pattern<br/>Weekly / biweekly / monthly]
    SD_RECUR -->|No| SD_ONCE[Single appointment]

    SD_RECUR_SET & SD_ONCE --> SD_RESCHEDULE{Cancel / reschedule?}
    SD_RESCHEDULE -->|Yes| SD_CANCEL[Cancel with fee policy]
    SD_RESCHEDULE -->|No| SD_DONE
    SD_CANCEL --> SD_REFUND[Process refund if applicable]
    SD_REFUND --> SD_RESLOT[Open slot for rebooking]
    SD_RESLOT --> SD_DONE([Scheduling complete])
```

---

## 15. Admin Module (AD) — Management Flow

```mermaid
flowchart TD
    AD_START([Admin logs in]) --> AD_DASH[Admin Dashboard<br/>System-wide overview]
    AD_DASH --> AD_SECTIONS{Admin sections}

    AD_SECTIONS --> AD_USERS[User Management<br/>Create, edit, disable users]
    AD_SECTIONS --> AD_ROLES[Role & Permission Assignment<br/>RBAC matrix]
    AD_SECTIONS --> AD_PROVIDERS[Provider Management<br/>Onboard, verify, suspend]
    AD_SECTIONS --> AD_BOOKINGS[Booking Oversight<br/>View all, override, reassign]
    AD_SECTIONS --> AD_PAYMENTS[Payment Monitoring<br/>Transactions, refunds, commissions]
    AD_SECTIONS --> AD_REPORTS[Reports & Analytics<br/>KPIs, utilization, financial]
    AD_SECTIONS --> AD_SYSTEM[System Configuration<br/>Global settings, fee rules, SMS config]
    AD_SECTIONS --> AD_AUDIT[Audit Logs<br/>All access + changes]

    AD_USERS & AD_ROLES & AD_PROVIDERS & AD_BOOKINGS & AD_PAYMENTS --> AD_LIVE[Live map view<br/>All active providers + patients]
    AD_LIVE --> AD_OVERRIDE{Override needed?}
    AD_OVERRIDE -->|Yes| AD_ACTION[Perform override<br/>Reassign provider, adjust fee, etc.]
    AD_OVERRIDE -->|No| AD_MONITOR[Monitor system]
    AD_ACTION --> AD_LOG[Logged to audit trail]
    AD_LOG --> AD_MONITOR
    AD_MONITOR --> AD_DONE([Admin session complete])
```

---

## 16. Data Flow Summary

```mermaid
flowchart LR
    subgraph INPUT["Input Sources"]
        PAT[Patient Action<br/>App / Call]
        PROV[Provider Action<br/>Web / App]
        ADMIN[Admin Action<br/>Web]
        SYS[System Event<br/>Cron / Trigger]
    end

    subgraph PROCESS["Processing Layer"]
        API[REST API<br/>NestJS]
        SOCK[Socket.IO<br/>Real-time]
        QUEUE[Message Queue<br/>Async tasks]
    end

    subgraph STORE["Storage Layer"]
        DB[(PostgreSQL<br/>Prisma)]
        FILES[Cloud Storage<br/>S3 / R2]
        CACHE[(Redis<br/>Cache)]
    end

    subgraph OUTPUT["Output Channels"]
        WEB[Web Dashboard<br/>Next.js]
        MOBILE[Android App<br/>Compose]
        SMS[SMS Gateway]
        WA[WhatsApp API]
        EMAIL[Email Service]
        FCM[FCM Push]
    end

    INPUT -->|HTTP REST| API
    INPUT -->|WebSocket| SOCK

    API -->|Read/Write| DB
    API -->|Upload| FILES
    API -->|Cache| CACHE
    API -->|Enqueue| QUEUE

    SOCK -->|Live push| WEB
    QUEUE -->|Process| API

    API -->|JSON Response| WEB
    API -->|JSON Response| MOBILE
    API -->|Trigger| FCM
    API -->|Trigger| SMS
    API -->|Trigger| WA
    API -->|Trigger| EMAIL
    API -->|Serve static| FILES
```

---

## 17. Module Dependency Graph

```mermaid
flowchart TD
    US[User System<br/>Auth + Roles] --> ALL[All Modules]

    CC[Call Center] --> MB[MBBS Doctor]
    CC --> NS[Nurse]
    CC --> CG[Caregiver]
    CC --> SP[Specialist]
    CC --> NU[Nutritionist]
    CC --> US[Sonologist]
    CC --> XR[X-Ray]

    MB --> SP
    MB --> US
    MB --> XR

    NS --> MB
    NS --> SP

    US --> SP
    XR --> SP

    ALL --> BILL[Billing & Payments]
    ALL --> NOTIF[Notifications]
    ALL --> SCHED[Scheduling & Dispatch]

    SCHED --> GPS[GPS Tracking]
    NOTIF --> SMS[SMS Gateway]
    NOTIF --> WA[WhatsApp API]
    NOTIF --> FCM[FCM Push]

    BILL --> PAY[Payment Gateway]

    ALL --> ADMIN[Admin Panel]
    ADMIN --> REP[Reporting & Analytics]
    ADMIN --> AUDIT[Audit Logs]
    ADMIN --> SEC[Security / MFA]
```

---

## 18. Screen / Route Map (Android + Web)

```mermaid
flowchart TD
    subgraph Android["Android App Screens"]
        LOGIN[Login / Signup]
        PAT_DASH[Patient Dashboard]
        BOOK[Booking Detail]
        APPT[Appointments]
        NOTIF[Notifications]
        MBBS_DASH[MBBS Dashboard]
        TRACK[Doctor Tracking]
        CONSENT[Consent Dialog]
    end

    subgraph Web["Web Dashboard Routes"]
        W_LOGIN[Login]
        CC_PAGE[Call Center]
        MBBS_PAGE[MBBS Doctor]
        SP_PAGE[Specialist]
        NS_PAGE[Nurse]
        CG_PAGE[Caregiver]
        NU_PAGE[Nutritionist]
        US_PAGE[Sonologist]
        XR_PAGE[X-Ray]
        ADMIN_PAGE[Admin]
    end

    LOGIN -->|Patient| PAT_DASH
    LOGIN -->|MBBS| MBBS_DASH
    LOGIN -->|All others| W_LOGIN

    PAT_DASH --> BOOK & APPT & NOTIF
    MBBS_DASH --> TRACK
    TRACK --> CONSENT

    W_LOGIN --> CC_PAGE & MBBS_PAGE & SP_PAGE & NS_PAGE & CG_PAGE & NU_PAGE & US_PAGE & XR_PAGE & ADMIN_PAGE
```

---

## Legend

| Symbol | Meaning |
|--------|---------|
| `([Text])` | Start / End point |
| `[Text]` | Process / Action |
| `{Text}` | Decision / Branch |
| `([External])` | External system |
| `>` | Data flow direction |
| `---` | Dependency (module graph) |
