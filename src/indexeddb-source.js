/* eslint-disable valid-jsdoc */
import Orbit from 'orbit';
import Source from 'orbit/source';
import Pullable from 'orbit/interfaces/pullable';
import Pushable from 'orbit/interfaces/pushable';
import Syncable from 'orbit/interfaces/syncable';
import { assert } from 'orbit/lib/assert';
import { supportsIndexedDB } from './lib/indexeddb';
import TransformOperators from './lib/transform-operators';
import { QueryOperators } from './lib/queries';

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
   * @param {Object}  [options = {}]
   * @param {Schema}  [options.schema]    Orbit Schema.
   * @param {String}  [options.name]      Optional. Name for source. Defaults to 'indexedDB'.
   * @param {String}  [options.namespace] Optional. Namespace of the application. Will be used for the IndexedDB database name. Defaults to 'orbit'.
   */
  constructor(options = {}) {
    assert('IndexedDBSource\'s `schema` must be specified in `options.schema` constructor argument', options.schema);
    assert('Your browser does not support IndexedDB!', supportsIndexedDB());

    options.name = options.name || 'indexedDB';

    super(options);

    this._namespace = options.namespace || 'orbit';

    this.schema.on('upgrade', () => this.reopenDB());
  }

  /**
   * The version to specify when opening the IndexedDB database.
   *
   * @return {Integer} Version number.
   */
  get dbVersion() {
    return this.schema.version;
  }

  /**
   * IndexedDB database name.
   *
   * Defaults to the namespace of the app, which can be overridden in the constructor.
   *
   * @return {String} Database name.
   */
  get dbName() {
    return this._namespace;
  }

  get isDBOpen() {
    return !!this._db;
  }

  openDB() {
    return new Orbit.Promise((resolve, reject) => {
      if (this._db) {
        resolve(this._db);
      } else {
        let request = self.indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = (/* event */) => {
          // console.error('error opening indexedDB', this.dbName);
          reject(request.error);
        };

        request.onsuccess = (/* event */) => {
          // console.log('success opening indexedDB', this.dbName);
          const db = this._db = request.result;
          resolve(db);
        };

        request.onupgradeneeded = (event) => {
          // console.log('indexedDB upgrade needed');
          const db = this._db = event.target.result;
          if (event && event.oldVersion > 0) {
            this.migrateDB(db, event);
          } else {
            this.createDB(db);
          }
        };
      }
    });
  }

  closeDB() {
    if (this.isDBOpen) {
      this._db.close();
      this._db = null;
    }
  }

  reopenDB() {
    this.closeDB();
    return this.openDB();
  }

  createDB(db) {
    // console.log('createDB');
    Object.keys(this.schema.models).forEach(model => {
      this.registerModel(db, model);
    });
  }

  /**
   * Migrate database.
   *
   * @param  {IDBDatabase} db              Database to upgrade.
   * @param  {IDBVersionChangeEvent} event Event resulting from version change.
   */
  migrateDB(db, event) {
    console.error('IndexedDBSource#migrateDB - should be overridden to upgrade IDBDatabase from: ', event.oldVersion, ' -> ', event.newVersion);
  }

  deleteDB() {
    this.closeDB();

    return new Orbit.Promise((resolve, reject) => {
      let request = self.indexedDB.deleteDatabase(this.dbName);

      request.onerror = (/* event */) => {
        // console.error('error deleting indexedDB', this.dbName);
        reject(request.error);
      };

      request.onsuccess = (/* event */) => {
        // console.log('success deleting indexedDB', this.dbName);
        resolve();
      };
    });
  }

  registerModel(db, model) {
    // console.log('registerModel', model);
    db.createObjectStore(model, { keyPath: 'id' });
    // TODO - create indices
  }

  getRecord(record) {
    return new Orbit.Promise((resolve, reject) => {
      const transaction = this._db.transaction([record.type]);
      const objectStore = transaction.objectStore(record.type);
      const request = objectStore.get(record.id);

      request.onerror = function(/* event */) {
        console.error('error - getRecord', request.error);
        reject(request.error);
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
        console.error('error - getRecords', request.error);
        reject(request.error);
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
        console.error('error - putRecord', request.error);
        reject(request.error);
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
        console.error('error - removeRecord', request.error);
        reject(request.error);
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
        console.error('error - removeRecords', request.error);
        reject(request.error);
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
