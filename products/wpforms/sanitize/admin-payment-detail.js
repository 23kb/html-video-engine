import { rebrandLiveDomain, stripEmailTraces, dummyPaymentDetail } from './_common.js';

export default function sanitize(doc) {
  rebrandLiveDomain(doc);
  stripEmailTraces(doc);
  dummyPaymentDetail(doc);
}
