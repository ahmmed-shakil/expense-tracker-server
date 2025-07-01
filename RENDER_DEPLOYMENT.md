# Deployment Guide - Backend

## Environment Variables for Render

When deploying to Render, make sure to set these environment variables in your Render dashboard:

### Required Environment Variables

```bash
# Environment Configuration
NODE_ENV=production
PORT=3001

# Database (use your production database URL)
DATABASE_URL=your_production_postgresql_url

# JWT Secrets (generate strong secrets for production)
JWT_ACCESS_SECRET=your_super_secret_access_key_change_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_in_production

# JWT Expiration
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CORS Origin (your frontend URL)
CORS_ORIGIN=https://your-frontend-domain.com

# Email Configuration (for OTP functionality)
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_APP_PASSWORD=your_gmail_app_password

# Keep-alive URL (your Render backend URL)
RENDER_URL=https://your-backend-app-name.onrender.com
```

### Gmail App Password Setup

1. Go to your Google Account settings
2. Security → 2-Step Verification (must be enabled)
3. App passwords → Generate a new app password
4. Use this 16-character password as EMAIL_APP_PASSWORD

### Build and Deploy Commands

**Build Command:**

```bash
npm run build
```

**Start Command:**

```bash
npm start
```

### Keep-Alive Feature

The backend includes a cron job that pings itself every 30 seconds when:

- `NODE_ENV=production`
- `RENDER_URL` is set

This prevents Render's free tier from spinning down due to inactivity.

### Health Check

The backend provides health check endpoints:

- `GET /health` - Returns server health status
- `GET /` - Returns API info

### Database Migration

After deployment, your database should already be set up through the DATABASE_URL. The Prisma client will be generated during the build process.

### Troubleshooting

1. **Nodemailer issues**: Make sure EMAIL_USER and EMAIL_APP_PASSWORD are correctly set
2. **Database connection**: Verify DATABASE_URL is correct and accessible
3. **CORS issues**: Ensure CORS_ORIGIN matches your frontend domain exactly
4. **Keep-alive**: Check that RENDER_URL is set to your backend URL

### Security Notes

- Never commit `.env` files to version control
- Use strong, unique JWT secrets in production
- Enable 2FA and use app passwords for email
- Regularly rotate secrets and passwords
