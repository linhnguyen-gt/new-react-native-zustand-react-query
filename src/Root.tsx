import { QueryProvider } from '@app/providers';
import React from 'react';

import App from './App';

const Root = () => (
    <QueryProvider>
        <App />
    </QueryProvider>
);

export default Root;
