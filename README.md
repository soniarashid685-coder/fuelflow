# FuelFlow - Petrol Pump Management System

## Overview

FuelFlow is a comprehensive Petrol Pump Management System designed to handle all aspects of fuel retail business operations. The system provides complete business management functionality including point-of-sale operations, inventory management, financial tracking, customer and supplier management, and comprehensive reporting capabilities.

## 🚀 Quick Start

### Default Login Credentials
- **Username:** `admin`
- **Password:** `admin123`

### Google Authentication
The system also supports Google Sign-In for convenient access. Users can sign in with their Google accounts and be automatically registered in the system.

## 🏗️ System Architecture

### Frontend Architecture
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite for fast development and optimized builds
- **UI Library:** Custom component system built on Radix UI primitives
- **Styling:** Tailwind CSS for consistent and responsive design
- **State Management:** TanStack Query for server state with optimistic updates
- **Routing:** Wouter for lightweight client-side routing
- **Authentication:** Dual system supporting local and Google authentication

### Backend Architecture
- **Runtime:** Node.js with Express.js framework
- **Language:** TypeScript with ES modules
- **API Design:** RESTful API with structured error handling
- **Authentication:** Session-based with bcrypt password hashing + Firebase Google Auth
- **Database:** PostgreSQL with Drizzle ORM
- **Real-time:** WebSocket support for live updates

## 🔐 Authentication System

### Dual Authentication Support
The system supports two authentication methods:

#### 1. Local Authentication
- Username and password based
- Bcrypt password hashing for security
- Role-based access control (admin, manager, cashier)
- Station-specific access

#### 2. Google Authentication
- Firebase-powered Google Sign-In
- Automatic user registration
- Seamless integration with existing system
- Default 'cashier' role assignment

### Setting Up Google Authentication

To enable Google authentication, you need to:

1. **Firebase Console Setup:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new Firebase project
   - Add a web app to your project
   - Enable Google Sign-In in Authentication section
   - Add your Replit domain to authorized domains

2. **Environment Variables:**
   Set these environment variables in your Replit:
   - `VITE_FIREBASE_PROJECT_ID`: Your Firebase project ID
   - `VITE_FIREBASE_APP_ID`: Your Firebase app ID
   - `VITE_FIREBASE_API_KEY`: Your Firebase API key

## 📊 Core Features

### 1. Point of Sale (POS)
- **Real-time Fuel Sales:** Process petrol, diesel, and other fuel transactions
- **Multi-pump Support:** Handle multiple fuel dispensers simultaneously
- **Payment Methods:** Cash, card, and credit transactions
- **Receipt Generation:** Automatic receipt printing and digital copies
- **Inventory Integration:** Real-time stock updates during sales

### 2. Inventory Management
- **Tank Monitoring:** Track fuel levels in storage tanks
- **Stock Movements:** Record fuel receipts, sales, and transfers
- **Automatic Alerts:** Low stock and overfill warnings
- **Fuel Quality Tracking:** Monitor fuel quality metrics
- **Purchase Order Integration:** Seamless restocking workflow

### 3. Financial Management
- **Accounts Receivable:** Track customer credit and payments
- **Accounts Payable:** Manage supplier invoices and payments
- **Cash Reconciliation:** Daily cash drawer balancing
- **Expense Management:** Record and categorize business expenses
- **Financial Reporting:** Comprehensive financial statements

### 4. Customer Management
- **Customer Database:** Maintain detailed customer records
- **Credit Management:** Track credit limits and outstanding balances
- **Payment History:** Complete payment tracking and aging reports
- **Loyalty Programs:** Support for customer loyalty initiatives

### 5. Supplier Management
- **Supplier Directory:** Comprehensive supplier database
- **Purchase Orders:** Create and manage fuel purchase orders
- **Payment Tracking:** Monitor supplier payments and due dates
- **Quality Management:** Track supplier performance metrics

### 6. Reporting System
- **Sales Reports:** Daily, weekly, monthly sales analysis
- **Financial Statements:** Profit & loss, balance sheet, cash flow
- **Inventory Reports:** Stock levels, movement analysis
- **Customer Analytics:** Customer behavior and credit analysis
- **Management Dashboard:** Key performance indicators and trends

## 🗄️ Database Schema

### Core Tables

#### Users & Authentication
- `users`: System users with roles and permissions
- `stations`: Fuel station locations and details

#### Inventory Management
- `products`: Fuel types and other products
- `tanks`: Storage tank information and capacity
- `stock_movements`: All inventory movements and transactions

#### Customer & Supplier Relations
- `customers`: Customer database with credit information
- `suppliers`: Supplier information and contacts
- `purchase_orders`: Purchase order management

#### Financial Management
- `transactions`: All sales transactions
- `payments`: Customer and supplier payments
- `expenses`: Business expense tracking

## 🛠️ Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Firebase project (for Google Auth)

### Installation
```bash
# Install dependencies
npm install

# Set up database
npm run db:push

# Start development server
npm run dev
```

### Environment Variables
```env
DATABASE_URL=postgresql://...
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_API_KEY=your-api-key
```

## 🔧 Key Technologies

### Frontend Technologies
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **TailwindCSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **TanStack Query**: Powerful data synchronization
- **React Hook Form**: Performant form management
- **Zod**: Runtime type validation

### Backend Technologies
- **Express.js**: Web application framework
- **Drizzle ORM**: Type-safe database queries
- **bcrypt**: Password hashing
- **Firebase Auth**: Google authentication
- **WebSocket**: Real-time communication
- **Session Management**: Secure user sessions

## 🚀 Deployment

The application is designed for Replit deployment with:
- Automatic workflow management
- Built-in PostgreSQL database
- Environment variable management
- Domain and SSL handling

## 📱 User Interface

### Dashboard
- Real-time sales metrics
- Inventory status overview
- Financial summary
- Quick action buttons

### Navigation
- Sidebar navigation with role-based menu items
- Responsive design for mobile and desktop
- Quick search functionality
- User profile and settings

### Form Design
- Consistent form layouts
- Real-time validation
- Error handling and user feedback
- Auto-save capabilities

## 🔒 Security Features

### Data Security
- Password hashing with bcrypt
- Session-based authentication
- SQL injection prevention
- XSS protection
- CSRF protection

### Access Control
- Role-based permissions
- Station-specific access
- API endpoint protection
- Audit logging

## 📈 Performance Features

### Frontend Optimization
- Code splitting and lazy loading
- Component memoization
- Optimistic updates
- Efficient re-rendering

### Backend Optimization
- Database connection pooling
- Query optimization
- Response caching
- Error handling middleware

## 🔄 Real-time Features

- Live inventory updates
- Real-time transaction processing
- WebSocket-based notifications
- Automatic data synchronization

## 📊 Business Intelligence

### Analytics
- Sales trend analysis
- Customer behavior insights
- Inventory turnover reports
- Profitability analysis

### Decision Support
- Automated alerts and notifications
- Key performance indicators
- Predictive analytics
- Business forecasting

## 🛡️ Backup & Recovery

- Automatic database backups
- Point-in-time recovery
- Data export capabilities
- System health monitoring

## 📞 Support & Maintenance

### System Monitoring
- Application performance monitoring
- Error tracking and logging
- Database performance metrics
- User activity monitoring

### Maintenance Tasks
- Regular data cleanup
- Security updates
- Performance optimization
- Feature enhancements

---

*This system is designed to scale with your business needs while maintaining security, performance, and reliability.*