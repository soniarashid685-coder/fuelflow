# Overview

This is a comprehensive Petrol Pump Management System built as a full-stack web application. The system provides complete business management functionality for petrol stations, including point-of-sale operations, inventory management, financial tracking, customer and supplier management, and comprehensive reporting capabilities. It's designed to handle the complex operational needs of fuel retail businesses with features for cash reconciliation, credit management, stock monitoring, and financial reporting.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Custom component system built on Radix UI primitives with Tailwind CSS styling
- **State Management**: TanStack Query (React Query) for server state management with optimistic updates
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Context-based authentication system with localStorage persistence
- **Form Management**: React Hook Form with Zod validation schemas

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured error handling and request logging middleware
- **Authentication**: Session-based authentication with bcrypt password hashing
- **Database Layer**: Repository pattern with a storage abstraction layer for clean separation of concerns

## Data Storage
- **Database**: PostgreSQL with Neon serverless configuration
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Schema Design**: Comprehensive relational schema covering users, stations, products, tanks, customers, suppliers, transactions, purchase orders, expenses, payments, and stock movements
- **Migration System**: Drizzle Kit for database schema migrations and management

## Component Architecture
- **Design System**: Shadcn/ui components with consistent styling and behavior
- **Layout System**: Sidebar navigation with protected routes and role-based access
- **Form Components**: Reusable form components with validation and error handling
- **Data Tables**: Sortable and filterable tables with search and pagination capabilities

## Business Logic Modules
- **Point of Sale**: Real-time transaction processing with inventory updates
- **Inventory Management**: Tank monitoring, stock movements, and automatic alerts
- **Financial Management**: Accounts receivable/payable, expense tracking, and cash reconciliation
- **Customer/Supplier Relations**: Credit management and payment tracking
- **Reporting System**: Financial statements, sales reports, and aging analysis

## Security & Authentication
- **Password Security**: Bcrypt hashing with salt rounds
- **Route Protection**: AuthGuard component ensuring authenticated access
- **Role-Based Access**: User roles (admin, manager, cashier) with appropriate permissions
- **Session Management**: Secure session handling with automatic logout

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **WebSocket Support**: Real-time database connections via WebSocket constructor

## UI & Styling
- **Radix UI**: Headless UI primitives for accessible components
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Type-safe component variants

## Development Tools
- **Vite**: Fast development server and build tool with HMR
- **ESBuild**: Fast JavaScript bundler for production builds
- **TypeScript**: Static type checking and enhanced developer experience
- **Drizzle Kit**: Database schema management and migration tools

## Third-Party Libraries
- **TanStack Query**: Server state management with caching and synchronization
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: Schema validation for type-safe data handling
- **Date-fns**: Date manipulation and formatting utilities
- **Recharts**: Chart library for financial data visualization

## Authentication & Security
- **bcrypt**: Password hashing and verification
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **Wouter**: Lightweight routing for single-page application navigation