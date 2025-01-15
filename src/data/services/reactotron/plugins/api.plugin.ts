import { ReactotronCore } from "../reactotron.core";

export const apiPlugin = (core: ReactotronCore) => ({
    logRequest: (method: string, url: string, data?: object | null) => {
        core.log({
            type: "API",
            name: `${method} ${url}`,
            preview: "API Request",
            value: data || null
        });
    }
});
