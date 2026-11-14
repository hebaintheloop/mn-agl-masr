import {request,chromium} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
const state=JSON.parse(readFileSync('.test-state.json'));const origin='http://localhost:3000';const ctx=await request.newContext({baseURL:origin,storageState:state.student.storage,extraHTTPHeaders:{Origin:origin}});
async function call(action,data={}){const r=await ctx.post('/api/action',{data:{action,...data}});return {status:r.status(),data:await r.json()};}
assert.equal((await call('rsvp',{event_id:state.eventId,excuse:'Section conflict — test',accommodation:'Step-free access — test'})).data.status,'accepted');
const me=await call('me');assert(!JSON.stringify(me.data).includes('ciphertext'));assert(!JSON.stringify(me.data).includes('national_id'));
assert.equal((await call('attendees',{event_id:state.eventId})).status,403);
assert.equal((await call('create-event',{title:'Unauthorized',description:'test',location:'test',start_at:new Date().toISOString(),end_at:new Date(Date.now()+60000).toISOString(),points:25})).status,403);
assert.equal((await call('scan',{code:'https://example.com'})).status,400);
const raw='MAM1.'+state.eventId+'.'+state.qrToken;await QRCode.toFile('/workspace/work/mam-test-qr.png',raw,{width:600,margin:4});
const anon=await request.newContext({baseURL:origin,extraHTTPHeaders:{Origin:origin}});assert.equal((await anon.post('/api/action',{data:{action:'scan',code:raw}})).status(),401);await anon.dispose();
const csrf=await ctx.post('/api/action',{headers:{Origin:'https://untrusted.example'},data:{action:'rsvp',event_id:state.eventId}});assert.equal(csrf.status(),403);
console.log('Registration auto-acceptance, identity omission, privilege checks, anonymous rejection, QR URL rejection and CSRF checks passed.');
await ctx.dispose();
