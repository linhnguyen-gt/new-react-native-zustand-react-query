import { plugins } from "./plugins";
import { ReactotronCore } from "./reactotron.core";

const core = ReactotronCore.getInstance();

export const reactotron = {
    zustand: plugins.zustand(core),
    query: plugins.query(core),
    api: plugins.api(core)
};
