import { apiPlugin } from './api.plugin';
import { queryPlugin } from './query.plugin';
import { zustandPlugin } from './zustand.plugin';

export const plugins = {
    zustand: zustandPlugin,
    query: queryPlugin,
    api: apiPlugin,
};
