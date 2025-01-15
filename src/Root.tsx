import React from "react";
import { Provider } from "react-redux";

import App from "@/App";
import { Store } from "@/store";

const Root = () => (
    <Provider store={Store}>
        <App />
    </Provider>
);

export default Root;
