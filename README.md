Knex Entity
----
[Typescript only]Simple schema Context/Entity builder

## How to use ?
```
> npm install knexentity
> mkdir models
> npx knextable toModel <your_schema> --useMoment --genContext --toFolder ./models
```

```ts
import { <yourSchema>Context } from './models/<yourSchema>Context';
import { usersEntity } from './models/users';
import { topicsEntity } from './models/topics';

async function getAllTopicByUser(currentUser: userEntity) : topicEntity[] {
  return DbForum.topics.fromDb((query, table) => {
    query.where(table.Column.userId, currentUser.id);
  });
}
```

