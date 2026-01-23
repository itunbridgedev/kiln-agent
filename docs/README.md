# Pottery Studio App Documentation

Welcome to the Pottery Studio App documentation. This directory contains comprehensive documentation for setup, architecture, and development.

## 📁 Documentation Structure

### `/setup` - Setup Guides

Configuration and setup instructions for various services and integrations.

- **[Google OAuth Setup](./setup/GOOGLE_OAUTH_SETUP.md)** - Complete guide for setting up Google OAuth across all environments
- **[Apple OAuth Setup](./setup/APPLE_OAUTH_SETUP.md)** - Complete guide for setting up Apple Sign In with domain verification

### `/architecture` - Architecture Documentation

System design, architecture decisions, and technical overviews.

- **[Architecture Overview](./architecture/ARCHITECTURE.md)** - Overall system architecture and design decisions
- **[Multi-Tenancy Summary](./architecture/MULTI_TENANCY_SUMMARY.md)** - Multi-tenant architecture implementation and subdomain handling

### `/development` - Development Documentation

Development workflows, implementation plans, and change tracking.

- **[CI/CD Documentation](./development/CI_CD.md)** - Continuous integration and deployment setup for DEV/STAGING/PROD
- **[Classes Implementation Plan](./development/CLASSES_IMPLEMENTATION_PLAN.md)** - Implementation details for the classes/sessions module
- **[Changelog](./development/CHANGELOG.md)** - Version history and changes
- **[TODO](./development/TODO.md)** - Pending tasks and feature requests
- **[Test CI/CD](./development/TEST_CICD.md)** - CI/CD testing procedures

## 🚀 Quick Start

### Authentication Setup

1. Start with [Google OAuth Setup](./setup/GOOGLE_OAUTH_SETUP.md)
2. Then configure [Apple OAuth Setup](./setup/APPLE_OAUTH_SETUP.md)

### Deployment

- Review [CI/CD Documentation](./development/CI_CD.md) for deployment workflows
- Understand [Multi-Tenancy](./architecture/MULTI_TENANCY_SUMMARY.md) before deploying

### Development

- Check [TODO](./development/TODO.md) for current priorities
- Review [Architecture](./architecture/ARCHITECTURE.md) for system understanding
- See [Changelog](./development/CHANGELOG.md) for recent changes

## 🌐 Environments

- **DEV**: https://www.kilnagent-dev.com
- **STAGING**: https://www.kilnagent-stage.com
- **PROD**: https://www.kilnagent.com

## 📝 Contributing

When adding new documentation:

- Place setup guides in `/setup`
- Place architecture docs in `/architecture`
- Place development docs in `/development`
- Update this README with links to new documents
