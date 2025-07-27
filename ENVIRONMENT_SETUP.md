# Environment Variables Setup Guide

This document explains how to configure environment variables for MyRestaurantInventory.

## Important: Use Replit Secrets (not .env files)

For security reasons, all environment variables should be configured using Replit's Secrets tab rather than .env files. This prevents accidental exposure of sensitive credentials.

## Required Environment Variables

### Database Configuration (Usually auto-configured by Replit)
- `DATABASE_URL` - PostgreSQL connection string
- `PGHOST` - Database host
- `PGPORT` - Database port
- `PGUSER` - Database username  
- `PGPASSWORD` - Database password
- `PGDATABASE` - Database name

### Replit Authentication (Auto-configured by Replit)
- `SESSION_SECRET` - Secret for session encryption
- `REPL_ID` - Your Replit app ID
- `REPLIT_DOMAINS` - Authorized domains for OAuth
- `ISSUER_URL` - OAuth issuer URL (usually https://replit.com/oidc)

### Clover POS Integration (Required for POS features)
- `CLOVER_APP_ID` - Your Clover app ID
- `CLOVER_APP_SECRET` - Your Clover app secret
- `CLOVER_API_BASE` - Clover API base URL (sandbox: https://apisandbox.dev.clover.com, production: https://api.clover.com)
- `CLOVER_API_KEY` - Your Clover API key

### Azure Document Intelligence (Required for receipt processing)
- `AZURE_DOCUMENT_AI_KEY` - Azure Cognitive Services key
- `AZURE_DOCUMENT_AI_ENDPOINT` - Azure service endpoint URL

### Email Notifications (Optional - Mailchimp)
- `MAILCHIMP_API_KEY` - Mailchimp Transactional API key

### SMS Notifications
- SMS functionality has been removed from the application
- All alerts are now sent via email only using Mailchimp

## How to Set Up Secrets in Replit

1. Open your Replit project
2. Click on the "Secrets" tab in the left sidebar (lock icon)
3. Add each environment variable as a new secret:
   - Key: The variable name (e.g., `CLOVER_APP_ID`)
   - Value: Your actual credential/value
4. Save each secret

## Development vs Production

- **Development**: Use sandbox URLs and test credentials
- **Production**: Use production URLs and live credentials

Make sure to update `CLOVER_API_BASE` and other service URLs when moving to production.

## Security Best Practices

- Never commit actual credentials to your code repository
- Use the .env.example file as a template, but don't put real values in it
- Regularly rotate API keys and secrets
- Use minimum required permissions for each service account