import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const app=express(), dir=path.dirname(fileURLToPath(import.meta.url));
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'20kb'}));
app.use(express.static(path.join(dir,'public')));
app.use('/api/',rateLimit({windowMs:60000,limit:30,standardHeaders:true,legacyHeaders:false}));
const sessions=new Map();
const secret=process.env.SESSION_SECRET || 'CHANGE_THIS_FOR_LOCAL_TEST_ONLY';
const hash=(s)=>crypto.createHash('sha256').update(s).digest('hex');
const token=()=>crypto.randomBytes(32).toString('hex');
const emailOK=(s)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const sendError=(res,msg,status=400)=>res.status(status).json({error:msg});
function requireAuth(req,res,next){
 const h=req.headers.authorization||'', t=h.startsWith('Bearer ')?h.slice(7):'';
 const s=sessions.get(t);
 if(!s || s.expires<Date.now()){sessions.delete(t);return sendError(res,'Silakan login dahulu.',401)}
 req.user=s.email;next();
}
app.get('/api/health',(_q,res)=>res.json({ok:true,app:'RAF PRO'}));
// Lightweight starter auth: users are in memory and reset when hosting restarts.
// For persistent production accounts, connect Supabase Auth (see README).
const users=new Map();
app.post('/api/register',(req,res)=>{
 const email=String(req.body?.email||'').trim().toLowerCase(), password=String(req.body?.password||'');
 if(!emailOK(email))return sendError(res,'Email tidak valid.');
 if(password.length<8)return sendError(res,'Password minimal 8 karakter.');
 if(users.has(email))return sendError(res,'Email sudah terdaftar.');
 users.set(email,{salt:crypto.randomBytes(16).toString('hex'),pass:''});
 const u=users.get(email);u.pass=crypto.scryptSync(password,u.salt,64).toString('hex');
 res.json({ok:true,message:'Akun dibuat. Silakan login.'});
});
app.post('/api/login',(req,res)=>{
 const email=String(req.body?.email||'').trim().toLowerCase(), password=String(req.body?.password||'');
 const u=users.get(email);
 if(!u || crypto.scryptSync(password,u.salt,64).toString('hex')!==u.pass)return sendError(res,'Email atau password salah.',401);
 const t=token();sessions.set(t,{email,expires:Date.now()+7*24*60*60*1000});
 res.json({token:t,email});
});
app.post('/api/logout',requireAuth,(req,res)=>{
 const t=req.headers.authorization.slice(7);sessions.delete(t);res.json({ok:true});
});
app.post('/api/ai',requireAuth,async(req,res)=>{
 try{
  const message=String(req.body?.message||'').trim();
  if(!message||message.length>5000)return sendError(res,'Pesan wajib diisi (maksimal 5000 karakter).');
  if(!process.env.GROQ_API_KEY)return sendError(res,'Isi GROQ_API_KEY di Environment Variables hosting.',503);
  const model=process.env.GROQ_MODEL||'llama-3.3-70b-versatile';
  const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.GROQ_API_KEY}`},body:JSON.stringify({model,messages:[{role:'user',content:message}],temperature:0.7,max_tokens:1024}),signal:AbortSignal.timeout(45000)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){console.error('Groq status',r.status,d?.error?.message||'');return sendError(res,'Groq gagal. Periksa API key, kuota, dan model.',502)}
  const reply=d?.choices?.[0]?.message?.content?.trim();
  if(!reply)return sendError(res,'Respons Groq kosong.',502);
  res.json({reply});
 }catch(e){console.error(e.message);sendError(res,'Kesalahan server.',500)}
});
app.post('/api/tiktok',requireAuth,async(req,res)=>{
 try{
  const videoUrl=String(req.body?.url||'').trim();let parsed;
  try{parsed=new URL(videoUrl)}catch{return sendError(res,'URL tidak valid.')}
  const host=parsed.hostname.toLowerCase();
  if(!(host==='tiktok.com'||host.endsWith('.tiktok.com')))return sendError(res,'Masukkan link TikTok yang valid.');
  const api=process.env.SOCIALKIT_API_URL,key=process.env.SOCIALKIT_API_KEY;
  if(!api||!key)return sendError(res,'Isi SOCIALKIT_API_URL dan SOCIALKIT_API_KEY di Environment Variables.',503);
  const hn=process.env.SOCIALKIT_AUTH_HEADER||'Authorization',prefix=process.env.SOCIALKIT_AUTH_PREFIX??'Bearer',field=process.env.SOCIALKIT_URL_FIELD||'url';
  const r=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json',[hn]:prefix?`${prefix} ${key}`:key},body:JSON.stringify({[field]:videoUrl}),signal:AbortSignal.timeout(25000)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){console.error('SocialKit status',r.status);return sendError(res,'SocialKit gagal. Cocokkan endpoint, header, parameter dan kuota dengan dokumentasi.',502)}
  const values=[d?.downloadUrl,d?.download_url,d?.url,d?.data?.downloadUrl,d?.data?.download_url,d?.data?.url,d?.video?.url,d?.data?.video?.url,d?.data?.play,d?.play];
  const downloadUrl=values.find(v=>typeof v==='string'&&/^https?:\/\//i.test(v));
  if(!downloadUrl)return sendError(res,'Format respons SocialKit berbeda. Perlu sesuaikan server.js dengan dokumentasi akun.',502);
  res.json({downloadUrl});
 }catch(e){console.error(e.message);sendError(res,'Permintaan gagal atau API timeout.',502)}
});
app.get('*',(_q,res)=>res.sendFile(path.join(dir,'public','index.html')));
app.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('RAF PRO running'));
