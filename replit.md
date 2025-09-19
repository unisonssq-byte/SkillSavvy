# Overview

This is a modern, interactive portfolio website called "Unicode's Portfolio" built for a freelance programmer. The application follows a full-stack architecture with a React frontend and Express.js backend, featuring a sophisticated content management system with admin authentication. The portfolio allows dynamic creation and management of pages with customizable content blocks that can include text and media elements. The design emphasizes a dark, modern aesthetic with extensive animations and smooth user interactions.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing with dynamic page handling based on slugs
- **UI Components**: Shadcn/ui component library built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Styling**: Tailwind CSS with custom dark theme design system featuring purple/blue color palette
- **Design System**: Consistent rounded corners, glass effects, and smooth animations throughout

## Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL with Neon serverless provider
- **File Upload**: Multer middleware for handling media uploads with thumbnail generation
- **Authentication**: Session-based admin authentication with bcrypt password hashing
- **Real-time Communication**: WebSocket server for live updates and notifications

## Data Architecture
The database schema includes:
- **Pages**: Dynamic page management with slugs, titles, and ordering
- **Blocks**: Flexible content blocks with JSON content storage supporting text, media, and mixed content types
- **Media**: File management with metadata, thumbnails, and block associations
- **Users**: Admin user management with role-based permissions
- **Sessions**: Persistent session storage for admin authentication

## Content Management System
- **Block-based Content**: Each page consists of unlimited, reorderable content blocks
- **Media Integration**: Images and videos can be attached to specific blocks with automatic thumbnail generation
- **Admin Interface**: In-place editing with visual controls and confirmation dialogs
- **Real-time Updates**: WebSocket-powered live updates across all connected clients

## Authentication & Security
- **Admin Access**: Password-protected admin mode with persistent session storage
- **Role-based Permissions**: Admin-only content editing with visual indicators
- **File Security**: Validated file uploads with type and size restrictions
- **Session Management**: Secure session handling with automatic cleanup

# External Dependencies

## Database & Storage
- **Neon Database**: Serverless PostgreSQL database provider configured via DATABASE_URL
- **File Storage**: Local filesystem storage for uploaded media with organized directory structure

## UI & Design Libraries
- **Radix UI**: Comprehensive primitive component library for accessible UI components
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide Icons**: Modern icon library for consistent iconography
- **Google Fonts**: Inter and JetBrains Mono fonts for typography

## Development & Build Tools
- **Vite**: Modern build tool with hot module replacement and optimized production builds
- **TypeScript**: Type safety across the entire application stack
- **Drizzle Kit**: Database migration and schema management tools
- **ESBuild**: Fast JavaScript bundler for server-side code

## Runtime Services
- **WebSocket (ws)**: Real-time bidirectional communication between client and server
- **Multer**: Multipart form data handling for file uploads
- **Bcrypt**: Secure password hashing for admin authentication
- **Nanoid**: URL-safe unique identifier generation

## Replit-specific Integrations
- **Replit Vite Plugins**: Development banner, error overlay, and cartographer for enhanced development experience
- **Environment Detection**: Conditional plugin loading based on Replit environment variables