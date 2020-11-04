import { unstable_createRoot } from "react-dom";
import "./reset.css";
import "./index.css";
import App from "./App";
import "./helpers/spamConsole.js";
// import reportWebVitals from './reportWebVitals';

unstable_createRoot(document.getElementById("root")).render(<App />);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
