import { rebrandDomain, rebrandLiveDomain, stripEmailTraces, stripEntryCounts } from './_common.js';

export default function sanitize(doc) {
  rebrandDomain(doc);
  rebrandLiveDomain(doc);
  stripEmailTraces(doc);
  stripEntryCounts(doc);
}
