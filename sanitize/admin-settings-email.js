import { rebrandLiveDomain, stripEmailTraces } from './_common.js';

export default function sanitize(doc) {
  rebrandLiveDomain(doc);
  stripEmailTraces(doc);
}
