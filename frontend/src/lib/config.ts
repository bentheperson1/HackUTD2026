export const HOST = import.meta.env.VITE_SPACETIMEDB_HOST ?? 'wss://maincloud.spacetimedb.com';
export const DB_NAME = import.meta.env.VITE_SPACETIMEDB_DB_NAME ?? 'hackutd2026-h9s81';
/** Where this browser keeps its SpacetimeDB login token. Removing it = a brand-new account on next load. */
export const TOKEN_KEY = `${HOST}/${DB_NAME}/auth_token`;
