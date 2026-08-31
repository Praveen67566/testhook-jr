import basicAuth from 'express-basic-auth';

import { env } from '../configs/env.js';

/*
 * Keep one protection space for every admin page so a browser login
 * continues to work while navigating between leads and events.
 */
export const adminBasicAuth = basicAuth({
  authorizer: (username, password) => {
    const usernameMatches = basicAuth.safeCompare(
      username,
      env.LEADS_ADMIN_USERNAME
    );

    const passwordMatches = basicAuth.safeCompare(
      password,
      env.LEADS_ADMIN_PASSWORD
    );

    return usernameMatches && passwordMatches;
  },

  challenge: true,
  realm: 'JR Compliance Admin',

  unauthorizedResponse: {
    success: false,
    error: 'Unauthorized.',
  },
});
