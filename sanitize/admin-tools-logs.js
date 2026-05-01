import { rebrandLiveDomain, redactIPs, stripEmailTraces } from './_common.js';

export default function sanitize(doc) {
  rebrandLiveDomain(doc);
  redactIPs(doc);
  stripEmailTraces(doc);
}
