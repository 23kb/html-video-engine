import { rebrandLiveDomain, stripEmailTraces, dummyPaymentRow } from './_common.js';

export default function sanitize(doc) {
  rebrandLiveDomain(doc);
  stripEmailTraces(doc);
  dummyPaymentRow(doc);
}
