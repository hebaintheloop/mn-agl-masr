import {describe,it,expect} from 'vitest';
import {normalizeStudentCode} from '../supabase/functions/app-backend/student-code';
describe('code-only leader attendance',()=>{
 it('accepts seven digits and Arabic digit input',()=>{expect(normalizeStudentCode('2527646')).toBe('2527646');expect(normalizeStudentCode(' ٢٥٢٧٦٤٦ ')).toBe('2527646')});
 it('rejects dashed, missing, non-numeric and overlong codes',()=>{for(const value of ['25-27-646','252764','25276466','abc7646',null,undefined,2527646])expect(()=>normalizeStudentCode(value)).toThrow()});
});
