import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import * as serviceWorker from "./serviceWorker";
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles/";

const drizzle = require('drizzle-react');
const DrizzleProvider = drizzle.DrizzleProvider;

// Import contracts
import dTokStreams from './contracts/dTokStreams.json';

require("dotenv").config();

const theme = createMuiTheme({
  palette: {
    primary: {
      main: "#FCA311"
    },
    secondary: {
      main: "#282b2e",
      light: "#1E96CC"
    }
  },
  typography: {
    useNextVariants: true,
  }
});

const drizzle_options = {
  contracts: [
    dTokStreams
  ]
};

ReactDOM.render(
  <MuiThemeProvider theme={theme}>
    <DrizzleProvider options={drizzle_options}>
      <App />
    </DrizzleProvider>
  </MuiThemeProvider>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
