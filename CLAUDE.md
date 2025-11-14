# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js e-commerce application for Symphony Labs, bootstrapped with T3 Stack. It features cryptocurrency payment integration via BTCPay Server (Bitcoin, Lightning Network, and Monero), product management, and order tracking. The application uses a brutalist design aesthetic with Tailwind CSS.

## Development Commands

- `npm run dev` - Start development server with Turbo mode
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run preview` - Build and start production server locally
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run check` - Run linter and type check
- `npm run typecheck` - Run TypeScript compiler without emitting files
- `npm run format:check` - Check code formatting with Prettier
- `npm run format:write` - Format code with Prettier

## Architecture

### Database Layer (Supabase)

- **Database**: PostgreSQL via Supabase
- **Schema location**: `supabase/schema.sql`
- **Tables**:
  - `products` - Product catalog with RLS policies allowing public read access, includes `hidden` field for visibility control, `stock` for inventory management, and `images` array for product carousel
  - `orders` - Order records with shipping info, payment status, tracking data, and shipping carrier details
  - `lab_tests` - Lab test results linked to products (batch, purity, link)
  - `banner` - Site-wide banner configuration (text, color)
- **Authentication**: RLS policies set to public (authentication handled at application level for admin routes)
- **Client**: Centralized Supabase client at `src/lib/supabase.ts`

### Payment Flow (BTCPay Server)

The checkout process follows a three-step flow:
1. **Order Creation**: Creates order record in database via `/api/orders/create`
2. **Invoice Generation**: Creates BTCPay invoice via `/api/btcpay/create-invoice`
3. **Invoice Linking**: Links BTCPay invoice to order via `/api/orders/update-invoice`

Payment APIs:
- `/api/btcpay/create-invoice` - Creates new BTCPay invoice (supports BTC, Lightning, XMR)
- `/api/btcpay/invoice/[invoiceId]` - Fetches invoice status
- `/api/btcpay/payment-methods/[invoiceId]` - Retrieves payment methods for invoice
- `/api/orders/mark-paid` - Updates order status when payment completes

**Supported Payment Methods**:
- Bitcoin (BTC) - On-chain payments
- Lightning Network (BTC-LightningNetwork) - Instant payments
- Monero (XMR) - Privacy-focused cryptocurrency (requires 10 confirmations, typically 20-30 minutes)

### Frontend Architecture

**Context Providers** (all client-side in `src/context/`):
- `CartContext` - Shopping cart state with localStorage persistence (key: `symphony_cart`)
- `AdminAuthContext` - Admin authentication state management with JWT tokens

**Key Pages**:
- `/` - Product listing page with visible products
- `/checkout` - Multi-step checkout with cart review, shipping form, and payment
- `/admin` - Product management (CRUD operations, visibility toggle, document upload)
- `/admin/orders` - Order management and fulfillment
- `/admin/lab-tests` - Lab test results management
- `/admin/banner` - Site-wide banner configuration

**Component Pattern**:
- Client components marked with `"use client"` directive
- Server components by default (Next.js 15 App Router)
- Components in `src/components/` are reusable UI elements

**Product Image Management**:
- Products support multiple images via the `images` array field in the database
- `ProductImageCarousel` component displays images with navigation arrows and thumbnail strip
- Admin panel allows uploading multiple images, setting main image, and removing images
- Images are stored in `/public/products/` directory
- API endpoint `/api/products/upload-image` handles image uploads (max 10MB, JPEG/PNG/WebP/GIF)
- Main product image (`image` field) is used for backward compatibility and as the primary image

**Markdown Support**:
- Product descriptions support full Markdown formatting (using `react-markdown` with `remark-gfm`)
- `MarkdownPreview` component provides consistent styling across the site
- Admin panel includes live markdown preview toggle for product descriptions
- Supports headings, lists, links, code blocks, tables, bold, italic, blockquotes, etc.

### Environment Variables

Environment validation using `@t3-oss/env-nextjs` in `src/env.js`:

**Server-side** (accessed via `env.VARIABLE_NAME`):
- `NODE_ENV` - Environment mode (development, test, production)
- `BTCPAY_API_KEY` - BTCPay Server API key
- `BTCPAY_STORE_ID` - BTCPay store identifier
- `BTCPAY_HOST` - BTCPay Server URL
- `BTCPAY_ALLOW_INSECURE` - Optional flag for insecure BTCPay connections
- `ADMIN_USERNAME` - Admin panel username
- `ADMIN_PASSWORD` - Admin panel password
- `MAILGUN_API_KEY` - Mailgun API key for sending emails
- `MAILGUN_DOMAIN` - Mailgun domain for email sending
- `JWT_SECRET` - JWT secret key (minimum 32 characters) for admin authentication
- `MONERO_WALLET_RPC_URL` - Optional Monero wallet RPC endpoint URL (e.g., http://btcpayserver_monero_wallet:18082/json_rpc)
- `MONERO_WALLET_ADDRESS` - Optional Monero wallet address for receiving payments

**Client-side** (prefixed with `NEXT_PUBLIC_`):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

All environment variables are validated at build time with Zod schemas. Set `SKIP_ENV_VALIDATION=1` to skip validation (useful for Docker builds).

### API Routes

All API routes are in `src/app/api/`:
- Admin authentication: `/api/admin/login`, `/api/admin/verify`, `/api/auth/login`
- BTCPay operations: `/api/btcpay/*`
- Order management: `/api/orders/*`
- Banner management: `/api/banner`, `/api/banner/update`
- Product operations: `/api/products/toggle-visibility`, `/api/products/upload-image`
- Document management: `/api/documents/upload` - Upload PDFs, DOC, DOCX, TXT files (max 10MB)
- Image management: `/api/products/upload-image` - Upload product images (JPEG, PNG, WebP, GIF - max 10MB)
- Email notifications: `/api/email/order-confirmation`, `/api/email/shipping-notification` (Mailgun integration)

### Security Layer

The application includes a comprehensive security layer in `src/lib/security/`:
- **Rate Limiting** (`rate-limiter.ts`): In-memory rate limiter with configurable presets for different endpoints
  - `RateLimitPresets.ORDER_CREATE` - For invoice creation and order operations
  - Returns `isAllowed`, `remaining`, and `resetTime` for API responses
- **Input Validation** (`input-validation.ts`): Zod-based validation with sanitization using DOMPurify
  - `createInvoiceSchema` - Validates BTCPay invoice creation
  - `validateAndSanitize()` - Validates and sanitizes user input
- **JWT Authentication** (`jwt.ts`): JWT token generation and verification for admin authentication using `jose` library
- **Logging** (`logger.ts`): Structured logging for security events, API requests, rate limit violations, and validation errors
- **CSRF Protection** (`csrf.ts`): CSRF token generation and validation (if implemented)

**Important Security Notes**:
- All API routes validate input with Zod schemas before processing
- Rate limiting is applied to prevent abuse (429 status with Retry-After header)
- Admin JWT tokens are stored in localStorage (key: `admin_token`)
- Security events are logged for monitoring and debugging

### Styling

- **Framework**: Tailwind CSS v4
- **Design System**: Brutalist aesthetic with custom utility classes
- **Global styles**: `src/styles/globals.css`
- **Custom classes**: Look for `brutalist-*` and `btn-brutalist*` classes

### Type Safety

- TypeScript strict mode enabled
- Product type defined in `src/lib/supabase.ts`
- API route types use explicit type assertions with interfaces
- All form data and API responses are typed

## Key Architectural Notes

1. **Cart Persistence**: Cart data is stored in localStorage with key `symphony_cart` and persisted across sessions
2. **Admin Auth**: Custom admin authentication (not using Supabase Auth) with JWT tokens stored in localStorage (key: `admin_token`). Token validated via `/api/admin/verify`
3. **Image Hosting**: Product images stored in `/public/products/` or external URLs. Multiple images supported via the `images` array field with carousel display
4. **Payment Integration**: Custom BTCPay checkout component (`CustomBTCPayCheckout`) polls invoice status every 5 seconds and supports BTC, Lightning, and Monero with specific UI warnings for Monero's longer confirmation times (20-30 minutes for XMR)
5. **RLS Policies**: Database has RLS enabled but policies allow public access - admin authentication is application-level only
6. **Email Notifications**: Order confirmation and shipping notification emails sent via Mailgun
7. **Product Visibility**: Products can be hidden from the public listing but remain accessible by direct URL
8. **Banner System**: Dynamic site-wide banner configurable from admin panel with custom text and color
9. **Rate Limiting**: In-memory rate limiter protects API endpoints from abuse with configurable limits per endpoint
10. **Input Sanitization**: All user input is validated with Zod schemas and sanitized with DOMPurify before processing
11. **Document Upload**: Admin panel supports uploading documents (PDF, DOC, DOCX, TXT) up to 10MB stored in `/public/documents/` with automatic markdown link insertion
12. **Markdown Rendering**: Product descriptions support full markdown with live preview in admin panel and styled rendering on product pages
13. **Stock Management**: Products have a stock field that is automatically decremented when orders are paid. Stock validation prevents overselling
14. **Image Carousel**: Products can have multiple images displayed in a carousel with navigation arrows, thumbnails, and main image selection in admin panel

## Development Notes

- **Environment Validation**: Set `SKIP_ENV_VALIDATION=1` to bypass validation during Docker builds or when environment variables are not yet configured
- **Self-Signed Certificates**: Set `BTCPAY_ALLOW_INSECURE=true` to allow connections to BTCPay Server with self-signed SSL certificates (development only)
- **Type Safety**: Project uses TypeScript strict mode with explicit typing for all API routes and components
- **Client/Server Boundary**: Components marked with `"use client"` directive are client-side React components; all others are server components by default (Next.js 15 App Router)
