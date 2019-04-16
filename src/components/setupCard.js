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
  Tooltip,
  Input,
  TextField,
  CircularProgress
} from "@material-ui/core";
import { CurrencyType } from "connext/dist/state/ConnextState/CurrencyTypes";
import getExchangeRates from "connext/dist/lib/getExchangeRates";
import CurrencyConvertable from "connext/dist/lib/currency/CurrencyConvertable";
import Currency from "connext/dist/lib/currency/Currency";
import { CopyToClipboard } from "react-copy-to-clipboard";
import CopyIcon from "@material-ui/icons/FileCopy";
import { generateMnemonic, decryptMnemonic } from "../utils/walletGen";

const styles = theme => ({
  icon: {
    width: "40px",
    height: "40px"
  },
  password:{
    width:"40%",
    padding: "2% 2% 2% 2%",
  },
  passwordInput:{
    padding: "2% 2% 2% 2%",
  }
});

// How should setup card work?

/*
  open card based on if setupType is not null

  1. If setupType is onboard
    a. Show Dai Card intro screen with mnemonic
    b. Show pin component
    c. Show pin component again and make sure pin is correct
      i. on submit, encrypt mnemonic and save to localStorage
      ii. call walletGen with pin
    d. Show min/max

  2. If setupType is createPin (legacy)
    a. Show message screen
    b. Show pin component
    c. Show pin component again and make sure pin is correct
      i. on submit, recover mnemonic from local storage
      ii. encrypt mnemonic and save to localStorage
      iii. call walletGen with pin

  3. If setupType is inputPin
    a. Show pin 
      i. on submit, call walletGen with pin

*/

class SetupCard extends Component {
  constructor(props) {
    super(props);

    this.state = {
      index: 0,
      open: this.props.open, //this.props.setup,
      type: this.props.setupType,
      copied: false,
      pin: null,
      pin2: null,
      mnemonic: null,
      nextDisabled: false,
      isCreating: false,
      createSuccess: false
    };
  }

  // Login with pin
  onSubmitInputPin(pin) {
    try {
      this.props.walletGen(pin);
      this.handleClose();
    } catch (e) {
      console.log(`walletGen error`);
      alert(`Password incorrect. If this error persists, please reach out to support: https://discord.gg/A2DPmgn`);
    }
  }

  // Pin setup
  onSubmitOnboardOrCreate() {
    console.log(this.state.pin, this.state.pin2);
    const { pin, pin2, index, isCreating } = this.state;
    this.setState({ isCreating: true });
    if (!localStorage.getItem("encryptedMnemonic")) {
      if (localStorage.getItem("mnemonic")) {
        let existingMnemonic = localStorage.getItem("mnemonic");

        //remove plaintext mnemonic from storage
        localStorage.removeItem("mnemonic");

        this.props.encryptMnemonic(existingMnemonic, pin);
      } else if (!localStorage.getItem("mnemonic")) {
        let mnemonic = this.handleGenerateMnemonic();
        this.props.encryptMnemonic(mnemonic, pin);
        this.setState({ mnemonic: null });
      }
    }
    const passwordValidated = this.validatePassword(pin, pin2);
    try {
      if (passwordValidated) {
        this.props.walletGen(pin);
      } else {
        alert(`Passwords don't match. Please try again!`);
        throw "password mismatch";
      }
    } catch (e) {
      console.log(`Wallet gen error: ${e}`);
    }
    this.setState({
      nextDisabled: false,
      isCreating: false,
      createSuccess: true,
      index: index+1
    });
  }

  validatePassword(pin1, pin2) {
    console.log(`pin1: ${pin1} pin2: ${pin2}`);
    if (pin1 == pin2) {
      return true;
    }
    return false;
  }

  //Onboarding Screens

  onboardingScreens = (
    setupType,
    classes,
    minEth,
    minDai,
    maxEth,
    maxDai,
    copied,
    mnemonic,
    index,
    nextDisabled,
    createSuccess,
    isCreating
  ) => {
    if (setupType == "onboard" || setupType == "createPin") {
      const screens = (classes, minEth, minDai, maxEth, maxDai, copied) => [
        {
          title: "Welcome to Your Dai Card!",
          message: `This is beta software, so if you run into any trouble 
                please contact us via our Support chat (accessible in the Settings screen).`,
          buttons: (
            <Grid>
              <Button
                onClick={this.handleClickNext}
                className={classes.button}
                variant="outlined"
                color="primary"
                size="small"
                disabled={nextDisabled}
              >
                Next
              </Button>
            </Grid>
          )
        },
        {
          title: "Your Password",
          message2: (
            <Grid>
              {createSuccess ? (
                <Typography>Success!</Typography>
              ):(
                <Typography>
                  To continue, please set a password. You will be prompted for
                  this password every time you access your card. We can't
                  recover this password for you, so don't forget it!
                </Typography>
              )}
            </Grid>
          ),
          extra: (
            <Grid wrap>
              {createSuccess ? (null):(
                <Grid container style={{ padding: "2% 2% 2% 2%" }} alignContent="center">
                  <TextField
                    className={classes.password}
                    id="filled-password-input"
                    label="Password"
                    type="password"
                    variant="outlined"
                    onBlur={evt => this.setState({ pin: evt.target.value })}
                  />
                  <TextField
                    id="filled-password-input"
                    label="Confirm Password"
                    className={classes.password}
                    type="password"
                    onBlur={evt => this.setState({ pin2: evt.target.value })}
                    variant="outlined"
                  />
                  <div style={{padding:"2% 2% 2% 2%"}}>
                    <Button
                      onClick={() =>
                        this.onSubmitOnboardOrCreate(
                          this.state.pin,
                          this.state.pin2
                        )
                      }
                      className={classes.button}
                      variant="outlined"
                      color="primary"
                      size="medium"
                      disabled={isCreating}
                    >
                      Create Password
                    </Button>
                    {isCreating && <CircularProgress size={24} />}
                  </div>
                </Grid>
              )}
            </Grid>
          ),
          buttons: (
            <Grid>
              <Button
                onClick={this.handleClickPrevious}
                className={classes.button}
                variant="outlined"
                color="primary"
                size="small"
                style={{ marginRight: "5px" }}
              >
                Back
              </Button>
              <Button
                onClick={this.handleClickNext}
                className={classes.button}
                variant="outlined"
                color="primary"
                size="small"
                disabled={nextDisabled} //should be changed to createSuccess
              >
                Next
              </Button>
            </Grid>
          )
        },
        {
          title: "Your Recovery Phrase",
          message: `This recovery phrase will allow you to recover your Card elsewhere. Be sure to write it down before you deposit money.`,
          extra: (
            <Grid container style={{ padding: "2% 2% 2% 2%" }}>
              <CopyToClipboard text={mnemonic} color="primary">
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
                      <span>{mnemonic}</span>
                    </Tooltip>
                  </Typography>
                </Button>
              </CopyToClipboard>
            </Grid>
          ),
          buttons: (
            <Grid>
              <Button
                onClick={this.handleClickPrevious}
                className={classes.button}
                variant="outlined"
                color="primary"
                size="small"
                style={{ marginRight: "5px" }}
              >
                Back
              </Button>
              <Button
                onClick={this.handleClickNext}
                className={classes.button}
                variant="outlined"
                color="primary"
                size="small"
                disabled={nextDisabled} //should be changed to createSuccess
              >
                Next
              </Button>
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
                  Minimum deposit (covers gas costs):<br />
                </span>{" "}
                {minEth || "?.??"} ETH ({minDai || "?.??"})<br />
                <span style={{ fontWeight: "bold" }}>
                  Maximum deposit (for your protection):<br />
                </span>{" "}
                {maxEth || "?.??"} ETH ({maxDai || "?.??"})
              </p>
              <p>
              Don't have any ETH or need a refresher on how to send it?{" "}
              <a href="https://www.coinbase.com/">Coinbase</a> is a good place
              to get started.{" "}
            </p>
            </div>
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
          ),
          buttons: (
            <Grid>
              <Button
                onClick={this.handleClickPrevious}
                className={classes.button}
                variant="outlined"
                color="primary"
                size="small"
                style={{ marginRight: "5px" }}
              >
                Back
              </Button>
              <Button
                onClick={this.handleClickNext}
                className={classes.button}
                variant="outlined"
                color="primary"
                size="small"
                disabled={nextDisabled} //should be changed to createSuccess
              >
                Next
              </Button>
            </Grid>
          )
        },
        {
          title: "Adding Funds - DAI",
          message: `If you'd like to deposit DAI directly, there are no deposit maximums. However, make sure to also send at least ${minEth ||
            "?.??"} ETH (${minDai || "?.??"}) for gas.`,
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
          ),
          buttons: (
            <Grid>
              <Button
                onClick={this.handleClickPrevious}
                className={classes.button}
                variant="outlined"
                color="primary"
                size="small"
                style={{ marginRight: "5px" }}
              >
                Back
              </Button>
              <Button
                onClick={this.handleClose}
                className={classes.button}
                variant="outlined"
                color="primary"
                size="small"
                disabled={nextDisabled} //should be changed to createSuccess
              >
                Got it!
              </Button>
            </Grid>
          )
        }
      ];
      return screens(classes, minEth, minDai, maxEth, maxDai, copied, mnemonic);
    } else if (setupType == "inputPin") {
      const screens = [
        {
          title: "Welcome!",
          message2: `Please enter your password`,
          extra: (
            <Grid container style={{ padding: "2% 2% 2% 2%" }}>
              <TextField
              fullWidth
                    className={classes.passwordInput}
                    id="filled-password-input"
                    label="Password"
                    type="password"
                    variant="outlined"
                    onBlur={evt => this.setState({ pin: evt.target.value })}
                />
              <Button
                fullWidth
                onClick={() => this.onSubmitInputPin(this.state.pin)}
                className={classes.button}
                variant="outlined"
                color="primary"
                size="large"
              >
                Submit
              </Button>
            </Grid>
          )
        }
      ];
      return screens;
    } else {
      throw "error creating onboarding screens";
    }
  };

  //HANDLERS

  handleGenerateMnemonic = () => {
    const mnemonic = generateMnemonic();
    return mnemonic;
  };
  handleDecryptMnemonic = () => {
    const encrypted = localStorage.getItem("encryptedMnemonic");
    if (encrypted && this.state.pin) {
      const mnemonic = decryptMnemonic(encrypted, this.state.pin);
      return mnemonic;
    }
    return "Mnemonic not set. Please go back and set a password!";
  };

  handleClickOpen = () => {
    this.setState({ open: true });
  };

  handleClickNext = () => {
    const { index } = this.state;
    if (index == 0) {
      this.setState({ index: index + 1, nextDisabled: true });
    }
    this.setState({ index: index + 1 });
  };

  handleClickPrevious = () => {
    const { index, nextDisabled } = this.state;
    if(nextDisabled){
      this.setState({nextDisabled:false});
    }
    this.setState({ index: index - 1 });
  };

  handleClose = () => {
    this.setState({ open: false });
    this.props.setCard(false);
  };

  //LIFECYCLE

  componentWillMount = () => {
    console.log(`setup type: ${this.state.type}`);
  };

  render() {
    const {
      classes,
      connextState,
      browserMinimumBalance,
      maxTokenDeposit,
      setupType
    } = this.props;
    const {
      index,
      open,
      copied,
      pin,
      pin2,
      type,
      nextDisabled,
      createSuccess,
      isCreating
    } = this.state;

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

    // const mnemonic = this.handleGenerateMnemonic();
    const mnemonic = this.handleDecryptMnemonic() || "{}";

    //setup type
    const display = this.onboardingScreens(
      type,
      classes,
      minEth,
      minDai,
      maxEth,
      maxDai,
      copied,
      mnemonic,
      index,
      nextDisabled,
      createSuccess,
      isCreating
    );

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
              <DialogContent>
                  {display[index].message2 ? (
                    <DialogContentText variant="body1">
                      {display[index].message2}
                    </DialogContentText>
                  ) : null}
                </DialogContent>

              {display[index].extra && (
                <Grid item xs={12} style={{marginTop:"-4%"}}>
                  {display[index].extra}
                </Grid>
              )}

              <DialogContent>
                <Grid item xs={12} style={{ padding: "2% 2% 10% 2%" }}>
                  <DialogContentText variant="body1">
                    {display[index].message}
                  </DialogContentText>
                </Grid>
              </DialogContent>
              {display[index].buttons && (
                <Grid
                  item
                  xs={12}
                  style={{
                    position: "absolute",
                    right: "20px",
                    bottom: "20px"
                  }}
                >
                  {display[index].buttons}
                </Grid>
              )}
            </Grid>
          </Dialog>
        )}
      </Grid>
    );
  }
}

export default withStyles(styles)(SetupCard);


