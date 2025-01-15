import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { reactotron } from "@/data";

const QueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <QueryClientProvider client={reactotron.query.client}>{children}</QueryClientProvider>;
};

export default QueryProvider;
