# QuoteFlow Pro

Build a high-converting mobile-first B2B SaaS web app named "QuoteFlow" designed for mobile auto detailers to generate instant customer price estimates and receive real-time quote alerts on Telegram.

The app consists of three core pages and a Supabase backend integration:

1. CUSTOMER QUOTE FORM (`/:business_slug`):

- Mobile-optimized, ultra-clean public form.

- Dynamically loads the detailer's business name and pricing parameters based on `business_slug`.

- Step 1: Select Vehicle Size (Sedan/Coupe, SUV/Crossover, Truck/Van) with clear base price displays.

- Step 2: Checkbox add-ons for vehicle condition (Pet Hair Removal, Heavy Stain Removal, Ceramic Coating) with price additions.

- Step 3: Dynamic Price Display showing "Estimated Total" that updates instantly as options are toggled.

- Step 4: Customer Contact Inputs (Full Name, Phone Number).

- Action: "Request Booking" button that inserts the record into Supabase `quotes` table and triggers a notification toast. Shows a clean success state after submission.

2. DETAILER DASHBOARD (`/dashboard`):

- A clean settings panel for detailers to customize their pricing rules.

- Price Configuration Card: Inputs for Sedan Base ($), SUV Base ($), Truck Base ($), Pet Hair Add-on ($), Stain Add-on ($), and Ceramic Add-on ($).

- Telegram Integration Card: Displays connection status (Connected / Not Connected). Features a prominent "Connect Telegram Bot" button pointing to `https://t.me/YourBotName?start=AUTH_CODE` using a generated unique authorization code.

- Quote History Table: Displays recent customer requests (Name, Phone, Vehicle, Add-ons, Calculated Price, Timestamp).

3. LANDING PAGE (`/`):

- High-converting hero section targeting mobile auto detailers: "Never Lose a Detailing Lead While Mid-Wash."

- Key Features Grid: Instant Web Quotes, Real-Time Telegram Alerts, Zero App Install Required, 1-Tap Call/Text Customer Buttons.

- Pricing Card: Flat $15/month subscription with a "7-Day Free Trial" call to action.

SUPABASE DATABASE SCHEME & LOGIC:

- `profiles` table: id, business_name, slug (unique), telegram_chat_id, telegram_auth_code (unique), sedan_base, suv_base, truck_base, addon_pet_hair, addon_stains, addon_ceramic, created_at.

- `quotes` table: id, detailer_id (foreign key), customer_name, customer_phone, vehicle_type, addons (array), estimated_price, created_at.

- Include a frontend logic calculation helper: `(Base Price by Vehicle) + (Sum of Active Add-ons) = Estimated Price`.

Use Tailwind CSS, Lucide icons, Shadcn UI components, modern clean typography, and a sleek neutral professional automotive theme (Slate Gray, Electric Blue accents, Pure White background).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://detailer-iq.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8fb31a95-aeff-4749-b426-79dcbf815bdf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
