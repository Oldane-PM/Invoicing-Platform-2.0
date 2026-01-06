# Invoice App v2.0 - Deployment Guide

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Development](#development)
- [Production Build](#production-build)
- [Deployment Options](#deployment-options)
- [Post-Deployment](#post-deployment)

## Prerequisites

Before deploying, ensure you have:
- Node.js 18+ installed
- npm or pnpm package manager
- Git for version control

## Environment Setup

1. **Clone the repository** (if not already done):
   ```bash
   git clone <your-repo-url>
   cd "Invoice App v2.0"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   - Copy `env.example` to `.env` (or `.env.production` for production)
   - Update the values according to your environment:
   ```bash
   cp env.example .env
   ```

## Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run type-check` - Check TypeScript types

## Production Build

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Preview the build locally** (optional):
   ```bash
   npm run preview
   ```

The production build will be in the `dist/` directory.

## Deployment Options

### Option 1: Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. For production deployment:
   ```bash
   vercel --prod
   ```

**Vercel Configuration** (vercel.json):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### Option 2: Netlify

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Deploy:
   ```bash
   netlify deploy
   ```

3. For production:
   ```bash
   netlify deploy --prod
   ```

**Netlify Configuration** (netlify.toml):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Option 3: Traditional Web Server (Apache/Nginx)

1. Build the application:
   ```bash
   npm run build
   ```

2. Copy the `dist/` folder to your web server

3. **Nginx Configuration**:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /path/to/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Enable gzip compression
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
   }
   ```

4. **Apache Configuration** (.htaccess):
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

### Option 4: Docker

1. **Create Dockerfile**:
   ```dockerfile
   FROM node:18-alpine as build
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=build /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **Build and run**:
   ```bash
   docker build -t invoice-app .
   docker run -p 80:80 invoice-app
   ```

## Post-Deployment

### 1. Verify Deployment
- Test all user roles (Admin, Manager, Contractor)
- Check all navigation flows
- Verify PDF generation works
- Test notifications system

### 2. Performance Optimization
- Enable CDN for static assets
- Configure caching headers
- Enable compression (gzip/brotli)

### 3. Security Checklist
- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] CORS configured properly (if using API)
- [ ] Content Security Policy configured

### 4. Monitoring
- Set up error tracking (e.g., Sentry)
- Configure analytics (e.g., Google Analytics)
- Monitor performance metrics

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_APP_NAME` | Application name | Invoice App v2.0 | No |
| `VITE_APP_VERSION` | Application version | 2.0.0 | No |
| `VITE_API_URL` | Backend API URL | http://localhost:3000/api | Yes (for production) |
| `VITE_API_TIMEOUT` | API timeout in ms | 30000 | No |
| `VITE_AUTH_ENABLED` | Enable authentication | false | No |
| `VITE_ENABLE_PDF_EXPORT` | Enable PDF export | true | No |
| `VITE_ENABLE_NOTIFICATIONS` | Enable notifications | true | No |
| `VITE_ENVIRONMENT` | Environment name | development | No |

## Troubleshooting

### Build Fails
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear build cache: `rm -rf dist`
- Check Node.js version: `node --version` (should be 18+)

### Routing Issues (404 on refresh)
- Ensure your server is configured to serve index.html for all routes
- Check the server configuration examples above

### Performance Issues
- Enable production mode
- Check bundle size: The build output shows chunk sizes
- Consider lazy loading for large components

## Support

For issues or questions:
1. Check the main README.md
2. Review the ATTRIBUTIONS.md for third-party dependencies
3. Check the guidelines in guidelines/Guidelines.md

## License

See LICENSE file for details.

