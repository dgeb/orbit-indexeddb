import { toIdentifier } from 'orbit/lib/identifiers';

function getRecord(source, record) {
  return source.getRecord(record)
    .catch(() => {
      return {
        type: record.type,
        id: record.id
      };
    });
}

export default {
  addRecord(source, operation) {
    return source.putRecord(operation.record);
  },

  replaceRecord(source, operation) {
    return source.putRecord(operation.record);
  },

  removeRecord(source, operation) {
    return source.removeRecord(operation.record);
  },

  replaceKey(source, operation) {
    return getRecord(source, operation.record)
      .then(record => {
        record.keys = record.keys || {};
        record.keys[operation.key] = operation.value;
        return source.putRecord(record);
      });
  },

  replaceAttribute(source, operation) {
    return getRecord(source, operation.record)
      .then(record => {
        record.attributes = record.attributes || {};
        record.attributes[operation.attribute] = operation.value;
        return source.putRecord(record);
      });
  },

  addToHasMany(source, operation) {
    return getRecord(source, operation.record)
      .then(record => {
        record.relationships = record.relationships || {};
        record.relationships[operation.relationship] = record.relationships[operation.relationship] || {};
        record.relationships[operation.relationship].data = record.relationships[operation.relationship].data || {};
        record.relationships[operation.relationship].data[toIdentifier(operation.relatedRecord)] = true;
        return source.putRecord(record);
      });
  },

  removeFromHasMany(source, operation) {
    return getRecord(source, operation.record)
      .then(record => {
        if (record &&
            record.relationships &&
            record.relationships[operation.relationship] &&
            record.relationships[operation.relationship].data &&
            record.relationships[operation.relationship].data[toIdentifier(operation.relatedRecord)]
        ) {
          delete record.relationships[operation.relationship].data[toIdentifier(operation.relatedRecord)];
          return source.putRecord(record);
        }
      });
  },

  replaceHasMany(source, operation) {
    return getRecord(source, operation.record)
      .then(record => {
        record.relationships = record.relationships || {};
        record.relationships[operation.relationship] = record.relationships[operation.relationship] || {};
        record.relationships[operation.relationship].data = {};
        operation.relatedRecords.forEach(relatedRecord => {
          record.relationships[operation.relationship].data[toIdentifier(relatedRecord)] = true;
        });
        return source.putRecord(record);
      });
  },

  replaceHasOne(source, operation) {
    return getRecord(source, operation.record)
      .then(record => {
        record.relationships = record.relationships || {};
        record.relationships[operation.relationship] = record.relationships[operation.relationship] || {};
        record.relationships[operation.relationship].data = operation.relatedRecord ? toIdentifier(operation.relatedRecord) : null;
        return source.putRecord(record);
      });
  }
};
