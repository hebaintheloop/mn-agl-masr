import {describe,it,expect} from 'vitest';
import {cairoLocalToISO} from '../lib/cairo-time';
describe('Cairo event scheduling',()=>{
 it('uses Cairo winter time even on a device abroad',()=>{expect(cairoLocalToISO('2026-12-05T10:00')).toBe('2026-12-05T08:00:00.000Z')});
 it('uses Cairo summer time',()=>{expect(cairoLocalToISO('2026-07-05T10:00')).toBe('2026-07-05T07:00:00.000Z')});
 it('rejects invalid dates',()=>{expect(()=>cairoLocalToISO('2026-02-30T10:00')).toThrow();expect(()=>cairoLocalToISO('bad')).toThrow()});
 it('rejects skipped and ambiguous DST times',()=>{expect(()=>cairoLocalToISO('2026-04-24T00:30')).toThrow();expect(()=>cairoLocalToISO('2026-10-29T23:30')).toThrow()});
});
