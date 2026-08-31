import assert from 'node:assert/strict';
import { once } from 'node:events';
import {
  after,
  before,
  test,
} from 'node:test';

Object.assign(process.env, {
  NODE_ENV: 'test',
  LEADS_DB_HOST: '127.0.0.1',
  LEADS_DB_PORT: '5432',
  LEADS_DB_NAME: 'admin_pages_test',
  LEADS_DB_USER: 'admin_pages_test',
  LEADS_DB_PASSWORD: 'test-password-long-enough',
  LEADS_ALLOWED_ORIGINS: 'https://example.test',
  LEADS_RATE_LIMIT_MAX: '100',
  LEADS_RATE_LIMIT_WINDOW_MS: '60000',
  TRUST_PROXY_HOPS: '0',
  LEADS_ADMIN_USERNAME: 'test-admin',
  LEADS_ADMIN_PASSWORD: 'test-admin-password',
});

const [{ default: app }, { pool }] = await Promise.all([
  import('../app.js'),
  import('../configs/db.js'),
]);

const originalPoolQuery = pool.query;
const authorization = `Basic ${Buffer.from(
  'test-admin:test-admin-password'
).toString('base64')}`;

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  pool.query = originalPoolQuery;

  if (server) {
    server.close();
    await once(server, 'close');
  }

  await pool.end();
});

function authenticatedRequest(
  pathname,
  accept = 'text/html'
) {
  return fetch(`${baseUrl}${pathname}`, {
    headers: {
      authorization,
      accept,
    },
  });
}

test('admin routes share one Basic Auth protection space', async () => {
  pool.query = async () => {
    throw new Error('The database should not be queried.');
  };

  for (const pathname of ['/leads', '/whatsapp']) {
    const response = await fetch(`${baseUrl}${pathname}`);

    assert.equal(response.status, 401);
    assert.equal(
      response.headers.get('www-authenticate'),
      'Basic realm="JR Compliance Admin"'
    );
  }
});

test('GET /leads renders escaped lead data and pagination', async () => {
  const queryValues = [];

  pool.query = async (query, values) => {
    const sql = String(query);

    if (sql.includes('COUNT(*)') && sql.includes('FROM leads')) {
      return { rows: [{ total: '25' }] };
    }

    if (sql.includes('FROM leads')) {
      queryValues.push(values);

      return {
        rows: [
          {
            id: '25',
            lead_type: 'corporate',
            name: '<script>alert("xss")</script>',
            email: 'person@example.test',
            phone: '+91 90000 00000',
            message: 'Please call me.',
            page_name: 'Corporate services',
            form_name: 'Contact form',
            source: 'https://example.test/corporate',
            responsible: null,
            stage: null,
            utm_source: 'search',
            utm_medium: null,
            utm_campaign: null,
            created_at: new Date('2026-08-31T08:00:00.000Z'),
          },
        ],
      };
    }

    throw new Error(`Unexpected query: ${sql}`);
  };

  const response = await authenticatedRequest(
    '/leads?page=2&limit=20'
  );
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get('content-type'),
    /^text\/html/
  );
  assert.match(html, /<title>Leads \| JR Compliance Admin<\/title>/);
  assert.match(html, /&lt;script&gt;alert\(&#34;xss&#34;\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert\("xss"\)<\/script>/);
  assert.match(html, /href="\/whatsapp"/);
  assert.match(html, /href="\/leads\?page=1&amp;limit=20"/);
  assert.match(html, /href="\/leads\?page=2&amp;limit=20&amp;format=json"/);
  assert.deepEqual(queryValues, [[20, 20]]);
});

test('GET /whatsapp renders metadata safely and an empty state', async () => {
  let eventRows = [
    {
      id: '9',
      event_info: 'Header CTA',
      page_name: 'Home',
      text: 'Chat with us',
      metadata: {
        campaign: '<script>unsafe()</script>',
      },
      event_time: new Date('2026-08-31T09:30:00.000Z'),
      check_with_nyife: false,
    },
  ];

  pool.query = async (query, values) => {
    const sql = String(query);

    if (sql.includes('COUNT(*)') && sql.includes('FROM events')) {
      return { rows: [{ total: String(eventRows.length) }] };
    }

    if (sql.includes('FROM events')) {
      assert.deepEqual(values, [20, 0]);
      return { rows: eventRows };
    }

    throw new Error(`Unexpected query: ${sql}`);
  };

  let response = await authenticatedRequest('/whatsapp');
  let html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /WhatsApp events/);
  assert.match(html, /Pending/);
  assert.match(html, /Full message/);
  assert.match(html, /&lt;script&gt;unsafe\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>unsafe\(\)<\/script>/);

  eventRows = [];
  response = await authenticatedRequest('/whatsapp');
  html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /No WhatsApp events found/);
});

test('JSON clients remain compatible and invalid pagination is normalized', async () => {
  const queryValues = [];

  pool.query = async (query, values) => {
    const sql = String(query);

    if (sql.includes('COUNT(*)') && sql.includes('FROM leads')) {
      return { rows: [{ total: '0' }] };
    }

    if (sql.includes('FROM leads')) {
      queryValues.push(values);
      return { rows: [] };
    }

    throw new Error(`Unexpected query: ${sql}`);
  };

  const response = await authenticatedRequest(
    '/leads?page=invalid&limit=500',
    'application/json'
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get('content-type'),
    /^application\/json/
  );
  assert.deepEqual(payload, {
    success: true,
    page: 1,
    limit: 100,
    count: 0,
    total: 0,
    leads: [],
  });
  assert.deepEqual(queryValues, [[100, 0]]);

  const noPreferenceResponse = await fetch(
    `${baseUrl}/leads`,
    {
      headers: {
        authorization,
      },
    }
  );

  assert.match(
    noPreferenceResponse.headers.get('content-type'),
    /^application\/json/
  );
  assert.equal(
    (await noPreferenceResponse.json()).success,
    true
  );

  const wildcardResponse = await authenticatedRequest(
    '/leads',
    'text/plain, */*;q=0.8'
  );

  assert.match(
    wildcardResponse.headers.get('content-type'),
    /^application\/json/
  );
  await wildcardResponse.json();
});

test('HTML requests beyond the last page redirect to the last page', async () => {
  pool.query = async (query) => {
    const sql = String(query);

    if (sql.includes('COUNT(*)') && sql.includes('FROM leads')) {
      return { rows: [{ total: '25' }] };
    }

    if (sql.includes('FROM leads')) {
      return { rows: [] };
    }

    throw new Error(`Unexpected query: ${sql}`);
  };

  const response = await fetch(
    `${baseUrl}/leads?page=999&limit=20`,
    {
      redirect: 'manual',
      headers: {
        authorization,
        accept: 'text/html',
      },
    }
  );

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get('location'),
    '/leads?page=2&limit=20'
  );
});

test('the admin stylesheet is served as a same-origin asset', async () => {
  const response = await fetch(
    `${baseUrl}/admin-assets/admin.css`
  );
  const stylesheet = await response.text();

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get('content-type'),
    /^text\/css/
  );
  assert.match(stylesheet, /\.data-table/);
});

test('existing POST webhook routes continue to return JSON', async () => {
  pool.query = async (query) => {
    const sql = String(query);

    if (sql.includes('INSERT INTO leads')) {
      return { rows: [{ id: '101' }] };
    }

    if (sql.includes('INSERT INTO events')) {
      return { rows: [{ id: '202' }] };
    }

    throw new Error(`Unexpected query: ${sql}`);
  };

  const requestOptions = {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://example.test',
    },
  };

  let response = await fetch(`${baseUrl}/corporate`, {
    ...requestOptions,
    body: JSON.stringify({
      name: 'Test Person',
      email: 'person@example.test',
      phone: '+91 90000 00000',
    }),
  });
  let payload = await response.json();

  assert.equal(response.status, 201);
  assert.deepEqual(payload, {
    success: true,
    id: '101',
    message: 'Lead received.',
  });

  response = await fetch(`${baseUrl}/whatsapp`, {
    ...requestOptions,
    body: JSON.stringify({
      event_info: 'Header CTA',
      page_name: 'Home',
      text: 'Chat with us',
    }),
  });
  payload = await response.json();

  assert.equal(response.status, 201);
  assert.deepEqual(payload, {
    success: true,
    id: '202',
    message: 'WhatsApp event received.',
  });
});
