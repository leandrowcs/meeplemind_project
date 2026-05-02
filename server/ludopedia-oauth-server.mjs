import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const parseEnvLine = (line) => {
  const trimmed = String(line || '').trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex <= 0) return null;

  const key = trimmed.slice(0, separatorIndex).trim();
  if (!key) return null;

  let value = trimmed.slice(separatorIndex + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
};

const loadEnvFile = (absolutePath) => {
  if (!fs.existsSync(absolutePath)) return;

  const content = fs.readFileSync(absolutePath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const parsed = parseEnvLine(line);
    if (!parsed) return;

    const { key, value } = parsed;
    if (process.env[key] !== undefined) return;
    process.env[key] = value;
  });
};

// Local dev convenience: load .env files when variables are not exported in shell.
loadEnvFile(path.resolve(process.cwd(), '.env'));
loadEnvFile(path.resolve(process.cwd(), '.env.local'));

const PORT = Number.parseInt(process.env.LUDOPEDIA_BACKEND_PORT || process.env.PORT || '8787', 10);
const TOKEN_EXCHANGE_URL = 'https://ludopedia.com.br/tokenrequest';
const AUTHORIZATION_URL = 'https://ludopedia.com.br/oauth';
const LUDOPEDIA_API_BASE = 'https://ludopedia.com.br/api/v1';

const APP_ID = String(process.env.LUDOPEDIA_APP_ID || '').trim();
const REDIRECT_URI = String(process.env.LUDOPEDIA_REDIRECT_URI || '').trim();
const STATIC_TOKEN = String(process.env.LUDOPEDIA_ACCESS_TOKEN || '').trim();
const SESSION_SECRET = String(process.env.LUDOPEDIA_SESSION_SECRET || '').trim() || 'meeplemind-dev-secret-change-me';
const COOKIE_SECURE = process.env.LUDOPEDIA_COOKIE_SECURE === '1' || process.env.NODE_ENV === 'production';
const ALLOWED_ORIGINS = String(process.env.MEEPLEMIND_ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const FRONTEND_RETURN_URL = String(process.env.LUDOPEDIA_FRONTEND_RETURN_URL || ALLOWED_ORIGINS[0] || 'http://localhost:5173').trim();

const TOKEN_COOKIE = 'meeplemind_ludo_token';
const STATE_COOKIE = 'meeplemind_ludo_state';
const RETURN_COOKIE = 'meeplemind_ludo_return';

const TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 14;
const STATE_COOKIE_MAX_AGE = 60 * 10;
const RETURN_COOKIE_MAX_AGE = 60 * 10;

const SEND_COOKIE_PATH = '/api/ludopedia';
const OAUTH_COOKIE_PATH = '/api/ludopedia/oauth';

const getMissingRequiredEnv = () => {
  const missing = [];
  if (!APP_ID) missing.push('LUDOPEDIA_APP_ID');
  if (!REDIRECT_URI) missing.push('LUDOPEDIA_REDIRECT_URI');
  return missing;
};

const isOAuthConfigured = () => getMissingRequiredEnv().length === 0;

// Catalog endpoints (jogos) work with either an OAuth session or the static app token.
const isCatalogAvailable = () => isOAuthConfigured() || Boolean(STATIC_TOKEN);

const toBase64Url = (value) => Buffer.from(value).toString('base64url');

const createSignature = (value) => {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
};

const createSignedValue = (value) => {
  const payload = toBase64Url(value);
  const signature = createSignature(payload);
  return `${payload}.${signature}`;
};

const readSignedValue = (rawValue) => {
  if (!rawValue || !rawValue.includes('.')) return null;

  const [payload, signature] = rawValue.split('.', 2);
  if (!payload || !signature) return null;

  const expected = createSignature(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    return Buffer.from(payload, 'base64url').toString('utf8');
  } catch {
    return null;
  }
};

const parseCookies = (cookieHeader) => {
  const parsed = {};
  if (!cookieHeader) return parsed;

  cookieHeader.split(';').forEach((segment) => {
    const [name, ...valueParts] = segment.trim().split('=');
    if (!name) return;
    parsed[name] = decodeURIComponent(valueParts.join('='));
  });

  return parsed;
};

const buildCookieHeader = (name, value, {
  maxAge,
  path,
  httpOnly = true,
} = {}) => {
  const pieces = [`${name}=${encodeURIComponent(value)}`];
  pieces.push(`Path=${path || SEND_COOKIE_PATH}`);
  pieces.push('SameSite=Lax');

  if (Number.isFinite(maxAge)) {
    pieces.push(`Max-Age=${maxAge}`);
  }

  if (COOKIE_SECURE) {
    pieces.push('Secure');
  }

  if (httpOnly) {
    pieces.push('HttpOnly');
  }

  return pieces.join('; ');
};

const clearCookieHeader = (name, path) => {
  return `${name}=; Path=${path || SEND_COOKIE_PATH}; Max-Age=0; SameSite=Lax${COOKIE_SECURE ? '; Secure' : ''}; HttpOnly`;
};

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  return ALLOWED_ORIGINS.includes(origin);
};

const applyCorsHeaders = (res, origin) => {
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Vary', 'Origin');
};

const sendJson = (res, statusCode, payload, origin, extraHeaders = {}) => {
  applyCorsHeaders(res, origin);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
};

const sendRedirect = (res, location, origin, extraHeaders = {}) => {
  applyCorsHeaders(res, origin);
  res.writeHead(302, {
    Location: location,
    ...extraHeaders,
  });
  res.end();
};

const safeFrontendReturnUrl = (candidate, fallbackUrl) => {
  if (!candidate) return fallbackUrl;

  try {
    const parsed = new URL(candidate);
    if (!ALLOWED_ORIGINS.includes(parsed.origin)) return fallbackUrl;
    return parsed.toString();
  } catch {
    return fallbackUrl;
  }
};

const fetchTokenWithForm = async (formPayload) => {
  const body = new URLSearchParams(formPayload).toString();
  const response = await fetch(TOKEN_EXCHANGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json, text/plain, */*',
    },
    body,
  });

  const responseText = await response.text();
  let data = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { raw: responseText };
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
};

const exchangeCodeForAccessToken = async (code) => {
  // Official flow: POST tokenrequest with only `code`.
  const result = await fetchTokenWithForm({ code });
  if (result.ok && result.data && result.data.access_token) {
    return result.data;
  }

  throw new Error(`token_exchange_failed:${result?.status || 'unknown'}`);
};

const proxyLudopediaRequest = async (res, origin, token, path, queryEntries) => {
  const upstreamUrl = new URL(`${LUDOPEDIA_API_BASE}${path}`);
  queryEntries.forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    upstreamUrl.searchParams.set(key, value);
  });

  const upstreamResponse = await fetch(upstreamUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json, text/plain, */*',
    },
  });

  const text = await upstreamResponse.text();
  applyCorsHeaders(res, origin);

  const headers = {
    'Content-Type': upstreamResponse.headers.get('content-type') || 'application/json; charset=utf-8',
  };

  if (upstreamResponse.status === 401) {
    headers['Set-Cookie'] = clearCookieHeader(TOKEN_COOKIE, SEND_COOKIE_PATH);
  }

  res.writeHead(upstreamResponse.status, headers);
  res.end(text);
};

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  if (!isOriginAllowed(origin)) {
    return sendJson(res, 403, { error: 'origin_not_allowed' }, origin);
  }

  if (req.method === 'OPTIONS') {
    applyCorsHeaders(res, origin);
    res.writeHead(204);
    res.end();
    return;
  }

  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || `localhost:${PORT}`}`);
  const { pathname, searchParams } = requestUrl;
  const cookies = parseCookies(req.headers.cookie);

  if (pathname === '/api/ludopedia/health' && req.method === 'GET') {
    return sendJson(res, 200, {
      ok: true,
      oauthConfigured: isOAuthConfigured(),
      missingRequiredEnv: getMissingRequiredEnv(),
      allowedOrigins: ALLOWED_ORIGINS,
      redirectUri: REDIRECT_URI,
    }, origin);
  }

  if (pathname === '/api/ludopedia/oauth/session' && req.method === 'GET') {
    const rawToken = cookies[TOKEN_COOKIE];
    const token = readSignedValue(rawToken);

    return sendJson(res, 200, {
      available: isCatalogAvailable(),
      oauthConfigured: isOAuthConfigured(),
      missingRequiredEnv: getMissingRequiredEnv(),
      connected: Boolean(token),
      provider: 'ludopedia',
    }, origin);
  }

  if (pathname === '/api/ludopedia/oauth/start' && req.method === 'GET') {
    if (!isOAuthConfigured()) {
      return sendJson(res, 503, {
        error: 'oauth_not_configured',
      }, origin);
    }

    const state = crypto.randomBytes(24).toString('hex');
    const signedState = createSignedValue(state);
    const referer = String(req.headers.referer || '').trim();
    const requestedReturn = String(searchParams.get('return_to') || '').trim();
    const fallbackReturn = safeFrontendReturnUrl(FRONTEND_RETURN_URL, ALLOWED_ORIGINS[0] || FRONTEND_RETURN_URL);
    const returnTo = safeFrontendReturnUrl(requestedReturn || referer, fallbackReturn);

    const authUrl = new URL(AUTHORIZATION_URL);
    authUrl.searchParams.set('app_id', APP_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('state', state);

    return sendRedirect(res, authUrl.toString(), origin, {
      'Set-Cookie': [
        buildCookieHeader(STATE_COOKIE, signedState, { maxAge: STATE_COOKIE_MAX_AGE, path: OAUTH_COOKIE_PATH }),
        buildCookieHeader(RETURN_COOKIE, createSignedValue(returnTo), { maxAge: RETURN_COOKIE_MAX_AGE, path: OAUTH_COOKIE_PATH }),
      ],
    });
  }

  if (pathname === '/api/ludopedia/oauth/callback' && req.method === 'GET') {
    const code = String(searchParams.get('code') || '').trim();
    const error = String(searchParams.get('error') || '').trim();
    const state = String(searchParams.get('state') || '').trim();

    const signedStoredState = cookies[STATE_COOKIE];
    const storedState = readSignedValue(signedStoredState);
    const storedReturnRaw = readSignedValue(cookies[RETURN_COOKIE]);
    const fallbackReturn = safeFrontendReturnUrl(FRONTEND_RETURN_URL, ALLOWED_ORIGINS[0] || FRONTEND_RETURN_URL);
    const returnTo = safeFrontendReturnUrl(storedReturnRaw, fallbackReturn);

    const cleanupCookies = [
      clearCookieHeader(STATE_COOKIE, OAUTH_COOKIE_PATH),
      clearCookieHeader(RETURN_COOKIE, OAUTH_COOKIE_PATH),
    ];

    const buildCallbackUrl = (status, reason = '') => {
      const callbackUrl = new URL(returnTo);
      callbackUrl.searchParams.set('ludopedia', status);
      if (reason) {
        callbackUrl.searchParams.set('reason', reason);
      }
      return callbackUrl.toString();
    };

    if (error) {
      return sendRedirect(res, buildCallbackUrl('error', 'provider_denied'), origin, {
        'Set-Cookie': cleanupCookies,
      });
    }

    if (!code) {
      return sendRedirect(res, buildCallbackUrl('error', 'missing_code'), origin, {
        'Set-Cookie': cleanupCookies,
      });
    }

    if (!storedState || (state && state !== storedState)) {
      return sendRedirect(res, buildCallbackUrl('error', 'state_mismatch'), origin, {
        'Set-Cookie': cleanupCookies,
      });
    }

    try {
      const tokenPayload = await exchangeCodeForAccessToken(code);
      const accessToken = String(tokenPayload.access_token || '').trim();

      if (!accessToken) {
        throw new Error('missing_access_token');
      }

      return sendRedirect(res, (() => {
        const successUrl = new URL(returnTo);
        successUrl.searchParams.set('ludopedia', 'connected');
        return successUrl.toString();
      })(), origin, {
        'Set-Cookie': [
          ...cleanupCookies,
          buildCookieHeader(TOKEN_COOKIE, createSignedValue(accessToken), {
            maxAge: TOKEN_COOKIE_MAX_AGE,
            path: SEND_COOKIE_PATH,
          }),
        ],
      });
    } catch {
      return sendRedirect(res, (() => {
        const errorUrl = new URL(returnTo);
        errorUrl.searchParams.set('ludopedia', 'error');
        errorUrl.searchParams.set('reason', 'token_exchange_failed');
        return errorUrl.toString();
      })(), origin, {
        'Set-Cookie': cleanupCookies,
      });
    }
  }

  if (pathname === '/api/ludopedia/oauth/logout' && req.method === 'POST') {
    return sendJson(res, 200, { ok: true }, origin, {
      'Set-Cookie': [
        clearCookieHeader(TOKEN_COOKIE, SEND_COOKIE_PATH),
        clearCookieHeader(STATE_COOKIE, OAUTH_COOKIE_PATH),
        clearCookieHeader(RETURN_COOKIE, OAUTH_COOKIE_PATH),
      ],
    });
  }

  if (pathname === '/api/ludopedia/jogos' && req.method === 'GET') {
    const token = readSignedValue(cookies[TOKEN_COOKIE]) || STATIC_TOKEN;
    if (!token) {
      return sendJson(res, 401, { error: 'not_authenticated' }, origin);
    }

    const allowedKeys = new Set(['search', 'tp_jogo', 'id_jogo_base', 'page', 'rows']);
    const queryEntries = Array.from(searchParams.entries()).filter(([key]) => allowedKeys.has(key));

    try {
      await proxyLudopediaRequest(res, origin, token, '/jogos', queryEntries);
      return;
    } catch {
      return sendJson(res, 502, { error: 'upstream_unavailable' }, origin);
    }
  }

  const gameDetailsMatch = pathname.match(/^\/api\/ludopedia\/jogos\/(\d+)$/);
  if (gameDetailsMatch && req.method === 'GET') {
    const token = readSignedValue(cookies[TOKEN_COOKIE]) || STATIC_TOKEN;
    if (!token) {
      return sendJson(res, 401, { error: 'not_authenticated' }, origin);
    }

    try {
      await proxyLudopediaRequest(res, origin, token, `/jogos/${gameDetailsMatch[1]}`, []);
      return;
    } catch {
      return sendJson(res, 502, { error: 'upstream_unavailable' }, origin);
    }
  }

  return sendJson(res, 404, { error: 'not_found' }, origin);
});

server.listen(PORT, () => {
  const configured = isOAuthConfigured() ? 'configured' : 'missing_env';
  console.log(`[Ludopedia OAuth] listening on http://localhost:${PORT} (${configured})`);
});
