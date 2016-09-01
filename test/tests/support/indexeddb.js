import Orbit from 'orbit';

function openDB(source) {
  return new Orbit.Promise((resolve, reject) => {
    let request = self.indexedDB.open(source.dbName, source.dbVersion);

    request.onerror = function(/* event */) {
      reject(request.errorCode);
    };

    request.onsuccess = function(/* event */) {
      resolve(request.result);
    };
  });}

function getRecord(source, record) {
  return openDB(source)
    .then(db => {
      const transaction = db.transaction([record.type]);
      const objectStore = transaction.objectStore(record.type);

      return new Orbit.Promise((resolve, reject) => {
        const request = objectStore.get(record.id);

        request.onerror = function(/* event */) {
          // console.error('error - getRecord', request.errorCode);
          reject(request.errorCode);
        };

        request.onsuccess = function(/* event */) {
          // console.log('success - getRecord', request.result);
          resolve(request.result);
        };
      });
    });
}

export function verifyIndexedDBContainsRecord(source, record, ignoreFields) {
  return getRecord(source, record)
    .then(actual => {
      if (ignoreFields) {
        for (let i = 0, l = ignoreFields.length, field; i < l; i++) {
          field = ignoreFields[i];
          actual[record.id][field] = record[field];
        }
      }

      deepEqual(actual, record, 'indexedDB contains record');
    });
}

export function verifyIndexedDBDoesNotContainRecord(source, record) {
  return getRecord(source, record)
    .then(actual => {
      equal(actual, null, 'indexedDB does not contain record');
    });
}
