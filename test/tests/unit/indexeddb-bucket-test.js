import {
  verifyBucketContainsItem,
  verifyBucketDoesNotContainItem
} from 'tests/test-helper';
import Bucket from 'orbit/bucket';
import IndexedDBBucket from 'orbit-indexeddb/indexeddb-bucket';

let bucket;

///////////////////////////////////////////////////////////////////////////////

module('IndexedDBBucket', function(hooks) {
  hooks.beforeEach(() => {
    bucket = new IndexedDBBucket();
  });

  test('it exists', function(assert) {
    assert.ok(bucket);
  });

  test('its prototype chain is correct', function(assert) {
    assert.ok(bucket instanceof Bucket, 'instanceof Bucket');
  });

  test('is assigned a default dbName and dbStoreName', function(assert) {
    assert.equal(bucket.dbName, 'orbit-bucket', '`dbName` is `orbit-bucket` by default');
    assert.equal(bucket.dbStoreName, 'data', '`dbStoreName` is `data` by default');
  });

  test('#setItem', function(assert) {
    assert.expect(1);

    let planet = {
      type: 'planet',
      id: 'jupiter',
      attributes: {
        name: 'Jupiter',
        classification: 'gas giant'
      }
    };

    return bucket.setItem('planet', planet)
      .then(() => verifyBucketContainsItem(bucket, 'planet', planet));
  });

  test('#getItem', function(assert) {
    assert.expect(1);

    let planet = {
      type: 'planet',
      id: 'jupiter',
      attributes: {
        name: 'Jupiter',
        classification: 'gas giant'
      }
    };

    return bucket.setItem('planet', planet)
      .then(() => bucket.getItem('planet'))
      .then(found => assert.deepEqual(found, planet));
  });

  test('#removeItem', function(assert) {
    assert.expect(1);

    let planet = {
      type: 'planet',
      id: 'jupiter',
      attributes: {
        name: 'Jupiter',
        classification: 'gas giant'
      }
    };

    return bucket.setItem('planet', planet)
      .then(() => bucket.removeItem('planet'))
      .then(() => verifyBucketDoesNotContainItem(bucket, 'planet'));
  });
});
