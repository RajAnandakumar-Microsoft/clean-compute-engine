import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const routePath = window.location.pathname.startsWith(basePath)
  ? window.location.pathname.slice(basePath.length)
  : window.location.pathname;
const storyOnly = import.meta.env.VITE_STORY_ONLY === "true";
const Experience = storyOnly || routePath.startsWith("/story")
  ? lazy(() => import("./story/StoryApp").then((module) => ({ default: module.StoryApp })))
  : lazy(() => import("./App").then((module) => ({ default: module.App })));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<div className="loading">Building the world…</div>}>
      <Experience />
    </Suspense>
  </React.StrictMode>,
);
