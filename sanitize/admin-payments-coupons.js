// Scaffold — current capture has no coupon rows. When coupons appear,
// extend with codes/usage redactors mirroring dummyEntriesList style.
import { rebrandLiveDomain } from './_common.js';

export default function sanitize(doc) {
  rebrandLiveDomain(doc);
}
