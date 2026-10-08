import * as asn1 from 'asn1js';
import * as pki from 'pkijs';
import {unhex, hex, b64, from64, encoder, digest} from './protocol.js';
const SHA256 = '2.16.840.1.101.3.4.2.1';
const TST = '1.2.840.113549.1.9.16.1.4';
function parse(bytes) {
  const result = asn1.fromBER(bytes);
  if (result.offset === -1 || result.offset !== bytes.byteLength) throw new Error('invalid ASN.1');
  return result.result;
}
function cert(pem) {
  return new pki.Certificate({schema: parse(from64(pem.replace(/-----[^-]+-----|\s/g, '')).buffer)});
}
export function createRequest(hash) {
  const random = crypto.getRandomValues(new Uint8Array(16));
  random[0] &= 0x7f; random[0] |= 1;
  const request = new pki.TimeStampReq({version: 1,
    messageImprint: new pki.MessageImprint({hashAlgorithm: new pki.AlgorithmIdentifier({algorithmId: SHA256, algorithmParams: new asn1.Null()}), hashedMessage: new asn1.OctetString({valueHex: unhex(hash).buffer})}),
    nonce: new asn1.Integer({valueHex: random.buffer}), certReq: true});
  return request.toSchema().toBER(false);
}
export async function verifyTimestamp(responseBytes, requestBytes, rootPem, preimage) {
  pki.setEngine('worker', crypto, new pki.CryptoEngine({name: 'worker', crypto, subtle: crypto.subtle}));
  const request = new pki.TimeStampReq({schema: parse(requestBytes)});
  const response = new pki.TimeStampResp({schema: parse(responseBytes)});
  if (![0, 1].includes(response.status.status) || !response.timeStampToken) throw new Error('TSA rejected');
  if (response.timeStampToken.contentType !== '1.2.840.113549.1.7.2') throw new Error('wrong CMS type');
  const signed = new pki.SignedData({schema: response.timeStampToken.content});
  if (signed.encapContentInfo.eContentType !== TST || !signed.encapContentInfo.eContent) throw new Error('wrong timestamp content');
  const info = new pki.TSTInfo({schema: parse(signed.encapContentInfo.eContent.getValue())});
  if (info.messageImprint.hashAlgorithm.algorithmId !== SHA256 ||
      hex(info.messageImprint.hashedMessage.getValue()) !== hex(request.messageImprint.hashedMessage.getValue()) ||
      !info.nonce || hex(info.nonce.valueBlock.valueHexView) !== hex(request.nonce.valueBlock.valueHexView)) throw new Error('TSA request mismatch');
  // Locate the CMS signer and require the critical, exclusive timestamping EKU.
  const sid = signed.signerInfos[0]?.sid;
  const signer = signed.certificates?.find(c => c instanceof pki.Certificate && sid instanceof pki.IssuerAndSerialNumber && c.issuer.isEqual(sid.issuer) && c.serialNumber.isEqual(sid.serialNumber));
  const eku = signer?.extensions?.find(e => e.extnID === '2.5.29.37');
  if (!eku?.critical || eku.parsedValue?.keyPurposes?.length !== 1 || eku.parsedValue.keyPurposes[0] !== '1.3.6.1.5.5.7.3.8') throw new Error('invalid TSA EKU');
  const root = cert(rootPem);
  const attr = signed.signerInfos[0].signedAttrs?.attributes.find(a => a.type === '1.2.840.113549.1.9.3');
  if (!attr || attr.values.length !== 1 || attr.values[0].valueBlock.toString() !== TST) throw new Error('wrong signed content type');
  const ok = await signed.verify({signer: 0, checkChain: true, trustedCerts: [root], checkDate: info.genTime, data: encoder.encode(preimage).buffer});
  if (!ok) throw new Error('TSA signature or chain invalid');
  return {gen_time: info.genTime.toISOString(), policy: info.policy, serial: hex(info.serialNumber.valueBlock.valueHexView), revocation_status: 'not_checked'};
}
export async function timestamp(preimage, env, fetcher = fetch) {
  if (!env.TSA_ROOT_PEM) throw new Error('missing trust anchor');
  const query = createRequest(await digest(preimage));
  const response = await fetcher(env.TSA_URL, {method: 'POST', headers: {'Content-Type': 'application/timestamp-query'}, body: query, signal: AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('TSA HTTP failure');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 65536) throw new Error('oversized TSA response');
  const verified = await verifyTimestamp(bytes, query, env.TSA_ROOT_PEM, preimage);
  return {status: 'verified', provider: 'FreeTSA', query_b64: b64(query), response_b64: b64(bytes), ...verified};
}
