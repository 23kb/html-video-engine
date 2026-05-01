import { rebrandLiveDomain, redactLocalPaths, redactIPs, stripEmailTraces } from './_common.js';

export default function sanitize(doc) {
  rebrandLiveDomain(doc);
  redactLocalPaths(doc);
  redactIPs(doc);
  stripEmailTraces(doc);
}
