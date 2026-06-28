## I. Problem Statement

> In urban centers, the rainy season turns daily commuting into a high-stakes gamble. Sudden flooding in low-lying streets paralyzes traffic and creates severe hardships, particularly for two-wheeler commuters and ride-hailing drivers.

**The Core Pain Points:**

- **Financial Drain:** Wading through deep water causes severe engine damage to motorcycles. For gig-economy drivers, this means expensive repair bills and days of lost income due to downtime.
- **Health & Hygiene Hazards:** Riders are forced to navigate through contaminated, foul-smelling sewer water. This ruins footwear, causes physical discomfort, and exposes them to dermatological issues like fungal infections.
- **The Information Gap:** Riders currently lack hyper-local, real-time alerts. They often realize a street is flooded only when they are already trapped in it, with no clear alternative route.

## II. Our Solution: Proactive Flood-Aware Routing - GoSafe

To solve this, we are building a dynamic web application designed to keep riders dry and safe. Instead of just showing a map, our system provides continuous, real-time updates on flood conditions and actively **reroutes commuters to dry alternative paths**.

**How We Gather Data (Tri-layered Approach):**
Our platform anticipates and reports flooding by synthesizing data from three primary sources:

1. **Weather Data (OpenWeather API):** Analyzing real-time precipitation and forecasting data to flag streets historically prone to flooding.
2. **Computer Vision (CV) feeds from municipal cameras:** Automated hardware placed in critical low-lying areas to measure exact water depths in real-time.
3. **Community Crowdsourcing:** Empowering users to report incidents instantly by uploading geotagged photos of flooded streets.

By analyzing this data, the system predicts high-risk flood zones and pushes real-time alerts to the user interface, instantly recalculating safe routes.

## III. Tech Stack

<table>
   <tr>
      <td><p>Frontend</p></td>
      <td><img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" /></td>
      <td><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" /></td>
      <td><img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></td>
      <td><img src="https://img.shields.io/badge/App%20Router-111827?style=for-the-badge&logo=vercel&logoColor=white" alt="App Router" /></td>
   </tr>
   <tr>
      <td><p>Styling</p></td>
      <td><img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></td>
      <td><img src="https://img.shields.io/badge/tailwind--merge-0F172A?style=for-the-badge&logo=tailwindcss&logoColor=38B2AC" alt="tailwind-merge" /></td>
      <td><img src="https://img.shields.io/badge/class--variance--authority-111827?style=for-the-badge&logo=css3&logoColor=white" alt="class-variance-authority" /></td>
      <td><img src="https://img.shields.io/badge/clsx-1E293B?style=for-the-badge&logo=javascript&logoColor=F7DF1E" alt="clsx" /></td>
   </tr>
   <tr>
      <td><p>UI Primitives</p></td>
      <td><img src="https://img.shields.io/badge/Radix_UI-000000?style=for-the-badge&logo=radixui&logoColor=white" alt="Radix UI" /></td>
      <td><img src="https://img.shields.io/badge/Lucide_React-111827?style=for-the-badge&logo=lucide&logoColor=white" alt="Lucide React" /></td>
      <td><img src="https://img.shields.io/badge/Sonner-111827?style=for-the-badge&logoColor=white" alt="Sonner" /></td>
      <td><img src="https://img.shields.io/badge/Recharts-8884D8?style=for-the-badge&logo=recharts&logoColor=white" alt="Recharts" /></td>
   </tr>
   <tr>
      <td><p>Auth and Security</p></td>
      <td><img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" /></td>
      <td><img src="https://img.shields.io/badge/NextAuth-000000?style=for-the-badge&logo=auth0&logoColor=white" alt="NextAuth" /></td>
      <td><img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" /></td>
      <td><img src="https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" /></td>
   </tr>
   <tr>
      <td><p>Backend and API</p></td>
      <td><img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" /></td>
      <td><img src="https://img.shields.io/badge/QRCode-000000?style=for-the-badge&logo=qrcode&logoColor=white" alt="QRCode" /></td>
      <td><img src="https://img.shields.io/badge/date--fns-3C3C3C?style=for-the-badge&logo=date-fns&logoColor=white" alt="date-fns" /></td>
      <td><img src="https://img.shields.io/badge/dotenv-ECD53F?style=for-the-badge&logo=dotenv&logoColor=000000" alt="dotenv" /></td>
   </tr>
</table>

<div align="center">
   <p>Additional Libraries and Tools</p>
   <img src="https://img.shields.io/badge/lodash.debounce-3492FF?style=for-the-badge&logo=lodash&logoColor=white" alt="lodash.debounce" />
   <img src="https://img.shields.io/badge/pg-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="pg" />
   <img src="https://img.shields.io/badge/qrcode.react-2F80ED?style=for-the-badge&logo=react&logoColor=white" alt="qrcode.react" />
   <img src="https://img.shields.io/badge/qr--code--styling-111827?style=for-the-badge&logo=qrcode&logoColor=white" alt="qr-code-styling" />
   <img src="https://img.shields.io/badge/react--qrcode--logo-61DAFB?style=for-the-badge&logo=react&logoColor=000000" alt="react-qrcode-logo" />
</div>

### Feature Footprint

- `app/`: App Router pages, layouts, and server routes
- `components/`: Reusable UI and dashboard components
- `hooks/`: Client-side hooks for storage, rate limiting, and UX behavior
- `lib/`: Auth, Prisma, utilities, and service logic
- `prisma/`: Schema, migrations, and seed data
- `public/`: Brand assets, map visuals, and platform icons

## IV. Architecture

### Frontend Structure

- `app/`: Main frontend shell built with Next.js App Router, including the landing page, global layout, metadata assets, and client providers
- `components/`: Shared UI building blocks and dashboard sections such as navigation, tables, dialogs, loading states, and reusable form controls
- `components/ui/`: Base design-system primitives used across the interface for consistent inputs, dialogs, tabs, tooltips, and other controls
- `hooks/`: Client-side behavior for storage migration and rate-limit handling
- `public/`: Static assets such as the logo, QR assets, manifest files, and platform icons
- `app/globals.css`: Global styling entry point for the application-wide visual system

### Backend Structure

- `app/api/`: Server route handlers that expose the application API surface
- `app/api/auth/`: Authentication flow and NextAuth integration
- `app/api/incidents/`: Incident intake, approval, clearing, upload, and AI evaluation workflows
- `app/api/navigation/`: Route logic for navigation and rerouting behavior
- `app/api/notifications/`: Notification delivery and subscription handling
- `app/api/rate-limit/`: Rate-limiting endpoints and checks
- `app/api/users/`: User management and consent endpoints
- `app/api/vouchers/`: Voucher listing and exchange logic
- `app/api/weather/`: Weather data ingestion and risk-related endpoints
- `lib/`: Server-side auth, Prisma client setup, shared utilities, and service logic
- `prisma/`: Database schema, migrations, and seed data for PostgreSQL-backed persistence
- `app/generated/prisma/`: Generated Prisma client and model typings used by the backend

## V. Core Features

### 1. User

- View map of street sections at risk of flooding and currently flooded
- Send emergency alerts to users when near streets about to flood and when they open the app
- Ask user if they want to reroute to another street to avoid flooding
- After arriving at destination, pop up a feedback window to feed data to AI
- Open camera to report whether their current location is flooded or not
- Redeem reward points from taking reports and providing feedback to exchange for vouchers

### 2. Admin

- Manage user accounts
- Manage vouchers and partners
- Manage display of flooded streets on map
- Manage cameras

### 3. Business

- Use our API to develop their own applications

## VI. Prerequisites

- Node.js (v18.0.0 or higher)
- npm or yarn package manager
- Git
- A code editor (VS Code recommended)

## VII. Run Instructions

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/GoSafe-SmartCity/production.git
   cd production
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   - Create a `.env.local` file in the root directory
   - Add required environment variables:
     ```
     NEXT_PUBLIC_API_URL=your_api_url
     NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweather_key
     # Add other required variables
     ```

4. **Run the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open in browser**
   - Navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run start
# or
yarn build
yarn start
```

## VIII. How To Use

### Deployment

**Live Link:** https://gosafe-smartcity.vercel.app/

### User Guide

1. **View Flood Map**
   - Open the app and view real-time flood status on the interactive map
   - Red zones indicate currently flooded areas, yellow zones show at-risk areas

2. **Get Alerts**
   - Enable notifications to receive emergency alerts when approaching flooded streets

3. **Report Flooding**
   - Use the camera feature to capture and report flooded locations
   - Earn reward points for accurate reports

4. **View Alternative Routes**
   - After receiving an alert, accept the reroute suggestion to navigate around flooded areas

5. **Redeem Points**
   - Exchange accumulated reward points for vouchers in the rewards section
## VII. System Architecture
<img width="886" height="881" alt="image" src="https://github.com/user-attachments/assets/c0701820-25a4-44fe-b3c6-de413ebf7f67" />
## VIII. AI - assisted development 
Gemini, AI Agent integrated in AntiGravity

