import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

const Experience = window.location.pathname.startsWith("/story")
  ? lazy(() => import("./story/StoryApp").then((module) => ({ default: module.StoryApp })))
  : lazy(() => import("./App").then((module) => ({ default: module.App })));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<div className="loading">Building the world…</div>}>
      <Experience />
    </Suspense>
  </React.StrictMode>,
);
