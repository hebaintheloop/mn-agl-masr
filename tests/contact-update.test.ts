import { describe, it, expect } from 'vitest';
import { parseContactUpdate } from '../supabase/functions/app-backend/contact';
describe('contact update boundary', () => {
  it('accepts only contact details and trims input', () => {
    expect(parseContactUpdate({action:'profile',phone:' 01012345678 ',email:' person@example.org '})).toEqual({phone:'01012345678',email:'person@example.org'});
  });
  it('allows an empty contact email without changing login credentials', () => {
    expect(parseContactUpdate({action:'profile',phone:'01012345678',email:''}).email).toBeNull();
  });
  for(const field of ['national_id','ciphertext','student_code','full_name','role','user_id','password']) {
    it(`rejects attempts to update ${field}`, () => {
      expect(()=>parseContactUpdate({action:'profile',phone:'01012345678',[field]:'replacement'})).toThrow('Only phone number and email');
    });
  }
  it('rejects malformed contact details', () => {
    expect(()=>parseContactUpdate({action:'profile',phone:'123',email:''})).toThrow();
    expect(()=>parseContactUpdate({action:'profile',phone:'01012345678',email:'not-an-email'})).toThrow();
  });
});
