import Orbit from 'orbit';
import Transform from 'orbit/transform';
import { isNone } from 'orbit/lib/objects';

export const QueryOperators = {
  records(source, expression) {
    const operations = [];

    let types = expression.args;
    if (types.length === 0 || (types.length === 1 && isNone(types[0]))) {
      types = source.availableTypes;
    }

    return types.reduce((chain, type) => {
      return chain.then(() => {
        return source.getRecords(type)
          .then(records => {
            records.forEach(record => {
              operations.push({
                op: 'addRecord',
                record
              });
            });
          });
      });
    }, Orbit.Promise.resolve())
      .then(() => [Transform.from(operations)]);
  },

  record(source, expression) {
    let requestedRecord = expression.args[0];

    return source.getRecord(requestedRecord)
      .then(record => {
        const operations = [{
          op: 'addRecord',
          record
        }];
        return [Transform.from(operations)];
      });
  }
};
