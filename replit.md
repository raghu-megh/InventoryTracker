# Replit.md - CloverSync Multi-Tenant Inventory Management System

## Overview

CloverSync is a multi-tenant inventory management system designed for restaurants with seamless Clover POS integration. The application provides real-time inventory tracking, webhook-based automation, and comprehensive dashboard analytics across multiple restaurant locations.

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
- Database connection via `DATABASE_URL` environment variable
- Replit Auth configuration via `REPL_ID` and domain settings
- Session security via `SESSION_SECRET`
- Webhook security via restaurant-specific secrets

### Production Considerations
- Session storage in PostgreSQL for horizontal scaling
- WebSocket support for Neon Database connectivity
- Error handling and logging middleware
- CORS and security headers configuration

The application follows a clean architecture pattern with clear separation between presentation, business logic, and data persistence layers, making it maintainable and extensible for future restaurant management features.

## Recent Changes

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
- **Authentication Fix**: Fixed hybrid Firebase + backend authentication to automatically select restaurants
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

### Comprehensive Webhook Implementation (July 14, 2025)
- **New Webhook Structure**: Implemented support for Clover's official webhook payload format: `{"appId":"...", "merchants":{"merchantId":[events]}}`
- **Complete Event Type Support**: Added all Clover event types from documentation (ORDERS, INVENTORY, PAYMENTS, CUSTOMERS, etc.)
- **Multi-Character Object IDs**: Proper parsing for complex object types like CA (Cash Adjustments), IC (Inventory Category), IG (Inventory Modifier Group)
- **Dual Endpoint Support**: Both new webhook endpoint `/api/webhook/clover` and legacy endpoint `/api/webhook/clover/:merchantId` for backward compatibility
- **Event Processing Pipeline**: Automatic restaurant lookup by merchant ID, event logging, and type-specific processing
- **Test Endpoints**: Added `/api/webhook/clover/test` for testing webhook integration during development
- **Signature Verification**: Support for Clover webhook signature verification and auth code validation
- **Error Handling**: Comprehensive error handling with detailed logging for webhook processing failures