const serverless = require('serverless-http');
let handler;
let isInitializing = false;
let initPromise = null;

module.exports = async (req, res) => {
  try {
    // Prevent race conditions during initialization
    if (!handler) {
      if (!initPromise) {
        initPromise = (async () => {
          const { createApp } = require('./server/vercel-app');
          const app = await createApp();
          handler = serverless(app, {
            request: (request, event, context) => {
              // Pass Vercel-specific context
              request.vercel = { event, context };
            }
          });
        })();
      }
      await initPromise;
    }
    return handler(req, res);
  } catch (err) {
    console.error('Vercel function init error:', err);
    res.status(500).json({ error: 'Server initialization failed', message: err.message });
  }
};
