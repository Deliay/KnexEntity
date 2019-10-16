import Knex, { QueryBuilder } from 'knex';
import _ from 'lodash';
import { EntityNotCreateError } from './Errors';
import { ReplaceCallStack } from './util/ErrorStackCleanHelper';

type _EntityColumnMap<T> = { [P in keyof T]: string };
export type EntityColumnMap<T> = _EntityColumnMap<T>;

type _EntityColumnConvertToEntity<T> = { [P in keyof T]: (data: any) => T[P] };
export type EntityColumnConvertToEntity<T> = Partial<_EntityColumnConvertToEntity<T>>

type _EntityColumnConvertToRaw<T> = { [P in keyof T]: (data: T[P]) => any };
export type EntityColumnConvertToRaw<T> = Partial<_EntityColumnConvertToRaw<T>>

export interface ModelDefinition<T> {
  /** 当前数据表 */
  table: string,
  /** 表主键 */
  key: keyof T,
  /** 字段写法转换 */
  map: EntityColumnMap<T>,
  /** 字段raw转entity转换函数 */
  convertToEntity: EntityColumnConvertToEntity<T>,
  /** 字段entity转raw转换函数 */
  convertToRaw: EntityColumnConvertToRaw<T>,
}

/**
 * 单个数据表对应模型操作
 */
export class Model<TEntity extends {}> {
  public readonly definition: Readonly<ModelDefinition<TEntity>>;
  public readonly contextKnex: Knex;

  /**
   * 
   * @param contextKnex Knex实例
   * @param definition 模型的定义
   */
  constructor(contextKnex: Knex, definition: ModelDefinition<TEntity>) {
    this.definition = definition;
    this.contextKnex = contextKnex;
  }

  /**
   * 检查并返回主键
   * @param entity 实体
   * @param throwError 是否在没有主键时抛出错误
   */
  protected getKey(entity: Partial<TEntity>, throwError = false): TEntity[keyof TEntity] | undefined {
    const key = entity[this.definition.key];
    if (!key && throwError) {
      throw new EntityNotCreateError<TEntity>(this);
    }
    return key;
  }

  /**
   * 将一个实体转换为数据库原始格式
   * @param entity 实体
   */
  private entityToRawData(entity: Partial<TEntity>): any {
    let data: any = {};

    // 在进行实体转换的时候，转换值
    for (const convertKey in this.definition.map) {
      const element = this.definition.map[convertKey];
      data[element] = entity[convertKey];
      if (this.definition.convertToRaw[convertKey]) {
        const converter = this.definition.convertToRaw[convertKey];
        const value = entity[convertKey];
        if (converter && value) {
          data[element] = converter(value as any);
        }
      }
    }
    return data;
  }

  /**
   * 将一份原始数据转换为实体
   * @param data 原始数据
   */
  private rawDataToEntity(data: any): TEntity {
    let entityRaw: any = {};
    // 先将原始数据转换为entity的格式
    for (const mapKey in this.definition.map) {
      const element = this.definition.map[mapKey];
      entityRaw[mapKey] = data[element];
    }
    // 将数据格式进行转换
    for (const convertKey in this.definition.convertToEntity) {
      const element = this.definition.convertToEntity[convertKey];
      if (element) {
        entityRaw[convertKey] = element(entityRaw[convertKey]);
      }
    }
    return entityRaw as TEntity;
  }

  private updateEntitiy(dest: Partial<TEntity>, src: Partial<TEntity>) {
    for (const mapKey in this.definition.map) {
      if (!!(src[mapKey])) {
        dest[mapKey] = src[mapKey];
      }
    }
  }

  /**
   * 将实体的主键剔除
   * @param entity 实体
   */
  protected entityWithoutKey(entity: Partial<TEntity>): Partial<TEntity> {
    return _.omit(entity, this.definition.key);
  }

  /**
   * 默认查询构造
   */
  protected get builder(): QueryBuilder {
    return (() =>this.contextKnex(this.definition.table))();
  }

  /**
   * 根据主键构造附带主键的查询
   * @param entity 实体
   * @param throwError 在没有主键时，是否抛出错误
   */
  protected builderWithKey(entity: Partial<TEntity>, throwError = false): QueryBuilder {
    const key = this.getKey(entity, throwError);
    return this.builder.where(this.definition.key as any, key as any);
  }

  /**
   * 更新一个实体
   * @param entity 实体
   */
  public async update(entity: Partial<TEntity>): Promise<boolean> {
    return await ReplaceCallStack(this.builderWithKey(entity, true)
    .update(this.entityToRawData(this.entityWithoutKey(entity)))) === 1;
  };


  /**
   * 更新一个实体
   * @param entity 实体
   */
  public async updatePartial(entity: Partial<TEntity>, data: Partial<TEntity>): Promise<boolean> {
    // Update source entity
    Object.keys(data).forEach((key) => entity[key] = data[key]);
    // Update database
    return await ReplaceCallStack(this.builderWithKey(entity, true)
    .update(this.entityToRawData(data))) === 1;
  };

  /**
   * 创建或更新一个实体
   * @param entity 实体
   */
  public async createOrUpdate(entity: Partial<TEntity>): Promise<boolean> {
    const isCreated = async() => (await this.builderWithKey(entity).limit(1)).length === 1;
    if (this.getKey(entity) && await isCreated()) {
      return this.update(entity);
    } else {
      if (await this.batchInsert([entity]) === 1) {
        return true;
      }
      return false;
    }
  }

  /**
   * 删除一个实体
   * @param entity 实体
   */
  public async delete(entity: TEntity): Promise<boolean> {
    return await ReplaceCallStack(this.builderWithKey(entity, true).delete().limit(1)) === 1;
  }

  /**
   * 将实体数据恢复到数据库状态
   * @param entity 实体
   */
  public async reset(entities: Partial<TEntity>[]): Promise<void> {
    const keys = entities
    .map((entity) => entity[this.definition.key])
    .filter((key) => !(key === null || key === undefined));

    const result: TEntity[] = await ReplaceCallStack(
      this.fromDb((query) => {
        query 
        .whereIn(`${this.definition.key}`, keys as any)
        .limit(keys.length);
      })
    );
    const mapItems = result.map((entity) => [entity[this.definition.key], entity]);
    const resultMap = new Map<string, TEntity>(mapItems as any);
    
    entities.forEach((entity) => {
      const newEntity = resultMap.get(entity[this.definition.key] as any);
      if (newEntity) {
        this.updateEntitiy(entity, newEntity);
      }
    });
  }

  /**
   * 将一堆实体持久化
   * @param entities 实体列表
   * @returns 返回第一个的ID
   */
  public async batchInsert(entities: Partial<TEntity>[]): Promise<number> {
    const needInsert = entities
    .filter((ent) => !ent[this.definition.key])
    .map((ent) => this.entityToRawData(ent));
    const id = Number(await ReplaceCallStack(this.builder.insert(needInsert))) as any;
    let index = 0;
    for (const ent of entities) {
      ent[this.definition.key] = id + (index++);
    }
    await this.reset(entities);
    return index;
  }

  /**
   * 构造查询，查询出对应的实体
   * @param query 查询构造
   */
  public async fromDb(query?: (builder: QueryBuilder, self: this) => void): Promise<TEntity[]> {
    const basicQuery = this.builder;
    if (query) { query(basicQuery, this); }
    const result = await ReplaceCallStack(basicQuery);
    return (result as []).map((raw) => this.rawDataToEntity(raw));
  }

  public raw(raw: any): any {
    return this.contextKnex.raw(raw);
  }

  public get Column(){
    return this.definition.map as _EntityColumnMap<TEntity>;
  }
}
