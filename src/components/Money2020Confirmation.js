import React, { Component } from "react";
import Grid from "@material-ui/core/Grid";
import {
  withStyles,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Dialog,
  Typography,
  DialogContentText,
  LinearProgress,
  Tooltip
} from "@material-ui/core";
import { CopyToClipboard } from "react-copy-to-clipboard";
import CopyIcon from "@material-ui/icons/FileCopy";
import * as Connext from "connext";
import Maker from "../assets/Maker.svg";
import ConnextHorizontal from "../assets/ConnextHorizontal.svg";
import money2020 from "../assets/money2020.svg";

const { Currency, CurrencyConvertable, CurrencyType } = Connext.types;
const cUtils = new Connext.Utils();
const { getExchangeRates } = cUtils;

const styles = theme => ({
  icon: {
    width: "40px",
    height: "40px"
  }
});

class Money2020Confirmation extends Component {
  constructor(props) {
    super(props);

    this.state = {
      index: 0
    };
  }

  handleClose = () => {
    localStorage.setItem("hasBeenWarned", "true");
    this.setState({ open: false });
  };

  render() {
    const { classes } = this.props;
    const { index, open } = this.state;

    return (
      <Grid
        container
        spacing={16}
        direction="column"
        style={{
          // paddingLeft: "2%",
          // paddingRight: "2%",
          paddingTop: "2%",
          paddingBottom: "2%",
          textAlign: "center"
        }}
        zeroMinWidth={true}
      >
        <Dialog open={true} style={{ width: "100%" }}>
          <Grid
            container
            wrap="wrap"
            justify="center"
            alignItems="center"
            spacing={32}
            style={{ padding: "5% 5% 5% 5%" }}
          >
            <Grid
              container
              wrap="nowrap"
              direction="row"
              justify="space-evenly"
              alignItems="center"
              style={{ padding: "5% 5% 5% 5%" }}
            >
              <object
                data={money2020}
                type="image/svg+xml"
                style={{ width: "60px" }}
              >
                <img src="yourfallback.jpg" />
              </object>
              <object
                data={ConnextHorizontal}
                type="image/svg+xml"
                style={{ width: "100px" }}
              >
                <img src="yourfallback.jpg" />
              </object>
              <object
                data={Maker}
                type="image/svg+xml"
                style={{ width: "80px" }}
              >
                <img src="yourfallback.jpg" />
              </object>
            </Grid>
            <Typography
              style={{ width: "80%", paddingTop: "5%", textAlign: "center" }}
              variant="h5"
              color="primary"
            >
              We're processing your request!
            </Typography>
            <Typography
              style={{ width: "80%", paddingBottom: "5%", textAlign: "center" }}
              variant="body2"
              color="primary"
            >
              This may take a short time. Check your account balance in a few
              minutes.
            </Typography>
            <Button
              className={classes.button}
              variant="outlined"
              color="primary"
              size="small"
              onClick={() => this.props.history.push("/")}
            >
              <Typography noWrap variant="body1" color="primary">
                View balance
              </Typography>
            </Button>

            <Typography variant="body1"style={{ paddingTop: "5%", width: "80%" }}>
              Feel free to stop by the MakerDAO booth at M31 (Hall 2) to hear
              more about DAI and how to use it as a payment method. We are also
              there to support you in retrieving your DAI.
            </Typography>

            <Grid container nowrap style={{ textAlign: "center", paddingTop: "5%", width: "80%" }}>
            <Typography
              variant="body1">
              Read more about: &nbsp;
              </Typography>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://connext.network"
              >
                            <Typography
              variant="body1"
            >Connext</Typography>
              </a>
              &nbsp; &nbsp; &nbsp;
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://makerdao.com"
              >
                 <Typography
              variant="body1"
            >DAI</Typography>
              </a>
            </Grid>
            {/* <Button
                onClick={() => this.props.history.push("/")}
                className={classes.button}
                variant="outlined"
                color="primary"
                size="small"
              >
                Home
              </Button> */}
          </Grid>
        </Dialog>
      </Grid>
    );
  }
}

export default withStyles(styles)(Money2020Confirmation);
