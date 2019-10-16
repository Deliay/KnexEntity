import { Model } from './Model';

export class EntityNotCreateError<T> extends Error {
  constructor(contextModel: Model<T>) {
    super(`Can't update table ${contextModel.definition.table}, key ${contextModel.definition.key} is missing`);
  }
}

