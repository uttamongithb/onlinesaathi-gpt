// Polyfill `crypto` (globalThis.crypto.randomUUID) for Node < 20
if (typeof globalThis.crypto === 'undefined' || typeof globalThis.crypto.randomUUID === 'undefined') {
  try {
    const { webcrypto } = require('crypto');
    if (webcrypto && typeof webcrypto.randomUUID === 'function') {
      globalThis.crypto = webcrypto;
    } else if (typeof require('crypto').randomUUID === 'function') {
      globalThis.crypto = { randomUUID: require('crypto').randomUUID };
    }
  } catch (e) {
    // last resort: polyfill with uuid v4 using randomBytes
    const { randomBytes } = require('crypto');
    globalThis.crypto = {
      randomUUID: () => {
        const bytes = randomBytes(16);
        // set version bits (UUID v4)
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = bytes.toString('hex');
        return `${hex.substr(0,8)}-${hex.substr(8,4)}-${hex.substr(12,4)}-${hex.substr(16,4)}-${hex.substr(20,12)}`;
      }
    };
  }
}

// Polyfill `File` global for Node < 20 so `undici`'s webidl code doesn't crash
if (typeof File === 'undefined') {
  global.File = class File {
    constructor(chunks, name, options = {}) {
      this.name = name;
      this.lastModified = options?.lastModified || Date.now();
      this.type = options?.type || '';
      this.size = Array.isArray(chunks) ? chunks.reduce((s, c) => s + (c?.length || c?.byteLength || 0), 0) : 0;
    }
  };
}

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fs = require('fs');
require('module-alias')({ base: path.resolve(__dirname, '..') });
const cors = require('cors');
const axios = require('axios');
const express = require('express');
const passport = require('passport');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { logger } = require('@librechat/data-schemas');
const mongoSanitize = require('express-mongo-sanitize');
const {
  isEnabled,
  ErrorController,
  performStartupChecks,
  handleJsonParseError,
  initializeFileStorage,
} = require('@librechat/api');
const { connectDb, indexSync } = require('~/db');
const initializeOAuthReconnectManager = require('./services/initializeOAuthReconnectManager');
const createValidateImageRequest = require('./middleware/validateImageRequest');
const { jwtLogin, ldapLogin, passportLogin } = require('~/strategies');
const { updateInterfacePermissions } = require('~/models/interface');
const { checkMigrations } = require('./services/start/migration');
const initializeMCPs = require('./services/initializeMCPs');
const configureSocialLogins = require('./socialLogins');
const { getAppConfig } = require('./services/Config');
const staticCache = require('./utils/staticCache');
const noIndex = require('./middleware/noIndex');
const { seedDatabase } = require('~/models');
const routes = require('./routes');

const { PORT, HOST, ALLOW_SOCIAL_LOGIN, DISABLE_COMPRESSION, TRUST_PROXY } = process.env ?? {};

// Allow PORT=0 to be used for automatic free port assignment
const port = isNaN(Number(PORT)) ? 3080 : Number(PORT);
const host = HOST || 'localhost';
const trusted_proxy = Number(TRUST_PROXY) || 1; /* trust first proxy by default */

const app = express();

const startServer = async () => {
  if (typeof Bun !== 'undefined') {
    axios.defaults.headers.common['Accept-Encoding'] = 'gzip';
  }
  await connectDb();

  logger.info('✅ Connected to MongoDB');
  logger.info('🚀 Online Saathi Backend starting...');
  indexSync().catch((err) => {
    logger.error('[indexSync] Background sync failed:', err);
  });

  app.disable('x-powered-by');
  app.set('trust proxy', trusted_proxy);

  try {
    await seedDatabase();
  } catch (err) {
    logger.warn('[seedDatabase] Seed failed, continuing startup:', err.message || err);
  }
  const appConfig = await getAppConfig();
  initializeFileStorage(appConfig);
  await performStartupChecks(appConfig);
  await updateInterfacePermissions(appConfig);

  const indexPath = path.join(appConfig.paths.dist, 'index.html');
  let indexHTML = '';
  
  // In dev mode, index.html may not exist if frontend hasn't been built yet
  try {
    indexHTML = fs.readFileSync(indexPath, 'utf8');
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn(`index.html not found at ${indexPath} - frontend may not be built yet. Using minimal fallback.`);
      // Create a minimal HTML fallback for dev
      indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LibreChat - Development Mode</title>
</head>
<body>
  <div id="root"></div>
  <p>⚠️ Frontend not built. Run <code>npm run build:client</code> or start Vite dev server separately.</p>
</body>
</html>`;
    } else {
      throw err;
    }
  }

  // In order to provide support to serving the application in a sub-directory
  // We need to update the base href if the DOMAIN_CLIENT is specified and not the root path
  if (process.env.DOMAIN_CLIENT) {
    const clientUrl = new URL(process.env.DOMAIN_CLIENT);
    const baseHref = clientUrl.pathname.endsWith('/')
      ? clientUrl.pathname
      : `${clientUrl.pathname}/`;
    if (baseHref !== '/') {
      logger.info(`Setting base href to ${baseHref}`);
      indexHTML = indexHTML.replace(/base href="\/"/, `base href="${baseHref}"`);
    }
  }

  app.get('/health', (_req, res) => res.status(200).send('OK'));

  // Root route - shows beautiful success page in browser
  app.get('/api/status', (_req, res) => {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Online Saathi - Backend Status</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px 50px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 500px;
      animation: fadeIn 0.5s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .success-icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 auto 20px;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    .success-icon svg {
      width: 40px;
      height: 40px;
      fill: white;
    }
    h1 {
      color: #2d3748;
      font-size: 28px;
      margin-bottom: 10px;
    }
    .status {
      color: #38a169;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 25px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 25px;
    }
    .info-box {
      background: #f7fafc;
      padding: 15px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }
    .info-box label {
      display: block;
      color: #718096;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .info-box span {
      color: #2d3748;
      font-weight: 600;
      font-size: 16px;
    }
    .endpoints {
      background: #f7fafc;
      padding: 20px;
      border-radius: 10px;
      text-align: left;
    }
    .endpoints h3 {
      color: #4a5568;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .endpoints ul {
      list-style: none;
    }
    .endpoints li {
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    .endpoints li:last-child { border-bottom: none; }
    .endpoints code {
      background: #edf2f7;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: monospace;
      color: #667eea;
    }
    .footer {
      margin-top: 20px;
      color: #a0aec0;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">
      <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
    </div>
    <h1>🚀 Online Saathi</h1>
    <p class="status">✅ Backend Running Successfully!</p>
    
    <div class="info-grid">
      <div class="info-box">
        <label>Status</label>
        <span style="color: #38a169;">● Online</span>
      </div>
      <div class="info-box">
        <label>Uptime</label>
        <span>${hours}h ${minutes}m ${seconds}s</span>
      </div>
      <div class="info-box">
        <label>Port</label>
        <span>${port}</span>
      </div>
      <div class="info-box">
        <label>Environment</label>
        <span>${process.env.NODE_ENV || 'development'}</span>
      </div>
    </div>

    <div class="endpoints">
      <h3>📡 API Endpoints:</h3>
      <ul>
        <li><code>GET /health</code> - Health check</li>
        <li><code>GET /api/status</code> - This page</li>
        <li><code>POST /api/auth/login</code> - Login</li>
        <li><code>POST /api/auth/register</code> - Register</li>
        <li><code>GET /oauth/google</code> - Google Login</li>
        <li><code>GET /oauth/github</code> - GitHub Login</li>
        <li><code>GET /oauth/discord</code> - Discord Login</li>
      </ul>
    </div>

    <p class="footer">Online Saathi GPT • ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
    `);
  });

  /* Middleware */
  app.use(noIndex);
  app.use(express.json({ limit: '3mb' }));
  app.use(express.urlencoded({ extended: true, limit: '3mb' }));
  app.use(handleJsonParseError);

  /**
   * Express 5 Compatibility: Make req.query writable for mongoSanitize
   * In Express 5, req.query is read-only by default, but express-mongo-sanitize needs to modify it
   */
  app.use((req, _res, next) => {
    Object.defineProperty(req, 'query', {
      ...Object.getOwnPropertyDescriptor(req, 'query'),
      value: req.query,
      writable: true,
    });
    next();
  });

  app.use(mongoSanitize());

  // Configure CORS for separate frontend/backend deployment
  const corsAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];
  
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }
      // Allow all origins if CORS_ALLOWED_ORIGINS is not set (same-origin deployment)
      if (corsAllowedOrigins.length === 0) {
        return callback(null, true);
      }
      // Check if origin is in the allowed list
      if (corsAllowedOrigins.includes(origin) || corsAllowedOrigins.includes('*')) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true, // Allow cookies to be sent with requests
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  };

  app.use(cors(corsOptions));
  app.use(cookieParser());

  if (!isEnabled(DISABLE_COMPRESSION)) {
    app.use(compression());
  } else {
    console.warn('Response compression has been disabled via DISABLE_COMPRESSION.');
  }

  app.use(staticCache(appConfig.paths.dist));
  app.use(staticCache(appConfig.paths.fonts));
  app.use(staticCache(appConfig.paths.assets));

  if (!ALLOW_SOCIAL_LOGIN) {
    console.warn('Social logins are disabled. Set ALLOW_SOCIAL_LOGIN=true to enable them.');
  }

  /* OAUTH */
  app.use(passport.initialize());
  passport.use(jwtLogin());
  passport.use(passportLogin());

  /* LDAP Auth */
  if (process.env.LDAP_URL && process.env.LDAP_USER_SEARCH_BASE) {
    passport.use(ldapLogin);
  }

  if (isEnabled(ALLOW_SOCIAL_LOGIN)) {
    await configureSocialLogins(app);
  }

  app.use('/oauth', routes.oauth);
  /* API Endpoints */
  app.use('/api/auth', routes.auth);
  app.use('/api/actions', routes.actions);
  app.use('/api/keys', routes.keys);
  app.use('/api/user', routes.user);
  app.use('/api/search', routes.search);
  app.use('/api/messages', routes.messages);
  app.use('/api/convos', routes.convos);
  app.use('/api/presets', routes.presets);
  app.use('/api/prompts', routes.prompts);
  app.use('/api/categories', routes.categories);
  app.use('/api/endpoints', routes.endpoints);
  app.use('/api/balance', routes.balance);
  app.use('/api/models', routes.models);
  app.use('/api/config', routes.config);
  app.use('/api/assistants', routes.assistants);
  app.use('/api/files', await routes.files.initialize());
  app.use('/images/', createValidateImageRequest(appConfig.secureImageLinks), routes.staticRoute);
  app.use('/api/share', routes.share);
  app.use('/api/roles', routes.roles);
  app.use('/api/agents', routes.agents);
  app.use('/api/banner', routes.banner);
  app.use('/api/memories', routes.memories);
  app.use('/api/permissions', routes.accessPermissions);

  app.use('/api/tags', routes.tags);
  app.use('/api/mcp', routes.mcp);

  app.use(ErrorController);

  app.use((req, res) => {
    res.set({
      'Cache-Control': process.env.INDEX_CACHE_CONTROL || 'no-cache, no-store, must-revalidate',
      Pragma: process.env.INDEX_PRAGMA || 'no-cache',
      Expires: process.env.INDEX_EXPIRES || '0',
    });

    const lang = req.cookies.lang || req.headers['accept-language']?.split(',')[0] || 'en-US';
    const saneLang = lang.replace(/"/g, '&quot;');
    let updatedIndexHtml = indexHTML.replace(/lang="en-US"/g, `lang="${saneLang}"`);

    res.type('html');
    res.send(updatedIndexHtml);
  });

  app.listen(port, host, async (err) => {
    if (err) {
      logger.error('Failed to start server:', err);
      process.exit(1);
    }

    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║   🎉 Online Saathi Backend Run Successful!                ║');
    console.log('║                                                           ║');
    console.log(`║   🌐 Server URL: http://${host == '0.0.0.0' ? 'localhost' : host}:${port}                       ║`);
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('\n');

    if (host === '0.0.0.0') {
      logger.info(
        `Server listening on all interfaces at port ${port}. Use http://localhost:${port} to access it`,
      );
    } else {
      logger.info(`Server listening at http://${host == '0.0.0.0' ? 'localhost' : host}:${port}`);
    }

    await initializeMCPs();
    await initializeOAuthReconnectManager();
    await checkMigrations();
  });
};

startServer();

let messageCount = 0;
process.on('uncaughtException', (err) => {
  if (!err.message.includes('fetch failed')) {
    logger.error('There was an uncaught error:', err);
  }

  if (err.message && err.message?.toLowerCase()?.includes('abort')) {
    logger.warn('There was an uncatchable abort error.');
    return;
  }

  if (err.message.includes('GoogleGenerativeAI')) {
    logger.warn(
      '\n\n`GoogleGenerativeAI` errors cannot be caught due to an upstream issue, see: https://github.com/google-gemini/generative-ai-js/issues/303',
    );
    return;
  }

  if (err.message.includes('fetch failed')) {
    if (messageCount === 0) {
      logger.warn('Meilisearch error, search will be disabled');
      messageCount++;
    }

    return;
  }

  if (err.message.includes('OpenAIError') || err.message.includes('ChatCompletionMessage')) {
    logger.error(
      '\n\nAn Uncaught `OpenAIError` error may be due to your reverse-proxy setup or stream configuration, or a bug in the `openai` node package.',
    );
    return;
  }

  if (err.stack && err.stack.includes('@librechat/agents')) {
    logger.error(
      '\n\nAn error occurred in the agents system. The error has been logged and the app will continue running.',
      {
        message: err.message,
        stack: err.stack,
      },
    );
    return;
  }

  process.exit(1);
});

/** Export app for easier testing purposes */
module.exports = app;
