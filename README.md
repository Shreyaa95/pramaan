# PRAMAAN (प्रमाण) — Certificate Generation and Automated Email Delivery Platform

> **प्रमाणपत्र निर्माण एवं वितरण मंच**  
> **Configuration-Driven • Collision-Safe • Deterministic Recipient Linkage**  
> Global Enterprise Design System (deep carbon surfaces, obsidian glass panels, crimson accents `#ca0019`, and crisp typography).

---

## 1. System Overview

**PRAMAAN (प्रमाण)** is a reusable certificate generation and automated email delivery platform built for administrators to issue personalized PDF certificates in bulk and dispatch them via **Nodemailer** with 100% deterministic recipient-attachment accuracy.

### Critical Architecture Rule: Zero Hard-Coding
PRAMAAN does **not** hardcode:
- Event or batch names (e.g. *IdeaJam 2026*, *BHU Tech 2026*, *Python Hackathon*, *Internship Cohorts*)
- Issuing organizations
- Recipient names or emails
- Certificate IDs or file names
- CSV/Excel column names or MongoDB collection names
- Email subjects, bodies, or sender addresses
- SMTP credentials

All configurations are driven by the admin dashboard, database records, and environment variables. The platform can be reused indefinitely across distinct events without changing any source code.

---

## 2. Core Product Features

### 🎨 Visual Template Studio & Canvas Placement
- **Background Upload:** Supports pre-designed PNG, JPG, and PDF background templates (exported from Figma, Canva, Photoshop).
- **Dynamic Fields:** Drag and position any dynamic field pins across the certificate canvas:
  - `Recipient Name`
  - `Event Name`
  - `Certificate ID`
  - `Issue Date`
  - `Issuing Organization`
  - `Achievement Role / Track`
  - Custom dynamic attributes (e.g., *College, Grade, Verification Link*)
- **Typography Controls:** Fine-tune font family (*Helvetica/Sans*, *Times/Serif*, *Courier/Mono*), font size, weight (*bold, italic*), alignment (*left, center, right*), and text color with real-time live preview.
- **On-the-Fly Test PDF Generation:** Instant download/preview of test PDF directly from the visual studio.

### 📊 Flexible Data Sources & Dynamic Column Mapping
- **Excel & CSV Import:** Supports `.xlsx`, `.xls`, and `.csv`. Auto-detects headers and provides dynamic dropdown column mapping:
  - `Source Column -> Recipient Name`
  - `Source Column -> Recipient Email`
  - `Source Column -> Recipient ID`
  - `Source Column -> Extra Metadata`
- **Authorized MongoDB Data Source:**
  - Secure connection string testing without leaking credentials to client or logs.
  - Live collection browsing and schema discovery from sample documents.
  - Projects only mapped recipient fields to protect external data security.
- **Data Validation & Duplicate Safety:**
  - Validates email formats.
  - Automatically identifies duplicate email records.
  - Flags and rejects invalid rows prior to bulk generation.

### 🛡️ Critical: Exact Recipient-to-Email Deterministic Mapping
- The system **never** associates email by searching person name strings.
- Exact linkage chain is strictly enforced:  
  `Recipient Record -> Unique Recipient ID -> Name + Email -> Personalized Certificate PDF -> Delivery Audit Record`
- **Duplicate Names Supported:** Two distinct participants with identical names (e.g., *Rahul Kumar #1* and *Rahul Kumar #2*) are guaranteed separate collision-safe certificate IDs and separate PDF attachments. Cross-delivery errors are structurally impossible.

### 📄 Personalized Vector PDF Generation
- High-resolution vector PDF rendering with exact coordinate placement.
- Unique, collision-safe IDs (e.g., `IJ26-2026-0001`, `BHU26-2026-0001`).
- Dynamic sanitized file naming: `CERT-2026-0001_Rahul-Kumar.pdf`.

### ✉️ Nodemailer Email Delivery & Retry Workflow
- **Customizable Email Templates:** Rich HTML & plain-text templates with dynamic placeholder variables (`{{recipientName}}`, `{{eventName}}`, `{{organizationName}}`, `{{certificateId}}`).
- **Nodemailer SMTP Layer:** Secure SMTP configuration (Host, Port, SSL/TLS, User, Password, Sender Name, Sender Email) configurable via UI or environment variables.
- **Test Mode Fallback:** Automatically generates Ethereal test SMTP accounts if custom SMTP is unconfigured, complete with live email preview URLs.
- **Delivery Audit & Status Tracking:**
  - Live tracking of `Sent`, `Pending`, and `Failed` states.
  - Debugging error logs captured for each failed attempt.
  - **One-Click Retry:** Safely retries failed deliveries using the exact existing certificate without generating duplicates.

---

## 3. Quick Start & Execution

### Prerequisites
- Node.js v18+ (tested on Node.js v24)
- npm v9+

### Running the Application

1. **Start the PRAMAAN Platform:**
   ```powershell
   npm start
   ```
   *The server initializes the database, loads default admin credentials, seeds starter templates, and serves both the API and the React frontend on `http://localhost:5000`.*

2. **Open in Browser:**
   ```
   http://localhost:5000
   ```

3. **Default Admin Login:**
   - **Email:** `admin@smartcert.io`
   - **Password:** `admin123`

---

## 4. End-to-End Workflow Walkthrough

1. **Log in** to the PRAMAAN Console.
2. Navigate to **Batch Wizard**:
   - **Step 1:** Enter your event name (e.g. *IdeaJam 2026* or *BHU Tech 2026*), organization, date, and certificate prefix.
   - **Step 2:** Select an existing template or upload your custom PNG/JPG/PDF background. Click *Launch Visual Field Studio* to drag and adjust field positions.
   - **Step 3:** Connect a **REST API**, **Excel/CSV Spreadsheet**, or configured **Direct Database** source.
   - **Step 4:** Map recipient fields, inspect invalid and duplicate warnings, select recipients, and explicitly confirm the insert-only import.
   - **Step 5:** Click **Generate Personalized Certificates**. Watch the bulk generation progress bar.
   - **Step 6:** Review or edit the email subject and body, then click **Dispatch Certificates via Nodemailer**.
   - **Step 7:** View the delivery audit table, inspect preview links, and retry any failed records.

---

## 5. Technology Architecture

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti |
| **Backend API** | Node.js, Express.js |
| **Certificate Engine** | `pdf-lib` (pure JavaScript vector PDF generation) |
| **Email Service** | `nodemailer` (SMTP transport with attachment delivery and retry) |
| **Data Parsing** | `xlsx`, `csv-parse`, `multer` |
| **Datastore** | Persistent local datastore with optional primary MongoDB connection |
| **Security** | JWT Bearer authentication, bcryptjs password hashing, sanitized logs |

### External Recipient Data Sources

Recipient imports support REST JSON APIs, CSV/Excel files, and an optional backend-configured MongoDB source. All source imports use a preview, explicit record selection, and insert-only confirmation; duplicates are skipped and existing recipients are never updated by an import. Importing does not generate certificates or send email.

For local REST testing, configure these values in `backend/.env` (copy variable names from `backend/.env.example`):

```dotenv
PORTFOLIO_INQUIRIES_API_URL=http://localhost:3000/api/integrations/pramaan/inquiries
PRAMAAN_INTEGRATION_TOKEN=<temporary-local-token>
NODE_ENV=development
REST_API_ALLOWED_HOSTS=
REST_API_AUTH_PROFILES_JSON={}
```

Set the same temporary token in the portfolio's **server-side** local environment. Never add it to frontend environment variables or source control. Local HTTP is accepted only for loopback development URLs. Other REST API hosts must use HTTPS and be listed by hostname in `REST_API_ALLOWED_HOSTS`. Configure any REST authentication profiles in the PRAMAAN backend environment as JSON; the UI exposes only profile names and types, never credentials.

`MONGODB_URI` is PRAMAAN's own database connection and remains backend-only. The optional recipient database connector uses the separate backend-only `EXTERNAL_MONGODB_URI`; without it, the UI explains setup and disables the connector. Neither connection string is entered in the browser.
