# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Multi-tenancy support with subdomain-based studio isolation
- Classes module with support for single-session, multi-session, series, and multi-step classes
- Category hierarchy system with subcategories
- Class scheduling with session management
- **Teaching Roles & Staff Management (Phase 3A)**
  - Teaching role definitions with create/edit/delete functionality
  - Staff role assignment system with certification tracking
  - User promotion workflow (search → promote roles → assign teaching roles)
  - Role-based permissions (Admin, Manager, Staff hierarchy)
  - Teaching role selector in class form (replaces instructor text field)
  - Teaching role filter for classes list with multi-select dropdown
  - Classes table improvements: clickable rows, role column, trash icon for delete
- Admin panel with category, class, teaching role, and user management
- Google OAuth authentication integration
- User agreements and phone number collection
- Product catalog display on home page organized by categories

### Changed

- Migrated from generic Product model to feature-specific models (Classes first)
- Classes now directly linked to categories via categoryId instead of through Product table
- Admin UI converted from custom CSS to Tailwind CSS v4
- Product catalog now fetches and displays Class records directly

### Planned Major Features

- **Class Registration & Scheduling**: Pattern-based recurring schedules, one-off classes, customer registration
- **Teaching Roles**: Role-based teaching assignments, staff management and scheduling
- **Attendance Tracking**: Staff check-in interface, attendance history, reporting
- **Notifications**: 24-hour class reminders, registration confirmations
- **Studio Hours Management**: Holiday closures, Google Business integration
- **Materials & Inventory**: Auto-deduct materials per class, ordering system

### Removed

- Generic Product model and associated CRUD operations
- Product admin UI components (ProductForm, ProductTable)
- Products tab from admin sidebar

## [0.1.0] - 2026-01-20

### Added

- Initial project setup with Next.js frontend and Express backend
- PostgreSQL database with Prisma ORM
- Multi-tenant architecture foundation
- Authentication system with email/password and Google OAuth
- Basic category management
- Docker support for development and deployment
