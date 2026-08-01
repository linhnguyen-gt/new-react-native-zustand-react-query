import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { queryClient } from './queryClient';
import { installReactQueryNativeBridge } from './reactQueryNativeBridge';

// Module scope, not an effect: `onlineManager` and `focusManager` are process-wide
// singletons, so subscribing per mount would attach a duplicate listener on every
// remount of the tree. Importing this provider is what installs the bridge.
installReactQueryNativeBridge();

/**
 * Sources the client from app/providers, not from the Reactotron plugin.
 *
 * Reading it from `reactotron.query.client` made this provider — mounted on every
 * launch — a transitive importer of the Reactotron module graph, which connects to a
 * dev host on construction.
 */
const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

export default QueryProvider;
