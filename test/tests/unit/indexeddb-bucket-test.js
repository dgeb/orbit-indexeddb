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

  test('is assigned a default `dbName` and `dbStoreName`', function(assert) {
    assert.equal(bucket.dbName, 'orbit-bucket', '`dbName` is `orbit-bucket` by default');
    assert.equal(bucket.dbStoreName, 'data', '`dbStoreName` is `data` by default');
  });

  test('can override `dbName` and `dbStoreName` via `namespace` and `storeName` settings', function(assert) {
    const custom  = new IndexedDBBucket({ namespace: 'orbit-settings', storeName: 'settings' });
    assert.equal(custom.dbName, 'orbit-settings', '`dbName` has been customized');
    assert.equal(custom.dbStoreName, 'settings', '`dbStoreName` has been customized');
  });

  test('#setItem sets a value, #getItem gets a value, #removeItem removes a value', function(assert) {
    assert.expect(3);

    let planet = {
      type: 'planet',
      id: 'jupiter',
      attributes: {
        name: 'Jupiter',
        classification: 'gas giant'
      }
    };

    return bucket.getItem('planet')
      .then(item => assert.equal(item, null, 'bucket does not contain item'))
      .then(() => bucket.setItem('planet', planet))
      .then(() => bucket.getItem('planet'))
      .then(item => assert.deepEqual(item, planet, 'bucket contains item'))
      .then(() => bucket.removeItem('planet'))
      .then(() => bucket.getItem('planet'))
      .then(item => assert.equal(item, null, 'bucket does not contain item'));
  });
});
