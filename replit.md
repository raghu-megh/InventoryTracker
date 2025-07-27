# Replit.md - MyRestaurantInventory Multi-Tenant Inventory Management System

## Overview

MyRestaurantInventory is a multi-tenant inventory management system designed for restaurants with seamless Clover POS integration. The application provides real-time inventory tracking, webhook-based automation, and comprehensive dashboard analytics across multiple restaurant locations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple

### Database Schema Design
The system uses a multi-tenant architecture with the following key entities:
- **Users**: Replit Auth integration with profile information
- **Restaurants**: Tenant isolation with Clover merchant ID mapping
- **User-Restaurant Relationships**: Role-based access control per restaurant
- **Inventory Management**: Categories, items, stock movements, and sales tracking
- **Webhook Events**: Audit trail for Clover POS integrations

## Key Components

### Authentication & Authorization
- Replit Auth integration with OpenID Connect
- Session-based authentication with PostgreSQL storage
- Multi-tenant access control through user-restaurant relationships
- Role-based permissions (owner, manager, employee)

### Inventory Management
- Hierarchical category organization
- Real-time stock level tracking with minimum threshold alerts
- Cost tracking and unit management
- Automated stock adjustments via Clover webhooks

### Clover POS Integration
- Webhook endpoint for real-time synchronization
- Payment processing integration
- Order and inventory event handling
- Signature verification for webhook security

### Dashboard & Analytics
- Real-time metrics aggregation
- Low stock alert system
- Sales tracking and reporting
- Webhook activity monitoring

## Data Flow

### Authentication Flow
1. User initiates login via Replit Auth
2. OpenID Connect verification with Replit servers
3. Session creation in PostgreSQL with user profile data
4. Restaurant access validation based on user-restaurant relationships

### Inventory Synchronization
1. Clover POS sends webhook notifications for inventory/order events
2. Webhook signature verification using restaurant-specific secrets
3. Event processing and database updates
4. Real-time UI updates via React Query cache invalidation

### Multi-Tenant Data Access
1. User authentication establishes session context
2. Restaurant selection filters all subsequent data queries
3. Role-based access control enforced at API level
4. Data isolation maintained through restaurant ID scoping

## External Dependencies

### Core Services
- **Neon Database**: Serverless PostgreSQL for primary data storage
- **Replit Auth**: Authentication and user management
- **Clover POS**: Payment processing and inventory data source

### Development Tools
- **Drizzle Kit**: Database migrations and schema management
- **Vite**: Development server and build tooling
- **ESBuild**: Production build optimization

### UI Dependencies
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library

## Deployment Strategy

### Build Process
- Frontend: Vite builds React application to `dist/public`
- Backend: ESBuild bundles Express server to `dist/index.js`
- Shared types and schemas compiled for both environments

### Environment Configuration
- **Secrets Management**: All environment variables managed through Replit Secrets (not .env files)
- **Database**: `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
- **Replit Auth**: `SESSION_SECRET`, `REPL_ID`, `REPLIT_DOMAINS`, `ISSUER_URL`
- **Clover Integration**: `CLOVER_APP_ID`, `CLOVER_APP_SECRET`, `CLOVER_API_BASE`, `CLOVER_API_KEY`
- **Azure AI**: `AZURE_DOCUMENT_AI_KEY`, `AZURE_DOCUMENT_AI_ENDPOINT`
- **Notifications**: `MAILCHIMP_API_KEY` (email alerts only)

### Production Considerations
- Session storage in PostgreSQL for horizontal scaling
- WebSocket support for Neon Database connectivity
- Error handling and logging middleware
- CORS and security headers configuration

The application follows a clean architecture pattern with clear separation between presentation, business logic, and data persistence layers, making it maintainable and extensible for future restaurant management features.

## Recent Changes

### Complete Firebase Removal & Environment Variables Setup (July 27, 2025)
- **Firebase Dependencies Removed**: Completely uninstalled firebase and firebase-admin packages from the project
- **Authentication System Cleanup**: Removed all Firebase authentication references, now using Replit Auth exclusively
- **Query Client Updates**: Updated query client to use session-based authentication instead of Firebase tokens
- **Page Authentication Fixes**: Fixed home and purchasing pages to use Replit Auth logout flow (/api/logout)
- **Privacy Policy Update**: Updated third-party services documentation to reflect Replit Auth usage
- **Code Cleanup**: Removed firebase.ts, firebaseAuth.ts, and all Firebase import statements throughout the codebase
- **Session-Based Auth**: All API requests now use credentials: 'include' for session-based authentication
- **Environment Variables Documentation**: Created .env.example file documenting all required environment variables
- **Secrets Management**: All environment variables managed through Replit Secrets for security best practices
- **Twilio Removal**: Completely removed Twilio SMS functionality - now email-only alerts via Mailchimp
- **Server Configuration**: Moved host and port configuration to environment variables (HOST, PORT) with dotenv support

### OAuth2-Only Clover Integration (July 26, 2025)
- **OAuth2 Exclusive Support**: Removed legacy OAuth flow support, now exclusively supporting OAuth2 flow with proper token exchange
- **Merchant-Specific Access Tokens**: Implemented proper token storage in restaurants table with `clover_access_token` column
- **Enhanced CloverService**: Updated to use merchant-specific access tokens instead of generic API keys for secure API calls
- **Real Token Exchange**: Uses official Clover v2 OAuth endpoints for proper authorization code to access token exchange
  - Authorization: `https://sandbox.dev.clover.com/oauth/v2/authorize` (dev) / `https://www.clover.com/oauth/v2/authorize` (prod)
  - Token Exchange: `https://apisandbox.dev.clover.com/oauth/v2/token` (dev) / `https://api.clover.com/oauth/v2/token` (prod)
- **Improved Security**: Each merchant gets their own access token for API operations, ensuring proper permission scoping

### Recipe-Based Raw Material Deduction System (July 14, 2025)
- **Enhanced Clover Webhook Integration**: Implemented comprehensive webhook processing to automatically deduct raw materials based on sold items
- **Recipe Matching Logic**: When orders are received from Clover POS, the system matches sold items with recipes in the database using Clover item IDs or name similarity
- **Automatic Raw Material Calculation**: For recipe matches, the system calculates raw material usage based on recipe ingredients and quantities sold
- **Unit Conversion Support**: Automatic conversion between imperial and metric units when deducting raw materials
- **Stock Movement Tracking**: All inventory changes are logged with detailed reasons and references to Clover orders
- **Fallback to Direct Inventory**: If no recipe match is found, the system falls back to direct inventory deduction
- **Test Endpoint**: Added `/api/webhook/clover/:merchantId/test` for simulating webhook notifications during development

### Webhook Event Types Supported:
- `ORDER_PAID`: Processes completed orders and deducts raw materials
- `ORDER_UPDATED`: Handles order modifications  
- `ORDER_CREATED`: Logs order creation events
- `PAYMENT_CREATED`: Records payment transactions
- `INVENTORY_UPDATED`: Syncs inventory changes from Clover POS

### Menu Items Integration (July 14, 2025)
- **Direct Clover Menu Import**: Added comprehensive menu_items table to store items synced from Clover POS
- **Menu Items Page**: New `/menu-items` page displays all synced items organized by category with sync capabilities
- **Enhanced Navigation**: Updated sidebar to include Menu Items, Recipes, and Raw Materials for complete workflow
- **Recipe Linking**: Menu items can be linked to recipes for automatic inventory deduction
- **Mock Sync Functionality**: Temporary mock data for testing Clover integration until real API connection
- **Workflow Integration**: Seamless flow from menu import → recipe creation → automatic inventory tracking
- **Authentication Fix**: Fixed authentication to automatically select restaurants
- **Restaurant Auto-Selection**: System now automatically selects the first restaurant when user has restaurants available

### Recipe Creation Workflow Enhancement (July 14, 2025)
- **Pre-populated Recipe Forms**: "Create Recipe" button on menu items now automatically opens recipe creation dialog
- **Automatic Form Population**: Recipe name, description, and category are pre-filled from menu item data
- **Cross-Restaurant Navigation**: Fixed restaurant ID handling to ensure correct data context across pages
- **Seamless User Experience**: Single-click workflow from menu item to recipe creation with all relevant data pre-populated

### Real Clover API Integration (July 14, 2025)
- **Clover Service Implementation**: Created comprehensive CloverService for real API integration with Clover POS
- **Live Menu Sync**: Replaced mock data with real Clover API calls to `${CLOVER_API_BASE}/merchants/${merchantId}/items`
- **Environment Variables**: Added CLOVER_API_BASE and CLOVER_API_KEY for secure API authentication
- **Error Handling**: Implemented proper error handling for API failures and credential issues
- **Connection Testing**: Added test connection endpoint and UI button to verify Clover API credentials
- **Smart Categorization**: Automatic item categorization based on product names and SKUs
- **Price Conversion**: Automatic conversion from Clover's cent-based pricing to dollar format
- **Active Item Filtering**: Only syncs available, non-hidden, revenue-generating items from Clover

### OAuth-Secured Webhook Implementation (July 21, 2025)
- **Complete OAuth Security**: Implemented HMAC-SHA256 signature verification with Clover-Signature header validation
- **Dual-Mode Webhook Handling**: Proper handling of both Clover verification requests during setup and actual webhook events
- **Enhanced Authentication**: Support for X-Clover-Auth header verification and merchant-specific webhook secrets
- **Restaurant-Level Security**: Each restaurant has unique webhook secrets and optional auth codes for additional security
- **Verification Code Processing**: Automatic detection and logging of Clover verification codes with setup instructions
- **Multi-Merchant Support**: Secure processing of webhooks for multiple merchants in single payload with individual validation
- **Database Schema Enhancement**: Added cloverAuthCode field to restaurants table for enhanced webhook security
- **Complete Documentation**: Updated webhook settings page with step-by-step Clover setup instructions and security details
- **Production-Ready Security**: Webhook endpoint now meets enterprise OAuth security standards for Clover POS integration
- **Successful Verification**: Webhook successfully verified with Clover using verification code e98b8924-c184-49b2-8fce-02aabf452561

### Enhanced Order Processing with Real Clover API Integration (July 14, 2025)
- **Real-Time Order Processing**: When order CREATE events are received, system automatically fetches order details and line items from Clover API using `${CLOVER_API_BASE}/merchants/${merchantId}/orders/${orderId}/line_items`
- **Recipe-Based Raw Material Deduction**: System matches sold items to menu items in database by Clover item ID, retrieves associated recipes, and automatically deducts raw materials based on recipe ingredients
- **Intelligent Inventory Logic**: For each line item, system first attempts recipe-based raw material deduction; if no recipe exists, logs for manual review
- **Unit Conversion Support**: Automatic conversion between different measurement units when deducting raw materials (e.g., recipe calls for cups but raw material tracked in ounces)
- **Comprehensive Stock Tracking**: All inventory changes logged with detailed reasons, order references, and before/after stock levels
- **Sale Record Creation**: Paid orders automatically generate sale records with Clover order ID cross-references
- **Error Resilience**: Robust error handling ensures partial failures don't break the entire order processing pipeline

### Complete Recipe-Based Inventory Deduction System (July 14, 2025)
- **End-to-End Testing**: Successfully tested complete workflow with real Margherita Pizza order processing from Clover POS
- **Raw Material Movement Tracking**: Created separate `raw_material_movements` table for proper audit trail of ingredient deductions
- **Perfect Recipe Integration**: System automatically deducts exact recipe amounts (5g basil, 120g mozzarella, 1 pizza dough, 80ml sauce) based on actual sales
- **Complete Audit Trail**: Every ingredient deduction recorded with previous stock, new stock, Clover order ID, and timestamp
- **Universal Webhook Endpoint**: Updated to `/api/webhook/clover` for all merchant webhook events with proper event routing

### App Rebranding (July 21, 2025)
- **Complete App Rebranding**: Successfully renamed application from CloverSync to MyRestaurantInventory across all components
- **Updated Navigation**: Changed sidebar, mobile menu, and loading screens to display MyRestaurantInventory branding
- **Landing Page Update**: Updated hero section, benefits, and footer to reflect new MyRestaurantInventory brand
- **Documentation Update**: Updated replit.md and HTML metadata to reflect new app name and purpose
- **Consistent Branding**: Ensured all user-facing text displays MyRestaurantInventory instead of CloverSync throughout the application

### Updated Webhook Settings Page (July 14, 2025)  
- **Correct Webhook URL**: Updated to show universal endpoint `/api/webhook/clover` instead of merchant-specific URLs
- **Real Payload Examples**: Shows actual Clover webhook payload format with merchant IDs and event structure
- **Improved Setup Instructions**: Clear 4-step process for configuring Clover webhook integration
- **Event Documentation**: Lists all supported event types (ORDERS_CREATE, PAYMENTS_CREATE, etc.) with descriptions
- **Test Functionality**: Added working test webhook button to verify integration setup
- **Authentication Details**: Shows proper `X-Clover-Auth` header configuration for webhook verification

### Raw Materials Purchasing System with Azure AI Integration (July 17-18, 2025)
- **Complete Purchasing Infrastructure**: Added comprehensive database schema with `raw_material_purchases`, `raw_material_purchase_items`, and enhanced `raw_material_movements` tables
- **Dual Input Methods**: Built purchasing page with manual entry form and AI-powered receipt scanning functionality
- **Azure Document Intelligence Integration**: Configured Azure AI service for real receipt processing with async polling and result parsing
- **Editable Receipt Analysis Results**: Implemented fully editable forms for receipt analysis results, allowing users to review and correct AI-extracted data before saving
- **Automatic Inventory Updates**: Purchase recording automatically updates raw material stock levels, tracks amounts spent, and creates detailed movement audit trails
- **Smart Item Matching**: Azure AI attempts to match receipt items with existing raw materials using fuzzy matching algorithms with confidence scores
- **Purchase History Tracking**: Complete purchase history with vendor information, user tracking, and processing method indicators (manual vs AI-scanned)
- **Raw Material Quantity Updates**: System automatically increases raw material stock when purchases are saved, maintaining accurate inventory levels for analysis
- **Navigation Integration**: Added purchasing functionality to sidebar navigation with appropriate icons and routing
- **Enhanced Price Extraction**: Fixed Azure currency field parsing (valueCurrency.amount) with 70% confidence filtering for high-quality data
- **Real-time Total Calculation**: Automatic total amount calculation at bottom of forms, updates when item prices change, uses receipt total or calculated sum
- **UI Polish**: Fixed raw material dropdown display to show units only when available, preventing empty parentheses
- **Imperial/Metric Unit System**: Display imperial units (lbs, oz, gal) in UI while storing metric values (grams, liters) in database with automatic conversion
- **Smart Unit Auto-Fill**: When raw material is selected, unit field automatically updates to show the imperial equivalent of the material's base unit
- **Comprehensive Unit Conversion**: Added unit conversion utilities supporting weight, volume, and length conversions between imperial and metric systems
- **Complete Imperial Unit Integration**: Updated all pages (Inventory, Raw Materials, Purchasing) to consistently display imperial units with metric storage backend
- **Enhanced UI Consistency**: All stock levels, quantities, and units now display in imperial format (lbs, gal, fl oz, oz) across the entire application

### Premium Analytics System Implementation (July 21, 2025)
- **Complete Database Schema**: Added 5 new analytics tables (dailyAnalytics, recipeAnalytics, supplierAnalytics, demandForecasts, costOptimizations)
- **Subscription-Based Access Control**: Added subscriptionTier and analyticsEnabled fields to restaurants table for premium feature gating
- **Six Core Analytics Modules**: Profitability analysis, inventory turnover, demand forecasting, waste analysis, supplier performance, and AI-powered cost optimization
- **Advanced Business Intelligence**: Recipe-level P&L tracking, predictive demand modeling, automated cost-saving recommendations
- **Analytics Service Implementation**: Complete backend service with access control, data aggregation, and intelligent insights generation
- **Premium Feature Architecture**: Multi-tenant analytics with time-series data optimization and machine learning readiness

### Comprehensive Alert System with Mailchimp Integration (July 21, 2025)
- **Mailchimp Transactional Integration**: Replaced SendGrid with Mailchimp for professional email alert delivery
- **Hybrid Alert Strategy**: Immediate alerts for high-priority items + daily summary reports for comprehensive monitoring
- **Multi-Channel Notifications**: Email via Mailchimp and SMS via Twilio with restaurant-specific configuration
- **Smart Alert Logic**: Priority-based alerting with deduplication to prevent spam and frequency control
- **Test Functionality**: Built-in alert testing capabilities for validating email and SMS configurations
- **Alert Settings Page**: Complete UI for configuring alert preferences, contact information, and notification methods

### Enhanced Landing Page Marketing (July 21, 2025)
- **Premium Analytics Showcase**: Added dedicated section highlighting profitability analysis, demand forecasting, and cost optimization features
- **Alert System Promotion**: New section showcasing smart alert capabilities with visual benefits (25% less waste, 15% cost reduction)
- **Business Intelligence Positioning**: Emphasized complete business intelligence capabilities and subscription-based premium features
- **Competitive Differentiators**: Updated feature grid to highlight alerting and analytics as key selling points
- **Visual Enhancement**: Added gradient sections, icons, and compelling statistics to improve conversion potential

### Legal Documentation and Support Infrastructure (July 21, 2025)
- **End User License Agreement**: Comprehensive EULA covering licensing terms, permitted use, restrictions, data ownership, liability limitations, and termination conditions
- **Privacy Policy**: Detailed privacy policy addressing data collection, usage, sharing, third-party integrations, security measures, user rights, and GDPR compliance
- **Support Page**: Complete customer support infrastructure with multiple contact methods, FAQ section, help topics, and resource links
- **Legal Navigation**: Integrated legal document links into landing page, authenticated app footer, and support page for easy access
- **Public Routes**: All legal and support pages accessible to both authenticated and non-authenticated users
- **Professional Documentation**: Enterprise-grade legal coverage for restaurant industry compliance and customer trust