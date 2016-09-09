import './support/orbit-setup';
import { on } from 'rsvp';
import './support/qunit-matchers';

on('error', function(reason) {
  console.error('rsvp error', reason);
});

import {
  serializeOps,
  serializeOp,
  op,
  successfulOperation,
  failedOperation
} from './support/operations';

import {
  verifyIndexedDBContainsRecord,
  verifyIndexedDBDoesNotContainRecord,
  verifyBucketContainsItem,
  verifyBucketDoesNotContainItem
} from './support/indexeddb';

import { planetsSchema } from './support/schemas';

import './support/rsvp';

export {
  serializeOps,
  serializeOp,
  op,
  successfulOperation,
  failedOperation,
  verifyIndexedDBContainsRecord,
  verifyIndexedDBDoesNotContainRecord,
  verifyBucketContainsItem,
  verifyBucketDoesNotContainItem,
  planetsSchema
};
