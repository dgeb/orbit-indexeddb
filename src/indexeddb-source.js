/* eslint-disable valid-jsdoc */
import Orbit from 'orbit';
import Source from 'orbit/source';
import Pullable from 'orbit/interfaces/pullable';
import Pushable from 'orbit/interfaces/pushable';
import Syncable from 'orbit/interfaces/syncable';
import { assert } from 'orbit/lib/assert';
import TransformOperators from './lib/transform-operators';
import { QueryOperators } from './lib/queries';

var supportsIndexedDB = function() {
  try {
    return 'indexedDB' in self && self['indexedDB'] !== null;
  } catch (e) {
    return false;
  }
};

/**
 * Source for storing data in IndexedDB.
 *
 * @class IndexedDBSource
 * @extends Source
 */
export default class IndexedDBSource extends Source {
  /**
   * Create a new IndexedDBSource.
   *
   * @constructor
   * @param {Object}  [options]
   * @param {Schema}  [options.schema]    Schema for source.
   * @param {String}  [options.name]      Optional. Name for source. Defaults to 'indexedDB'.
   * @param {String}  [options.dbName]    Optional. Name of the IndexedDB database. Defaults to 'orbit'.
   * @param {Integer} [options.dbVersion] Optional. The version to open the IndexedDB database with. IndexedDB's default verions is 1.
   */
  constructor(options = {}) {
    assert('IndexedDBSource\'s `schema` must be specified in `options.schema` constructor argument', options.schema);
    assert('Your browser does not support IndexedDB!', supportsIndexedDB());

    super(options);

    this.name       = options.name || 'indexedDB';
    this.dbName    = options.dbName || 'orbit';
    this.dbVersion = options.dbVersion;
  }

  openDB() {
    return new Orbit.Promise((resolve, reject) => {
      if (this._db) {
        resolve(this._db);
      } else {
        let request = self.indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = (/* event */) => {
          console.error('error opening indexedDB', this.dbName);
          reject(request.errorCode);
        };

        request.onsuccess = (/* event */) => {
          // console.log('success opening indexedDB', this.dbName);
          const db = this._db = request.result;
          resolve(db);
        };

        request.onupgradeneeded = (event) => {
          // console.log('indexedDB upgrade needed');
          const db = this._db = event.target.result;
          // TODO - conditionally call migrateDB
          this.createDB(db);
        };
      }
    });
  }

  createDB(db) {
    Object.keys(this.schema.models).forEach(model => {
      db.createObjectStore(model, { keyPath: 'id' });
      // TODO - create indices
    });
  }

  deleteDB() {
    return new Orbit.Promise((resolve, reject) => {
      let request = self.indexedDB.deleteDatabase(this.dbName);

      request.onerror = (/* event */) => {
        console.error('error deleting indexedDB', this.dbName);
        reject(request.errorCode);
      };

      request.onsuccess = (/* event */) => {
        // console.log('success deleting indexedDB', this.dbName);
        this._db = null;
        resolve();
      };
    });
  }

  // TODO
  // migrateDB(db) {
  //
  // }

  getRecord(record) {
    return new Orbit.Promise((resolve, reject) => {
      const transaction = this._db.transaction([record.type]);
      const objectStore = transaction.objectStore(record.type);
      const request = objectStore.get(record.id);

      request.onerror = function(/* event */) {
        console.error('error - getRecord', request.errorCode);
        reject(request.errorCode);
      };

      request.onsuccess = function(/* event */) {
        // console.log('success - getRecord', request.result);
        resolve(request.result);
      };
    });
  }

  getRecords(type) {
    return new Orbit.Promise((resolve, reject) => {
      const transaction = this._db.transaction([type]);
      const objectStore = transaction.objectStore(type);
      const request = objectStore.openCursor();
      const records = [];

      request.onerror = function(/* event */) {
        console.error('error - getRecords', request.errorCode);
        reject(request.errorCode);
      };

      request.onsuccess = function(event) {
        // console.log('success - getRecords', request.result);
        const cursor = event.target.result;
        if (cursor) {
          records.push(cursor.value);
          cursor.continue();
        } else {
          resolve(records);
        }
      };
    });
  }

  get availableTypes() {
    const objectStoreNames = this._db.objectStoreNames;
    const types = [];

    for (let i = 0; i < objectStoreNames.length; i++) {
      types.push(objectStoreNames.item(i));
    }

    return types;
  }

  putRecord(record) {
    const transaction = this._db.transaction([record.type], 'readwrite');
    const objectStore = transaction.objectStore(record.type);

    return new Orbit.Promise((resolve, reject) => {
      const request = objectStore.put(record);

      request.onerror = function(/* event */) {
        console.error('error - putRecord', request.errorCode);
        reject(request.errorCode);
      };

      request.onsuccess = function(/* event */) {
        // console.log('success - putRecord');
        resolve();
      };
    });
  }

  removeRecord(record) {
    return new Orbit.Promise((resolve, reject) => {
      const transaction = this._db.transaction([record.type], 'readwrite');
      const objectStore = transaction.objectStore(record.type);
      const request = objectStore.delete(record.id);

      request.onerror = function(/* event */) {
        console.error('error - removeRecord', request.errorCode);
        reject(request.errorCode);
      };

      request.onsuccess = function(/* event */) {
        // console.log('success - removeRecord');
        resolve();
      };
    });
  }

  clearRecords(type) {
    if (!this._db) {
      return Orbit.Promise.resolve();
    }

    return new Orbit.Promise((resolve, reject) => {
      const transaction = this._db.transaction([type], 'readwrite');
      const objectStore = transaction.objectStore(type);
      const request = objectStore.clear();

      request.onerror = function(/* event */) {
        console.error('error - removeRecords', request.errorCode);
        reject(request.errorCode);
      };

      request.onsuccess = function(/* event */) {
        // console.log('success - removeRecords');
        resolve();
      };
    });
  }

  /////////////////////////////////////////////////////////////////////////////
  // Syncable interface implementation
  /////////////////////////////////////////////////////////////////////////////

  _sync(transform) {
    return this._processTransform(transform);
  }

  /////////////////////////////////////////////////////////////////////////////
  // Pushable interface implementation
  /////////////////////////////////////////////////////////////////////////////

  _push(transform) {
    return this._processTransform(transform)
      .then(() => [transform]);
  }

  /////////////////////////////////////////////////////////////////////////////
  // Pullable implementation
  /////////////////////////////////////////////////////////////////////////////

  _pull(query) {
    return this.openDB()
      .then(() => QueryOperators[query.expression.op](this, query.expression));
  }

  /////////////////////////////////////////////////////////////////////////////
  // Private
  /////////////////////////////////////////////////////////////////////////////

  _processTransform(transform) {
    return this.openDB()
      .then(() => {
        let result = Orbit.Promise.resolve();

        transform.operations.forEach(operation => {
          let processor = TransformOperators[operation.op];
          result = result.then(() => processor(this, operation));
        });

        return result;
      });
  }
}

Pullable.extend(IndexedDBSource.prototype);
Pushable.extend(IndexedDBSource.prototype);
Syncable.extend(IndexedDBSource.prototype);
