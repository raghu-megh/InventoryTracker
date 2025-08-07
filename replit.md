# MyRestaurantInventory Multi-Tenant Inventory Management System

## Overview
MyRestaurantInventory is a multi-tenant inventory management system for restaurants, integrating seamlessly with Clover POS. It provides real-time inventory tracking, webhook-based automation, and comprehensive dashboard analytics across multiple restaurant locations. The project aims to enhance restaurant efficiency through intelligent inventory management, sales tracking, and advanced analytics, including recipe-based raw material deduction, purchasing systems with AI-powered receipt scanning, and subscription-based premium analytics.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript and Vite
- **UI**: shadcn/ui components (Radix UI primitives), Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: PostgreSQL-backed sessions (`connect-pg-simple`)

### Database Schema Design
Multi-tenant architecture with entities for Users (Replit Auth integrated), Restaurants (tenant isolation by Clover merchant ID), User-Restaurant Relationships (role-based access), Inventory (categories, items, stock movements, sales), and Webhook Events (audit trail for Clover POS).

### Key Components
- **Authentication & Authorization**: Replit Auth, session-based auth, multi-tenant access control, role-based permissions (owner, manager, employee).
- **Inventory Management**: Hierarchical categorization, real-time stock levels with alerts, cost tracking, automated stock adjustments via Clover webhooks, recipe-based raw material deduction.
- **Clover POS Integration**: Webhook endpoint for real-time synchronization (order, inventory events), signature verification (HMAC-SHA256), OAuth2 exclusive support with merchant-specific access tokens.
- **Dashboard & Analytics**: Real-time metrics, low stock alerts, sales tracking, webhook monitoring, premium analytics modules (profitability, inventory turnover, demand forecasting, waste analysis, supplier performance, cost optimization).
- **Purchasing System**: Manual and Azure AI-powered receipt scanning for raw material purchases, automatic inventory updates, comprehensive audit trails.
- **Alert System**: Email notifications (Mailchimp) for low stock and other critical events, immediate alerts and daily summary reports.

### Data Flow
- **Authentication**: User login via Replit Auth (OpenID Connect), session creation, restaurant access validation.
- **Inventory Sync**: Clover POS webhooks trigger event processing and database updates, real-time UI updates via React Query.
- **Multi-Tenant Data Access**: Session context and restaurant selection filter data queries; role-based access control and data isolation by restaurant ID.

## External Dependencies

### Core Services
- **Neon Database**: Serverless PostgreSQL.
- **Replit Auth**: Authentication and user management.
- **Clover POS**: Payment processing, inventory data source, webhook provider.
- **Azure Document Intelligence**: AI-powered receipt scanning for purchasing.
- **Mailchimp**: Transactional email alerts.

### Development Tools
- **Drizzle Kit**: Database migrations.
- **Vite**: Frontend development server and build tool.
- **ESBuild**: Backend bundling.

### UI Dependencies
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.