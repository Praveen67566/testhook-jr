const indiaDateFormatter = new Intl.DateTimeFormat(
  'en-IN',
  {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
    timeZoneName: 'short',
  }
);

function positiveInteger(value, fallback) {
  if (
    typeof value !== 'string' ||
    !/^\d+$/.test(value)
  ) {
    return fallback;
  }

  const parsedValue = Number(value);

  return Number.isSafeInteger(parsedValue) &&
    parsedValue > 0
    ? parsedValue
    : fallback;
}

export function parsePagination(query) {
  const page = positiveInteger(query.page, 1);
  const requestedLimit = positiveInteger(
    query.limit,
    20
  );

  return {
    page,
    limit: Math.min(requestedLimit, 100),
  };
}

export function shouldReturnAdminJson(req) {
  if (req.query.format === 'json') {
    return true;
  }

  if (req.query.format === 'html') {
    return false;
  }

  const acceptHeader = req.get('accept');

  /*
   * Preserve the former JSON response for curl and clients that do not
   * declare a preference. Normal browser navigation explicitly accepts
   * text/html and receives the dashboard.
   */
  if (
    !acceptHeader ||
    !acceptHeader.toLowerCase().includes('text/html')
  ) {
    return true;
  }

  return req.accepts(['html', 'json']) !== 'html';
}

export function createAdminPageUrl(
  pathname,
  page,
  limit,
  format
) {
  const parameters = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (format) {
    parameters.set('format', format);
  }

  return `${pathname}?${parameters.toString()}`;
}

export function createPagination({
  pathname,
  page,
  limit,
  total,
  count,
  format,
}) {
  const totalPages = Math.max(
    Math.ceil(total / limit),
    1
  );

  return {
    page,
    limit,
    total,
    totalPages,
    firstItem:
      count === 0 ? 0 : (page - 1) * limit + 1,
    lastItem:
      count === 0
        ? 0
        : (page - 1) * limit + count,
    previousUrl:
      page > 1
        ? createAdminPageUrl(
            pathname,
            page - 1,
            limit,
            format
          )
        : null,
    nextUrl:
      page < totalPages
        ? createAdminPageUrl(
            pathname,
            page + 1,
            limit,
            format
          )
        : null,
    jsonUrl: createAdminPageUrl(
      pathname,
      page,
      limit,
      'json'
    ),
    limitUrls: [20, 50, 100].map((value) => ({
      value,
      url: createAdminPageUrl(
        pathname,
        1,
        value,
        format
      ),
    })),
  };
}

export function formatAdminDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return indiaDateFormatter.format(date);
}

export function toIsoDate(value) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ''
    : date.toISOString();
}

export function formatMetadata(metadata) {
  try {
    return JSON.stringify(metadata ?? {}, null, 2);
  } catch {
    return 'Metadata could not be displayed.';
  }
}
