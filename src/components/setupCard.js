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
import { CurrencyType } from "connext/dist/state/ConnextState/CurrencyTypes";
import getExchangeRates from "connext/dist/lib/getExchangeRates";
import CurrencyConvertable from "connext/dist/lib/currency/CurrencyConvertable";
import Currency from "connext/dist/lib/currency/Currency";
import { CopyToClipboard } from "react-copy-to-clipboard";
import CopyIcon from "@material-ui/icons/FileCopy";

const styles = theme => ({
  icon: {
    width: "40px",
    height: "40px"
  }
});

const screens = (classes, minEth, minDai, maxEth, maxDai, copied) => [
  {
    title: "Welcome to Your Dai Card!",
    message: `This is beta software, so if you run into any trouble 
          please contact us via our Support chat (accessible in the Settings screen).`
  },
  {
    title: "Your Recovery Phrase",
    message: `This mnemonic will allow you to access your funds or import your wallet elsewhere.
        Be sure to write it down before you deposit money.`,
    extra: (
      <Grid container style={{ padding: "2% 2% 2% 2%" }}>
        <CopyToClipboard
          text={localStorage.getItem("mnemonic")}
          color="primary"
        >
          <Button
            fullWidth
            className={classes.button}
            variant="outlined"
            color="primary"
            size="small"
          >
            <CopyIcon style={{ marginRight: "5px" }} />
            <Typography noWrap={false} variant="body1" color="primary">
              <Tooltip
                disableFocusListener
                disableTouchListener
                title="Click to Copy"
              >
                <span>{localStorage.getItem("mnemonic")}</span>
              </Tooltip>
            </Typography>
          </Button>
        </CopyToClipboard>
      </Grid>
    )
  },
  {
    title: "Adding funds - ETH",
    message: (
      <div>
        <p>To get started, send some funds to the address above!</p>
        <p>
          <span style={{ fontWeight: "bold" }}>
            Minimum deposit (covers gas costs):
          </span>{" "}
          {minEth || "?.??"} ETH (${minDai || "?.??"})<br />
          <span style={{ fontWeight: "bold" }}>
            Maximum deposit (for your protection):
          </span>{" "}
          {maxEth || "?.??"} ETH (${maxDai || "?.??"})
        </p>
      </div>
    ),
    message2: (
      <p>
        Don't have any ETH or need a refresher on how to send it?{" "}
        <a href="https://www.coinbase.com/">Coinbase</a> is a good place to get
        started.{" "}
      </p>
    ),
    extra: (
      <Grid container style={{ padding: "2% 2% 2% 2%" }}>
        <CopyToClipboard
          text={localStorage.getItem("delegateSigner")}
          color="primary"
        >
          <Button
            fullWidth
            className={classes.button}
            variant="outlined"
            color="primary"
            size="small"
          >
            <CopyIcon style={{ marginRight: "5px" }} />
            <Typography noWrap variant="body1" color="primary">
              <Tooltip
                disableFocusListener
                disableTouchListener
                title="Click to Copy"
              >
                <span>{localStorage.getItem("delegateSigner")}</span>
              </Tooltip>
            </Typography>
          </Button>
        </CopyToClipboard>
      </Grid>
    )
  },
  {
    title: "Adding Funds - DAI",
    message: `If you'd like to deposit DAI directly, there are no deposit maximums. However, make sure to also send at least ${minEth ||
      "?.??"} ETH ($${minDai || "?.??"}) for gas.`,
    extra: (
      <Grid container style={{ padding: "2% 2% 2% 2%" }}>
        <CopyToClipboard
          text={localStorage.getItem("delegateSigner")}
          color="primary"
        >
          <Button
            fullWidth
            className={classes.button}
            variant="outlined"
            color="primary"
            size="small"
          >
            <CopyIcon style={{ marginRight: "5px" }} />
            <Typography noWrap variant="body1" color="primary">
              <Tooltip
                disableFocusListener
                disableTouchListener
                title="Click to Copy"
              >
                <span>{localStorage.getItem("delegateSigner")}</span>
              </Tooltip>
            </Typography>
          </Button>
        </CopyToClipboard>
      </Grid>
    )
  }
];

class SetupCard extends Component {
  constructor(props) {
    super(props);

    this.state = {
      index: 0,
      open: !localStorage.getItem("hasBeenWarned"),
      copied: false
    };
  }

  handleClickOpen = () => {
    this.setState({ open: true });
  };

  handleClickNext = () => {
    const { index } = this.state;
    this.setState({ index: index + 1 });
  };

  handleClickPrevious = () => {
    const { index } = this.state;
    this.setState({ index: index - 1 });
  };

  handleClose = () => {
    localStorage.setItem("hasBeenWarned", "true");
    this.setState({ open: false });
  };

  render() {
    const {
      classes,
      connextState,
      browserMinimumBalance,
      maxTokenDeposit
    } = this.props;
    const { index, open, copied } = this.state;

    // get proper display values
    // max token in BEI, min in wei and DAI
    let minDai, minEth;
    let maxDai, maxEth;
    if (connextState && browserMinimumBalance) {
      const minConvertable = new CurrencyConvertable(
        CurrencyType.WEI,
        browserMinimumBalance.wei,
        () => getExchangeRates(connextState)
      );

      const maxConvertable = new CurrencyConvertable(
        CurrencyType.BEI,
        maxTokenDeposit,
        () => getExchangeRates(connextState)
      );

      minEth = minConvertable
        .toETH()
        .amountBigNumber.toFixed()
        .substr(0, 5);
      minDai = Currency.USD(browserMinimumBalance.dai).format({});
      maxEth = maxConvertable
        .toETH()
        .amountBigNumber.toFixed()
        .substr(0, 5);
      maxDai = Currency.USD(maxConvertable.toUSD().amountBigNumber).format({});
    }

    const display = screens(classes, minEth, minDai, maxEth, maxDai, copied);

    const isFinal = index === display.length - 1;

    const progress = 100 * ((index + 1) / display.length);

    return (
      <Grid
        container
        spacing={16}
        direction="column"
        style={{
          paddingLeft: "10%",
          paddingRight: "10%",
          paddingTop: "10%",
          paddingBottom: "10%",
          textAlign: "center"
        }}
        zeroMinWidth={true}
      >
        {display.length !== 0 && (
          <Dialog open={open} fullWidth>
            <Grid container justify="center">
              <Grid item xs={12} style={{ padding: "2% 2% 2% 2%" }}>
                <LinearProgress variant="determinate" value={progress} />
              </Grid>

              <Grid item xs={12}>
                <DialogTitle variant="h5">{display[index].title}</DialogTitle>
              </Grid>
              {display[index].extra && (
                <Grid item xs={12}>
                  {display[index].extra}
                </Grid>
              )}

              <DialogContent>
                <Grid item xs={12} style={{ padding: "2% 2% 2% 2%" }}>
                  <DialogContentText variant="body1">
                    {display[index].message}
                  </DialogContentText>
                  {display[index].message2 ? (
                    <DialogContentText variant="body1">
                      {display[index].message2}
                    </DialogContentText>
                  ) : null}
                </Grid>

                <Grid item xs={12}>
                  <DialogActions style={{ padding: "2% 2% 2% 2%" }}>
                    {index !== 0 && (
                      <Button
                        onClick={this.handleClickPrevious}
                        className={classes.button}
                        variant="outlined"
                        color="primary"
                        size="small"
                      >
                        Back
                      </Button>
                    )}
                    {isFinal ? (
                      <Button
                        onClick={this.handleClose}
                        className={classes.button}
                        variant="outlined"
                        color="primary"
                        size="small"
                      >
                        Got it!
                      </Button>
                    ) : (
                      <Button
                        onClick={this.handleClickNext}
                        className={classes.button}
                        variant="outlined"
                        color="primary"
                        size="small"
                      >
                        Next
                      </Button>
                    )}
                  </DialogActions>
                </Grid>
              </DialogContent>
            </Grid>
          </Dialog>
        )}
      </Grid>
    );
  }
}

export default withStyles(styles)(SetupCard);
