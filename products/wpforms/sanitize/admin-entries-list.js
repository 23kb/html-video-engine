import { rebrandLiveDomain, stripEmailTraces, redactIPs, dummyEntriesList } from './_common.js';

export default function sanitize(doc) {
  rebrandLiveDomain(doc);
  stripEmailTraces(doc);
  redactIPs(doc);
  // Place demo content last so it isn't clobbered by the blanket email strip.
  dummyEntriesList(doc);
}
