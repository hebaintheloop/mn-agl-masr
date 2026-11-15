import {describe,it,expect,vi} from 'vitest';
import {privateImagePath,issueImageUpload,eventImages,imagePreview} from '../supabase/functions/app-backend/images';
const base='https://project.supabase.co',owner='11111111-1111-4111-8111-111111111111',path=owner+'/22222222-2222-4222-8222-222222222222.jpg',asset=base+'/storage/v1/object/public/event-images/'+path;
describe('event image storage',()=>{
 it('accepts canonical private images and rejects foreign hosts, buckets, traversal and SVG',()=>{
  expect(privateImagePath(asset,base)).toBe(path);
  for(const url of [asset.replace('project.supabase.co','evil.example'),asset.replace('event-images','site-images'),asset.replace('.jpg','.svg'),base+'/storage/v1/object/public/event-images/'+owner+'/%2e%2e/site-images/image.jpg'])expect(privateImagePath(url,base)).toBeNull();
 });
 it('mints a non-overwriting upload in the authorized user folder, with the requested purpose only',async()=>{
  const signed=vi.fn().mockResolvedValue({data:{signedUrl:'https://signed.example'},error:null});
  const from=vi.fn().mockImplementation((bucket:string)=>({createSignedUploadUrl:signed,getPublicUrl:(p:string)=>({data:{publicUrl:base+'/storage/v1/object/public/'+bucket+'/'+p}})}));
  const db={storage:{from}};const result=await issueImageUpload(db,owner,'event');
  expect(from).toHaveBeenCalledWith('event-images');expect(signed.mock.calls[0][0]).toMatch(new RegExp('^'+owner+'/[0-9a-f-]+\\.jpg$'));expect(signed.mock.calls[0][1]).toEqual({upsert:false});expect(result.asset_url).toContain('/event-images/'+owner+'/');
  await expect(issueImageUpload(db,owner,'arbitrary-bucket')).rejects.toThrow();
 });
 it('signs private covers in a single batch and keeps external covers unchanged',async()=>{
  const createSignedUrls=vi.fn().mockResolvedValue({data:[{path,signedUrl:'https://signed.example/read'}],error:null});
  const db={storage:{from:()=>({createSignedUrls})}};
  const rows=await eventImages(db,[{id:'1',cover_url:asset},{id:'2',cover_url:'https://external.example/a.jpg'}],base);
  expect(createSignedUrls).toHaveBeenCalledWith([path],3600);expect(rows[0].cover_url).toBe('https://signed.example/read');expect(rows[1].cover_url).toBe('https://external.example/a.jpg');
 });
 it('falls back when a private image is missing instead of returning its canonical URL',async()=>{
  const db={storage:{from:()=>({createSignedUrls:async()=>({data:null,error:{message:'missing'}})})}};
  expect((await eventImages(db,[{cover_url:asset}],base))[0].cover_url).toBeNull();
 });
 it('refuses to mint preview links for arbitrary URLs',async()=>{await expect(imagePreview({},'https://external.example/a.jpg',base)).rejects.toThrow()});
});
