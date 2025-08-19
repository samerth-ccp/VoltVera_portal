# Overview

Voltverashop is a full-stack web application built as a user management system with role-based authentication. The application features a React frontend with TypeScript, an Express.js backend, and PostgreSQL database integration. It implements Replit's OAuth authentication system and provides both admin and user dashboards with comprehensive user management capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development/build tooling
- **UI Library**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation resolvers
- **Design System**: Custom Voltverashop branding with green gradient theme and Segoe UI typography

## Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **Authentication**: Replit OAuth integration using OpenID Connect with Passport.js
- **Session Management**: Express sessions with PostgreSQL storage via connect-pg-simple
- **API Design**: RESTful API endpoints with role-based access control
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Build System**: esbuild for production bundling with ESM modules

## Database Architecture
- **Database**: PostgreSQL with Neon serverless integration
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Data Models**: 
  - Users table with Binary MLM structure (sponsorId, parentId, leftChildId, rightChildId, position, level)
  - PendingRecruits table for admin approval workflow
  - EmailTokens table for email verification and password reset
  - Sessions table for secure session storage
  - Enums for user roles and statuses
- **Connection**: Connection pooling with @neondatabase/serverless
- **Binary Tree Structure**: Full referential integrity with foreign key constraints for tree relationships

## Authentication & Authorization
- **OAuth Provider**: Replit's OpenID Connect implementation
- **Session Strategy**: Secure HTTP-only cookies with PostgreSQL session store
- **Role-Based Access**: Admin and user roles with middleware protection
- **Security Features**: CSRF protection, secure cookie settings, and automatic session management

## Key Features
- **User Management**: Full CRUD operations for user accounts (admin only)
- **Binary MLM System**: Complete binary matrix structure with left/right positions ✅ WORKING
- **Team Management**: Enhanced recruit tracking with Package Amount, Registration Date, Activation Date, ID Status, Position ✅ WORKING
- **Pending Recruits Workflow**: Users submit recruitment requests, admins process and approve ✅ WORKING
- **Binary Tree Visualization**: Interactive visual representation of the binary MLM structure ✅ WORKING
- **Spillover System**: Automatic placement of new recruits using balanced spilling algorithm ✅ WORKING
- **Email-Based Authentication**: User signup with email verification and password reset via SendGrid ✅ WORKING
- **Role-Based Dashboards**: Separate interfaces for admin and regular users
- **Email Verification**: Secure signup process requiring email confirmation ✅ WORKING
- **Password Reset**: Email-based password reset with secure token validation ✅ WORKING
- **Real-time UI**: Optimistic updates and real-time data synchronization
- **Responsive Design**: Mobile-first responsive layout with adaptive components
- **Type Safety**: End-to-end TypeScript with shared schema validation
- **SendGrid Integration**: Fully operational email service using voltveratech.com verified domain (August 17, 2025)

# External Dependencies

## Authentication Services
- **Replit OAuth**: Primary authentication provider using OpenID Connect protocol
- **OpenID Client**: Handles OAuth flows and token management

## Database Services  
- **Neon PostgreSQL**: Serverless PostgreSQL database hosting
- **Connection Pooling**: @neondatabase/serverless for optimized database connections

## UI/UX Libraries
- **Radix UI**: Headless UI components for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide React**: Icon library for consistent iconography
- **React Hook Form**: Form state management and validation

## Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Static type checking across frontend and backend
- **Drizzle**: Type-safe ORM with automatic migration generation
- **TanStack Query**: Server state management and caching layer

## Session & Security
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **Passport.js**: Authentication middleware for OAuth integration
- **Memoizee**: Function memoization for performance optimization