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
import knex from 'knex';
import { forumContext } from './models/forumContext';
import { usersEntity } from './models/users';
import { topicsEntity } from './models/topics';

const dbForum = new forumContext(knex({ ... your knex config ... }));

async function getAllTopicByUser(currentUser: userEntity) : topicEntity[] {
  return dbForum.topics.fromDb((query, table) => {
    query.where(table.Column.userId, currentUser.id);
  });
}
```

