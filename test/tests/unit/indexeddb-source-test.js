import {
  verifyIndexedDBContainsRecord,
  verifyIndexedDBDoesNotContainRecord
} from 'tests/test-helper';
import Source from 'orbit/source';
import Schema from 'orbit/schema';
import IndexedDB from 'orbit-indexeddb/indexeddb-source';
import Transform from 'orbit/transform';
import {
  addRecord,
  replaceRecord,
  removeRecord,
  replaceKey,
  replaceAttribute,
  addToHasMany,
  removeFromHasMany,
  replaceHasMany,
  replaceHasOne
} from 'orbit/transform/operators';
import qb from 'orbit/query/builder';

let schema, source;

///////////////////////////////////////////////////////////////////////////////

module('IndexedDBSource', {
  setup() {
    schema = new Schema({
      models: {
        planet: {},
        moon: {}
      }
    });

    source = new IndexedDB({ schema });
  },

  teardown() {
    schema = source = null;
  }
});

test('it exists', function(assert) {
  assert.ok(source);
});

test('its prototype chain is correct', function(assert) {
  assert.ok(source instanceof Source, 'instanceof Source');
});

test('implements Pushable', function(assert) {
  assert.ok(source._pushable, 'implements Pushable');
  assert.ok(typeof source.push === 'function', 'has `push` method');
});

test('implements Pullable', function(assert) {
  assert.ok(source._pullable, 'implements Pullable');
  assert.ok(typeof source.pull === 'function', 'has `pull` method');
});

test('implements Syncable', function(assert) {
  assert.ok(source._syncable, 'implements Pickable');
  assert.ok(typeof source.sync === 'function', 'has `sync` method');
});

test('is assigned a default dbName', function(assert) {
  assert.equal(source.dbName, 'orbit', '`dbName` is `orbit` by default');
});

test('#push - addRecord', function(assert) {
  assert.expect(1);

  let planet = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    }
  });

  return source.push(Transform.from(addRecord(planet)))
    .then(() => verifyIndexedDBContainsRecord(source, planet));
});

test('#push - replaceRecord', function(assert) {
  assert.expect(1);

  let original = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    }
  });

  let revised = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant',
      revised: true
    }
  });

  return source.push(Transform.from(addRecord(original)))
    .then(() => source.push(Transform.from(replaceRecord(revised))))
    .then(() => verifyIndexedDBContainsRecord(source, revised));
});

test('#push - removeRecord', function(assert) {
  assert.expect(1);

  let planet = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    }
  });

  return source.push(Transform.from(addRecord(planet)))
    .then(() => source.push(Transform.from(removeRecord(planet))))
    .then(() => verifyIndexedDBDoesNotContainRecord(source, planet));
});

test('#push - replaceKey', function(assert) {
  assert.expect(1);

  let original = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    }
  });

  let revised = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    },
    keys: {
      remoteId: '123'
    }
  });

  return source.push(Transform.from(addRecord(original)))
    .then(() => source.push(Transform.from(replaceKey(original, 'remoteId', '123'))))
    .then(() => verifyIndexedDBContainsRecord(source, revised));
});

test('#push - replaceAttribute', function(assert) {
  assert.expect(1);

  let original = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    }
  });

  let revised = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant',
      order: 5
    }
  });

  return source.push(Transform.from(addRecord(original)))
    .then(() => source.push(Transform.from(replaceAttribute(original, 'order', 5))))
    .then(() => verifyIndexedDBContainsRecord(source, revised));
});

test('#push - addToHasMany', function(assert) {
  assert.expect(1);

  let original = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    },
    relationships: {
      moons: {
        data: {}
      }
    }
  });

  let revised = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    },
    relationships: {
      moons: {
        data: {
          'moon:moon1': true
        }
      }
    }
  });

  return source.push(Transform.from(addRecord(original)))
    .then(() => source.push(Transform.from(addToHasMany(original, 'moons', { type: 'moon', id: 'moon1' }))))
    .then(() => verifyIndexedDBContainsRecord(source, revised));
});

test('#push - removeFromHasMany', function(assert) {
  assert.expect(1);

  let original = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    },
    relationships: {
      moons: {
        data: {
          'moon:moon1': true,
          'moon:moon2': true
        }
      }
    }
  });

  let revised = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    },
    relationships: {
      moons: {
        data: {
          'moon:moon1': true
        }
      }
    }
  });

  return source.push(Transform.from(addRecord(original)))
    .then(() => source.push(Transform.from(removeFromHasMany(original, 'moons', { type: 'moon', id: 'moon2' }))))
    .then(() => verifyIndexedDBContainsRecord(source, revised));
});

test('#push - replaceHasMany', function(assert) {
  assert.expect(1);

  let original = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    },
    relationships: {
      moons: {
        data: {
          'moon:moon1': true
        }
      }
    }
  });

  let revised = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    },
    relationships: {
      moons: {
        data: {
          'moon:moon2': true,
          'moon:moon3': true
        }
      }
    }
  });

  return source.push(Transform.from(addRecord(original)))
    .then(() => source.push(Transform.from(replaceHasMany(original, 'moons', [{ type: 'moon', id: 'moon2' }, { type: 'moon', id: 'moon3' }]))))
    .then(() => verifyIndexedDBContainsRecord(source, revised));
});

test('#push - replaceHasOne - record', function(assert) {
  assert.expect(1);

  let original = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    },
    relationships: {
      solarSystem: {
        data: null
      }
    }
  });

  let revised = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    },
    relationships: {
      solarSystem: {
        data: 'solarSystem:ss1'
      }
    }
  });

  return source.push(Transform.from(addRecord(original)))
    .then(() => source.push(Transform.from(replaceHasOne(original, 'solarSystem', { type: 'solarSystem', id: 'ss1' }))))
    .then(() => verifyIndexedDBContainsRecord(source, revised));
});

test('#push - replaceHasOne - null', function(assert) {
  assert.expect(1);

  let original = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    },
    relationships: {
      solarSystem: {
        data: 'solarSystem:ss1'
      }
    }
  });

  let revised = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    },
    relationships: {
      solarSystem: {
        data: null
      }
    }
  });

  return source.push(Transform.from(addRecord(original)))
    .then(() => source.push(Transform.from(replaceHasOne(original, 'solarSystem', null))))
    .then(() => verifyIndexedDBContainsRecord(source, revised));
});

test('#pull - all records', function(assert) {
  assert.expect(2);

  let earth = schema.normalize({
    type: 'planet',
    id: 'earth',
    attributes: {
      name: 'Earth',
      classification: 'terrestrial'
    }
  });

  let jupiter = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    }
  });

  let io = schema.normalize({
    type: 'moon',
    id: 'io',
    attributes: {
      name: 'Io'
    }
  });

  return source.push(Transform.from([
    addRecord(earth),
    addRecord(jupiter),
    addRecord(io)
  ]))
    .then(() => source.pull(qb.records()))
    .then(transforms => {
      assert.equal(transforms.length, 1, 'one transform returned');
      assert.deepEqual(
        transforms[0].operations.map(o => o.op),
        ['addRecord', 'addRecord', 'addRecord'],
        'operations match expectations'
      );
    });
});

test('#pull - records of one type', function(assert) {
  assert.expect(2);

  let earth = schema.normalize({
    type: 'planet',
    id: 'earth',
    attributes: {
      name: 'Earth',
      classification: 'terrestrial'
    }
  });

  let jupiter = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    }
  });

  let io = schema.normalize({
    type: 'moon',
    id: 'io',
    attributes: {
      name: 'Io'
    }
  });

  return source.push(Transform.from([
    addRecord(earth),
    addRecord(jupiter),
    addRecord(io)
  ]))
    .then(() => source.pull(qb.records('planet')))
    .then(transforms => {
      assert.equal(transforms.length, 1, 'one transform returned');
      assert.deepEqual(
        transforms[0].operations.map(o => o.op),
        ['addRecord', 'addRecord'],
        'operations match expectations'
      );
    });
});

test('#pull - a specific record', function(assert) {
  assert.expect(2);

  let earth = schema.normalize({
    type: 'planet',
    id: 'earth',
    attributes: {
      name: 'Earth',
      classification: 'terrestrial'
    }
  });

  let jupiter = schema.normalize({
    type: 'planet',
    id: 'jupiter',
    attributes: {
      name: 'Jupiter',
      classification: 'gas giant'
    }
  });

  let io = schema.normalize({
    type: 'moon',
    id: 'io',
    attributes: {
      name: 'Io'
    }
  });

  return source.clearRecords('planet')
    .then(() => source.clearRecords('moon'))
    .then(() => {
      return source.push(Transform.from([
        addRecord(earth),
        addRecord(jupiter),
        addRecord(io)
      ]));
    })
    .then(() => source.pull(qb.record(jupiter)))
    .then(transforms => {
      assert.equal(transforms.length, 1, 'one transform returned');
      assert.deepEqual(
        transforms[0].operations.map(o => o.op),
        ['addRecord'],
        'operations match expectations'
      );
    });
});
