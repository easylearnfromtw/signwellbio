import express from 'express';
import { env } from './config.js';
import { issueState, storeConnection, verifyState } from './oauth.js';
import { googleConnector, youtubeConnector, metaConnector } from './connectors.js';
import { rebuildProfile } from './profile.js';
import { eraseSubscriber } from './delete.js';
import { db } from './db.js';

const app = express();
app.use(express.json({limit:'256kb'}));
app.disable('x-powered-by');

// Replace this header stub with your real authenticated session middleware.
function subscriber(req:express.Request) {
  const id = String(req.header('x-signwell-subscriber-id') || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('AUTH_REQUIRED');
  return id;
}

const connectors = {
  google:googleConnector,
  youtube:youtubeConnector,
  threads:metaConnector('threads'),
  instagram:metaConnector('instagram')
} as const;

app.get('/health', (_req,res)=>res.json({ok:true,service:'signwell-subscriber360',version:'10.3.0'}));

app.get('/oauth/:provider/start', (req,res)=>{
  try {
    const subscriberId = subscriber(req);
    const connector = connectors[req.params.provider as keyof typeof connectors];
    if (!connector) return res.status(404).json({error:'unsupported_provider'});
    const state = issueState(subscriberId, connector.provider);
    return res.redirect(connector.buildAuthorizationUrl(state));
  } catch (e:any) { return res.status(401).json({error:e.message}); }
});

app.get('/oauth/:provider/callback', async (req,res)=>{
  try {
    const connector = connectors[req.params.provider as keyof typeof connectors];
    if (!connector) return res.status(404).send('unsupported provider');
    const state = verifyState(String(req.query.state||''));
    if (state.provider !== connector.provider) throw new Error('STATE_PROVIDER_MISMATCH');
    const token = await connector.exchangeCode(String(req.query.code||''));
    await storeConnection(state.subscriberId,connector,token);
    return res.redirect(`${env.PUBLIC_BASE_URL}/profile.html?connected=${connector.provider}`);
  } catch (e:any) { return res.status(400).send(`OAuth failed: ${e.message}`); }
});

app.get('/api/profile', async (req,res)=>{
  try {
    const subscriberId = subscriber(req);
    const [conn, vec, consent] = await Promise.all([
      db.from('oauth_connections').select('provider,status,scopes,created_at').eq('subscriber_id',subscriberId),
      db.from('interest_vectors').select('vector,evidence,updated_at,model_version').eq('subscriber_id',subscriberId).maybeSingle(),
      db.from('consents').select('purpose,granted,created_at,withdrawn_at').eq('subscriber_id',subscriberId).order('created_at',{ascending:false})
    ]);
    return res.json({connections:conn.data||[],interest:vec.data||null,consents:consent.data||[]});
  } catch(e:any){ return res.status(401).json({error:e.message}); }
});

app.post('/api/profile/rebuild', async (req,res)=>{
  try { const id=subscriber(req); return res.json({topics:await rebuildProfile(id)}); }
  catch(e:any){ return res.status(400).json({error:e.message}); }
});

app.delete('/api/privacy/me', async (req,res)=>{
  try { return res.json(await eraseSubscriber(subscriber(req))); }
  catch(e:any){ return res.status(400).json({error:e.message}); }
});

app.listen(env.PORT,()=>console.log(`SIGN WELL Subscriber360 listening on :${env.PORT}`));
