# Pottery Studio App

Full-stack web application for pottery studio management with authentication.

## Tech Stack

### Backend
- **Node.js** with Express.js
- **TypeScript**
- **PostgreSQL** with Prisma ORM
- **Passport.js** for authentication
  - Google OAuth 2.0
  - Apple Sign In
  - Email/Password
- **express-session** with Postgres store

### Frontend
- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**

## Project Structure

- `/api` - Backend API source files
- `/src` - Backend Express server and routes
- `/web` - Next.js frontend application
- `/prisma` - Database schema and migrations

## Deployment

- **API**: Heroku (kilnagent-api)
- **Web**: Heroku (kilnagent-web)
- **Database**: PostgreSQL on Heroku

## Authentication

OAuth callback flow uses Next.js API routes as proxies to handle Set-Cookie headers properly across subdomains (www.kilnagent.com → api.kilnagent.com).
