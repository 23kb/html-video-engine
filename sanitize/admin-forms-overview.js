import { rebrandDomain, rebrandLiveDomain, dummyFormsList, stripEmailTraces, stripEntryCounts } from './_common.js';

export default function sanitize(doc) {
  rebrandDomain(doc);
  rebrandLiveDomain(doc);
  dummyFormsList(doc);
  stripEmailTraces(doc);
  stripEntryCounts(doc);
}
