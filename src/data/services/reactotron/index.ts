import { plugins } from './plugins';
import { ReactotronCore } from './reactotron.core';

const core = ReactotronCore.getInstance();

export const reactotron = {
    zustand: plugins.zustand(core),
    query: plugins.query(core),
    api: plugins.api(core),

    log: (name: string, value: any, preview?: string) =>
        core.log({ type: 'INFO', name, preview: preview || 'Log', value, color: '#95a5a6' }),

    info: (name: string, value: any, preview?: string) => core.logInfo(name, value, preview),

    success: (name: string, value: any, preview?: string) => core.logSuccess(name, value, preview),

    warn: (name: string, value: any, preview?: string) => core.logWarning(name, value, preview),

    error: (name: string, error: any, preview?: string) => core.logError(name, error, preview),

    network: (name: string, request: any, response?: any) => core.logNetwork(name, request, response),

    action: (name: string, action: any, state?: any) => core.logAction(name, action, state),

    component: (name: string, props?: any, state?: any, renderTime?: number) =>
        core.logComponent(name, props, state, renderTime),
};
