import { rebrandLiveDomain, stripEmailTraces, redactIPs, dummyEntryDetail } from './_common.js';

export default function sanitize(doc) {
  rebrandLiveDomain(doc);
  stripEmailTraces(doc);
  redactIPs(doc);
  dummyEntryDetail(doc);
}
