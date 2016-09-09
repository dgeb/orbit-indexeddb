/* eslint-disable valid-jsdoc */
import Orbit from 'orbit';
import Bucket from 'orbit/bucket';
import { assert } from 'orbit/lib/assert';
import { supportsIndexedDB } from './lib/indexeddb';

/**
 * Bucket for persisting transient data in IndexedDB.
 *
 * @class IndexedDBBucket
 * @extends Bucket
 */
export default class IndexedDBBucket extends Bucket {
  /**
   * Create a new IndexedDBBucket.
   *
   * @constructor
   * @param {Object}  [options]
   * @param {String}  [options.name]        Optional. Name of this bucket.
   * @param {String}  [options.dbName]      Optional. Name of the IndexedDB database. Defaults to 'orbit-bucket'.
   * @param {String}  [options.dbStoreName] Optional. Name of the store within the database. Defaults to 'data'.
   * @param {Integer} [options.dbVersion]   Optional. The version to open the IndexedDB database with. IndexedDB's default verions is 1.
   */
  constructor(options = {}) {
    assert('Your browser does not support IndexedDB!', supportsIndexedDB());

    super(options);

    this.dbName      = options.dbName || 'orbit-bucket';
    this.dbStoreName = options.dbStoreName || 'data';
    this.dbVersion   = options.dbVersion;
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
    db.createObjectStore(this.dbStoreName); //, { keyPath: 'key' });
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

  getItem(key) {
    return this.openDB()
      .then(() => {
        return new Orbit.Promise((resolve, reject) => {
          const transaction = this._db.transaction([this.dbStoreName]);
          const objectStore = transaction.objectStore(this.dbStoreName);
          const request = objectStore.get(key);

          request.onerror = function(/* event */) {
            console.error('error - getItem', request.errorCode);
            reject(request.errorCode);
          };

          request.onsuccess = function(/* event */) {
            // console.log('success - getItem', request.result);
            resolve(request.result);
          };
        });
      });
  }

  setItem(key, value) {
    return this.openDB()
      .then(() => {
        const transaction = this._db.transaction([this.dbStoreName], 'readwrite');
        const objectStore = transaction.objectStore(this.dbStoreName);

        return new Orbit.Promise((resolve, reject) => {
          const request = objectStore.put(value, key);

          request.onerror = function(/* event */) {
            console.error('error - setItem', request.errorCode);
            reject(request.errorCode);
          };

          request.onsuccess = function(/* event */) {
            // console.log('success - setItem');
            resolve();
          };
        });
      });
  }

  removeItem(key) {
    return this.openDB()
      .then(() => {
        return new Orbit.Promise((resolve, reject) => {
          const transaction = this._db.transaction([this.dbStoreName], 'readwrite');
          const objectStore = transaction.objectStore(this.dbStoreName);
          const request = objectStore.delete(key);

          request.onerror = function(/* event */) {
            console.error('error - removeItem', request.errorCode);
            reject(request.errorCode);
          };

          request.onsuccess = function(/* event */) {
            // console.log('success - removeItem');
            resolve();
          };
        });
      });
  }
}
