import { rebrandLiveDomain, dummyStripeConnection, stripEmailTraces } from './_common.js';

export default function sanitize(doc) {
  rebrandLiveDomain(doc);
  dummyStripeConnection(doc);
  stripEmailTraces(doc);
}
