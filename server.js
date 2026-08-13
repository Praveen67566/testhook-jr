import app from './app.js';

import { env } from './configs/env.js';

import {
  checkDatabaseConnection,
  closeDatabase,
} from './configs/db.js';

let server;
let shuttingDown = false;

async function startServer() {
  try {
    await checkDatabaseConnection();

    server = app.listen(
      env.PORT,
      env.HOST,
      () => {
        console.log(
          `jr-leads-webhook listening on ${env.HOST}:${env.PORT}`
        );
      }
    );
  } catch {
    console.error(
      'Webhook startup failed: PostgreSQL is unavailable.'
    );

    process.exit(1);
  }
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(`${signal} received. Shutting down.`);

  const forceShutdownTimer = setTimeout(() => {
    console.error('Forced shutdown.');
    process.exit(1);
  }, 10000);

  forceShutdownTimer.unref();

  if (!server) {
    try {
      await closeDatabase();
    } finally {
      process.exit(0);
    }
  }

  server.close(async () => {
    try {
      await closeDatabase();

      console.log('Webhook stopped.');

      process.exit(0);
    } catch {
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

startServer();