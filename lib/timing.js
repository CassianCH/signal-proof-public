export const TSA_TIMELY_WINDOW_MS = 900000;
// Classification follows cryptographic verification; late proofs remain in the chain.
export function timestampTiming(receivedAt,genTime){
 const received=Date.parse(receivedAt),issued=Date.parse(genTime);
 if(!Number.isFinite(received)||!Number.isFinite(issued))throw Error('Invalid timestamp time');
 const delay_ms=issued-received;
 if(delay_ms < -300000)throw Error('TSA time outside policy');
 return {delay_ms,timing:delay_ms>TSA_TIMELY_WINDOW_MS?'late':'timely'};
}
