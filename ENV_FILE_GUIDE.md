# Environment File Configuration Guide

## Simple Approach (Recommended)

Use **ONE `.env` file** in production. No need for `.env.production`.

### Production Setup

```bash
# In your production backend directory (~/comrades-master/)
# Just maintain one .env file with all your production credentials

~/comrades-master/.env
```

**That's it!** The application will:
1. Load `.env` first (always)
2. Optionally look for `.env.production` for overrides (if present)
3. If `.env.production` doesn't exist, that's perfectly fine - `.env` is sufficient

## Environment Variables Required

Your `.env` file should contain:

```env
# Database (MySQL for production)
DB_HOST=localhost
DB_NAME=vdranjxy_Comradesdb
DB_USER=vdranjxy_AdminComrades360
DB_PASS=your_password
DB_PORT=3306

# Environment
NODE_ENV=production

# JWT
JWT_SECRET=your_jwt_secret

# M-Pesa (if using)
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=174379

# Frontend URL
FRONTEND_URL=https://comrades360.shop

# Other settings as needed...
```

## Why This Works

The application loads environment variables in this order:
1. **`.env`** (base configuration) ✅ Required
2. **`.env.production`** (optional overrides) ⚠️ Optional

If `.env.production` is missing, the app uses `.env` - **this is the recommended approach** for production to avoid confusion.

## Migration from .env.production

If you currently have separate files:

```bash
# Option 1: Use .env only (recommended)
cd ~/comrades-master
# Keep your .env file, delete or ignore .env.production
rm .env.production  # or just leave it empty

# Option 2: Keep both (advanced)
# Use .env for common settings
# Use .env.production for production-specific overrides
cp .env .env.production
# Then edit .env.production to override specific values
```

## Local Development

For local development (your laptop), use:
- `.env` with SQLite configuration
- OR `.env.development` for dev-specific settings

The code automatically detects `NODE_ENV` and adjusts accordingly.

## Troubleshooting

### "Access denied" errors
```bash
# Check if .env exists and has DB credentials
cat ~/comrades-master/.env | grep DB_

# Should show:
# DB_HOST=localhost
# DB_NAME=vdranjxy_Comradesdb
# DB_USER=vdranjxy_AdminComrades360
# DB_PASS=your_password
```

### App not loading environment variables
```bash
# Verify .env file location
ls -la ~/comrades-master/.env

# Check file is not empty
wc -l ~/comrades-master/.env

# Should be 40-50+ lines
```

### Restart after changing .env
```bash
cd ~/comrades-master
touch tmp/restart.txt

# Wait a few seconds, then check logs
sleep 3
tail -20 error.log
```

## Security Notes

1. **Never commit `.env` to Git** - it's in `.gitignore`
2. **Keep backups** of your `.env` file securely
3. **Use strong passwords** for database and JWT secrets
4. **Restrict file permissions**: `chmod 600 .env`

## Quick Reference

```bash
# Check current environment
cd ~/comrades-master
NODE_ENV=production node -e "console.log('ENV:', process.env.NODE_ENV, 'DB:', process.env.DB_NAME)"

# Verify database connection
NODE_ENV=production node -e "
const { sequelize } = require('./database/database');
sequelize.authenticate()
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.error('❌ Database error:', err.message));
"

# Restart application
touch tmp/restart.txt
```
