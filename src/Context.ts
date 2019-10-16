import Knex from 'knex';
import { Model, ModelDefinition } from './Model';

export type DbModelDefs<T> = { [P in keyof T]: ModelDefinition<T[P]> }

export type DbModels<T> = { [P in keyof T]: Model<T[P]> }

export interface DbContextDefinition<TableEntities> {
  contextKnex: Knex,
  tablesDefinition: DbModelDefs<TableEntities>,
}

export abstract class DbContext<TableEntities> {
  definition: DbContextDefinition<TableEntities>;
  private models: DbModels<TableEntities> = {} as any;

  constructor(definition: DbContextDefinition<TableEntities>) {
    this.definition = definition;
    for (const key in definition.tablesDefinition) {
      if (definition.tablesDefinition.hasOwnProperty(key)) {
        const def = definition.tablesDefinition[key];
        this.models[key] = new Model(definition.contextKnex, def);
      }
    }
  }

  protected getModel<Key extends keyof TableEntities>(table: Key): Model<TableEntities[Key]> {
    return this.models[table];
  }
}