import {test} from 'node:test';
import assert from 'node:assert/strict';
import {timestampTiming,TSA_TIMELY_WINDOW_MS} from '../lib/timing.js';
const received='2026-01-01T00:00:00.000Z';
const issued=delta=>new Date(Date.parse(received)+delta).toISOString();
test('Timeliness boundary is inclusive; late evidence remains classifiable',()=>{
 assert.equal(TSA_TIMELY_WINDOW_MS,900000);
 for(const delay of [-300000,0,899999,900000])assert.deepEqual(timestampTiming(received,issued(delay)),{delay_ms:delay,timing:'timely'});
 for(const delay of [900001,86400000])assert.deepEqual(timestampTiming(received,issued(delay)),{delay_ms:delay,timing:'late'});
 assert.throws(()=>timestampTiming(received,issued(-300001)));
 assert.throws(()=>timestampTiming('invalid',issued(0)));
 assert.throws(()=>timestampTiming(received,'invalid'));
});
