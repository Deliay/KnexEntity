Knex Entity
----
[Typescript only]Simple schema Context/Entity builder

```ts
async function getAllTopicByUser(user: User) : Topic {
  return DbForum.Topic.fromDb((query, table) => {
    query
    .where(table.Column.userId, user.id);
  });
}
```

## How to use ?
```
> npm install KnexEntity
> mkdir models
> npx knextable toModel --useMoment --toFolder ./models <your_schema>
```

