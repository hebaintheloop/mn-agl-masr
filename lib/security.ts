import {createCipheriv,createHash,randomBytes} from 'node:crypto';
export const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function encryptIdentity(value:string){const key=Buffer.from(process.env.NATIONAL_ID_ENCRYPTION_KEY!,'base64url');const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,iv);const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url');}
export const recoveryCode=()=>randomBytes(24).toString('base64url');
