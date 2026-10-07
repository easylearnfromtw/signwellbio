import { env } from './config.js';
import type { OAuthConnector } from './oauth.js';

async function tokenPost(url: string, params: URLSearchParams) {
  const r = await fetch(url, { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body: params });
  if (!r.ok) throw new Error(`OAUTH_TOKEN_HTTP_${r.status}`);
  return r.json() as Promise<any>;
}

export const googleConnector: OAuthConnector = {
  provider:'google',
  buildAuthorizationUrl(state) {
    const p = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID || '', redirect_uri: env.GOOGLE_REDIRECT_URI || '', response_type:'code', scope:'openid email profile', state, access_type:'offline', include_granted_scopes:'true', prompt:'consent' });
    return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
  },
  async exchangeCode(code) {
    const t = await tokenPost('https://oauth2.googleapis.com/token', new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID || '', client_secret: env.GOOGLE_CLIENT_SECRET || '', redirect_uri: env.GOOGLE_REDIRECT_URI || '', grant_type:'authorization_code' }));
    const info = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers:{ authorization:`Bearer ${t.access_token}` }}).then(r=>r.json()) as any;
    return { accessToken:t.access_token, refreshToken:t.refresh_token, expiresAt:new Date(Date.now()+Number(t.expires_in||3600)*1000).toISOString(), subject:String(info.sub), scopes:['openid','email','profile'] };
  }
};

export const youtubeConnector: OAuthConnector = {
  provider:'youtube',
  buildAuthorizationUrl(state) {
    const p = new URLSearchParams({ client_id: env.YOUTUBE_CLIENT_ID || env.GOOGLE_CLIENT_ID || '', redirect_uri: env.YOUTUBE_REDIRECT_URI || '', response_type:'code', scope:'https://www.googleapis.com/auth/youtube.readonly', state, access_type:'offline', include_granted_scopes:'true', prompt:'consent' });
    return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
  },
  async exchangeCode(code) {
    const t = await tokenPost('https://oauth2.googleapis.com/token', new URLSearchParams({ code, client_id: env.YOUTUBE_CLIENT_ID || env.GOOGLE_CLIENT_ID || '', client_secret: env.YOUTUBE_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET || '', redirect_uri: env.YOUTUBE_REDIRECT_URI || '', grant_type:'authorization_code' }));
    const ch = await fetch('https://www.googleapis.com/youtube/v3/channels?part=id&mine=true', { headers:{authorization:`Bearer ${t.access_token}`} }).then(r=>r.json()) as any;
    const subject = String(ch?.items?.[0]?.id || 'youtube-account');
    return { accessToken:t.access_token, refreshToken:t.refresh_token, expiresAt:new Date(Date.now()+Number(t.expires_in||3600)*1000).toISOString(), subject, scopes:['https://www.googleapis.com/auth/youtube.readonly'] };
  }
};

// Meta endpoints and permission names change over time. Keep connector scopes/config in environment
// and validate against the current official Meta app dashboard before enabling production traffic.
export function metaConnector(provider:'threads'|'instagram'): OAuthConnector {
  const isThreads = provider === 'threads';
  const clientId = isThreads ? env.THREADS_CLIENT_ID : env.INSTAGRAM_CLIENT_ID;
  const secret = isThreads ? env.THREADS_CLIENT_SECRET : env.INSTAGRAM_CLIENT_SECRET;
  const redirect = isThreads ? env.THREADS_REDIRECT_URI : env.INSTAGRAM_REDIRECT_URI;
  const authBase = isThreads ? 'https://threads.net/oauth/authorize' : 'https://www.instagram.com/oauth/authorize';
  const tokenUrl = isThreads ? 'https://graph.threads.net/oauth/access_token' : 'https://api.instagram.com/oauth/access_token';
  return {
    provider,
    buildAuthorizationUrl(state) {
      const scope = isThreads ? 'threads_basic,threads_read_replies,threads_manage_insights' : 'instagram_business_basic';
      const p = new URLSearchParams({ client_id:clientId||'', redirect_uri:redirect||'', response_type:'code', scope, state });
      return `${authBase}?${p}`;
    },
    async exchangeCode(code) {
      const t = await tokenPost(tokenUrl, new URLSearchParams({ client_id:clientId||'', client_secret:secret||'', grant_type:'authorization_code', redirect_uri:redirect||'', code }));
      return { accessToken:t.access_token, expiresAt:t.expires_in ? new Date(Date.now()+Number(t.expires_in)*1000).toISOString():undefined, subject:String(t.user_id || t.id || provider), scopes:isThreads?['threads_basic','threads_read_replies','threads_manage_insights']:['instagram_business_basic'] };
    }
  };
}
