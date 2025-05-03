import React from "react";

import App from "./App";
import { QueryProvider } from "./app/providers";

const Root = () => (
    <QueryProvider>
        <App />
    </QueryProvider>
);

export default Root;
