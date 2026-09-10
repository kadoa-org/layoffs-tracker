import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
const published = root.querySelector("[data-published-page]");
const matchesRoute = published?.dataset.publishedPage === window.location.pathname.replace(/\/$/, "");
const initialPage = matchesRoute ? { pathname: published.dataset.publishedPage, html: published.innerHTML } : null;
const app = <App initialPage={initialPage} />;

if (initialPage) hydrateRoot(root, app);
else createRoot(root).render(app);
