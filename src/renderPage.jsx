import React from "react";
import { renderToString } from "react-dom/server";
import App from "./App";
export { parseRoute } from "./router";
export { readPageData } from "./pageData";
export function renderPage(initialPage) { return renderToString(<App initialPage={initialPage} />); }
