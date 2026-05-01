import { rebrandLiveDomain, dummyProviderAccounts, stripEmailTraces } from './_common.js';

export default function sanitize(doc) {
  rebrandLiveDomain(doc);
  dummyProviderAccounts(doc);
  stripEmailTraces(doc);
}
