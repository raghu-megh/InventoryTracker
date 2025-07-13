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