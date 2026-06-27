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

## III. Core Features

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

## IV. Prerequisites

- Node.js (v18.0.0 or higher)
- npm or yarn package manager
- Git
- A code editor (VS Code recommended)

## V. Run Instructions

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

## VI. How To Use

### Deployment

**Live Link:** [Add your deployed URL here]

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
