import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";

const root = document.getElementById("root");
if (root === null) throw new Error("Falta <div id=\"root\"> en index.html");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
