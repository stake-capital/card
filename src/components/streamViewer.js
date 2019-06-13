import * as Connext from 'connext';
import React, { Component } from "react";
import PropTypes from 'prop-types'; 
import Button from "@material-ui/core/Button";
import RemoveRedEye from "@material-ui/icons/RemoveRedEye";
import Block from "@material-ui/icons/Block";
import * as eth from 'ethers';
import {
  withStyles,
  Grid,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from "@material-ui/core";
import interval from "interval-promise";
import Web3 from "web3";
import { Link } from "react-router-dom";
import MySnackbar from "./snackBar";
import { getOwedBalanceInDAI } from "../utils/currencyFormatting";
import { drizzleConnect } from 'drizzle-react';

const Big = (n) => eth.utils.bigNumberify(n.toString())
const convertPayment = Connext.convert.Payment
const emptyAddress = eth.constants.AddressZero

const styles = theme => ({
  button: {
    backgroundColor: "#FCA311",
    color: "#FFF"
  },
  streamIframe: {
    width: "calc(100vw - 24px)",
    height: "calc(46vw - 13.5px)",
    maxWidth: "442px",
    maxHeight: "248.6px"
  },
  streamBlocker: {
    width: "calc(100vw - 24px)",
    height: "calc(46vw - 13.5px)",
    maxWidth: "442px",
    maxHeight: "248.6px",
    backgroundColor: "#CCCC",
    textAlign: "center",
    position: "relative"
  },
  streamBlockerTextSpacer: {
    height: "calc(23vw - 6.75px)",
    maxHeight: "124.3px"
  },
  streamBlockerText: {
    paddingLeft: "10%",
    paddingRight: "10%",
    display: "table",
    position: "absolute",
    top: "0",
    left: "0",
    height: "100%",
    width: "80%"
  },
  streamBlockerTextInner: {
    display: "table-cell",
    verticalAlign: "middle"
  }
});

const PaymentStates = {
  None: 0,
  Collateralizing: 1,
  CollateralTimeout: 2,
  OtherError: 3,
  Success: 4
};

// possible returns of requesting collateral
// payment succeeded
// monitoring requests timed out, still no collateral
// appropriately collateralized
const CollateralStates = {
  PaymentMade: 0,
  Timeout: 1,
  Success: 2
};

function ConfirmationDialogText(paymentState, amountToken, recipient) {
  switch (paymentState) {
    case PaymentStates.Collateralizing:
      return (
        <Grid>
          <DialogTitle disableTypography>
            <Typography variant="h5" color="primary">
              Payment In Progress
            </Typography>
          </DialogTitle>
          <DialogContent>
            <DialogContentText variant="body1" style={{ color: "#0F1012", margin: "1em" }}>
              Recipient's Card is being set up. This should take 20-30 seconds.
            </DialogContentText>
            <DialogContentText variant="body1" style={{ color: "#0F1012" }}>
              If you stay on this page, your payment will be retried automatically. 
              If you navigate away or refresh the page, you will have to attempt the payment again yourself.
            </DialogContentText>
          <CircularProgress style={{ marginTop: "1em" }} />
          </DialogContent>
        </Grid>
      );
    case PaymentStates.CollateralTimeout:
      return (
        <Grid>
          <DialogTitle disableTypography>
            <Typography variant="h5" style={{ color: "#F22424" }}>
            Payment Failed
            </Typography>
          </DialogTitle>
          <DialogContent>
            <DialogContentText variant="body1" style={{ color: "#0F1012", margin: "1em" }}>
            After some time, recipient channel could not be initialized.
            </DialogContentText>
            <DialogContentText variant="body1" style={{ color: "#0F1012" }}>
            Is the receiver online to set up their Card? Please try your payment again later. If
              you have any questions, please contact support. (Settings -->
              Support)
            </DialogContentText>
          </DialogContent>
        </Grid>
      );
    case PaymentStates.OtherError:
      return (
        <Grid>
          <DialogTitle disableTypography>
            <Typography variant="h5" style={{ color: "#F22424" }}>
            Payment Failed
            </Typography>
          </DialogTitle>
          <DialogContent>
            <DialogContentText variant="body1" style={{ color: "#0F1012", margin: "1em" }}>
            An unknown error occured when making your payment.
            </DialogContentText>
            <DialogContentText variant="body1" style={{ color: "#0F1012" }}>
            Please try again in 30s and contact support if you continue to
              experience issues. (Settings --> Support)
            </DialogContentText>
          </DialogContent>
        </Grid>
      );
    case PaymentStates.Success:
      return (
        <Grid>
          <DialogTitle disableTypography>
            <Typography variant="h5" style={{ color: "#009247" }}>
            Payment Success!
            </Typography>
          </DialogTitle>
          <DialogContent>
            <DialogContentText variant="body1" style={{ color: "#0F1012", margin: "1em" }}>
            Amount: ${amountToken}
            </DialogContentText>
            <DialogContentText variant="body1" style={{ color: "#0F1012" }}>
            To: {recipient.substr(0, 5)}...
            </DialogContentText>
          </DialogContent>
        </Grid>
      );
    case PaymentStates.None:
    default:
      return <div />;
  }
}

const PaymentConfirmationDialog = props => (
  <Dialog
    open={props.showReceipt}
    onBackdropClick={
      props.paymentState === PaymentStates.Collateralizing
        ? null
        : () => props.closeModal()
    }
    fullWidth
    style={{
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
    }}
  >
    <Grid
      container
      style={{
        backgroundColor: "#FFF",
        paddingTop: "10%",
        paddingBottom: "10%"
      }}
      justify="center"
    >
      {ConfirmationDialogText(
        props.paymentState,
        props.amountToken,
        props.recipient
      )}
      {props.paymentState === PaymentStates.Collateralizing ? (
        <></>
      ) : (
        <DialogActions>
          <Button
            color="primary"
            variant="outlined"
            size="medium"
            onClick={() => props.closeModal()}
          >
            Pay Again
          </Button>
          <Button
            style={{
              background: "#FFF",
              border: "1px solid #F22424",
              color: "#F22424",
              marginLeft: "5%"
            }}
            variant="outlined"
            size="medium"
            onClick={() => props.history.push("/")}
          >
            Home
          </Button>
        </DialogActions>
      )}
    </Grid>
  </Dialog>
);

class StreamViewer extends Component {
  constructor(props, context) {
    super(props);

    this.state = {
      streamViewingEnabled: false,
      paymentVal: {
        meta: {
          purchaseId: "payment"
          // memo: "",
        },
        payments: [
          {
            recipient: "",
            amountToken: "0",
            amountWei: "0",
          }
        ]
      },
      addressError: null,
      balanceError: null,
      paymentState: PaymentStates.None,
      showReceipt: false,
      currentStreamKey: null // Used to store the key corrosponding to the location of the stream data storage in the contract
    };

    // Save the Drizzle contracts to an easily accessible instance variable
    this.contracts = context.drizzle.contracts;
    // Only make the cacheCalls if Drizzle has been properly initialized
    if (props.drizzleStatus.initialized) {
      this.initialDrizzleCacheCalls(); // Make all of the cacheCalls to get Drizzle data setup for streams contract
    }
  }

  async componentDidMount() {    
    // Setup interval for continually billing the user while watching the stream
    setInterval(this.chargeTheUserForViewing, (1000 * 60));
  }

  /*
   * This function is used to make all of the needed initial calls to setup the streams data via Drizzle
   */
  initialDrizzleCacheCalls = async () => {
    // Make the cacheCall for `size` (represents the length of the stream author addresses array)
    this.contracts.dTokStreams.methods.size.cacheCall();
    // Wait until the `size` data has been loaded by the cacheCall
    await this.waitUntilConditionalFuncTrueHelper(() => (this.props.dTokStreams.size["0x0"] !== undefined));
    // Store the (now avaliable) `size` data into a variable
    const size = this.props.dTokStreams.size["0x0"].value;
    // Iterate over all of the stream author addresses in the addrLookUpTable
    for (let i = 0; i < size; i++) {
      // Make the cacheCall for each author address from the `addrLookUpTable` array
      const authorAddrDataLocation = this.contracts.dTokStreams.methods.addrLookUpTable.cacheCall(i);
      // Wait until the `addrLookUpTable` entry has been loaded by the cacheCall
      await this.waitUntilConditionalFuncTrueHelper(() => (this.props.dTokStreams.addrLookUpTable[authorAddrDataLocation] !== undefined));
      // Store the (now avaliable) `addrLookUpTable` entry data into a variable
      const streamAuthorAddr = this.props.dTokStreams.addrLookUpTable[authorAddrDataLocation];
      // Make the cacheCall for the stream data corrosponding to the author address from the current loop iteration
      const streamDataAddr = this.contracts.dTokStreams.methods.streams.cacheCall(streamAuthorAddr.value);
      // Store the stream (storage location) key to the component's state (for use displaying the streams dropdown)
      this.setState({ currentStreamKey: streamDataAddr });
    }
  }

  /*
   * This is a simple stateless helper function that awaits until the provided function returns true.
   */
  async waitUntilConditionalFuncTrueHelper(checkConditional) {
    // Define an async function for sleeping
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Loop until the checkConditional functions results in a true condition
    while (true) {
      if (checkConditional()) { break; }
      await sleep(100); // Sleep for 1/10 of a second
    }
  }

  chargeTheUserForViewing = async () => {
    const { streamViewingEnabled } = this.state;

    // Only bill the user if they are currently viewing the stream
    if (streamViewingEnabled) {

      // Set the price per minute
      const pricePerMinute = "0.01";

      // Set the amount to charge the user
      await this.setState(oldState => {
        oldState.paymentVal.payments[0].amountToken = Web3.utils.toWei(`${pricePerMinute}`, "ether");
        return oldState;
      });

      // Set the address to send the money to on the hub
      this.updateRecipientHandler("0xb939adca7cecd82dcfa20cb9d092a1d5efa31a58");

      // Execute the payment
      this.paymentHandler();
    }
  }

  async updatePaymentHandler(value) {
    // if there are more than 18 digits after the decimal, do not
    // count them.
    // throw a warning in the address error
    let balanceError = null
    const decimal = (
      value.startsWith('.') ? value.substr(1) : value.split('.')[1]
    )

    let tokenVal = value
    if (decimal && decimal.length > 18) {
      tokenVal = value.startsWith('.') ? value.substr(0, 19) : value.split('.')[0] + '.' + decimal.substr(0, 18)
      balanceError = `Value too precise! Using ${tokenVal}`
    }
    await this.setState(oldState => {
      oldState.paymentVal.payments[0].amountToken = value
        ? Web3.utils.toWei(`${tokenVal}`, "ether")
        : "0";
      if (balanceError) {
        oldState.balanceError = balanceError;
      }
      return oldState;
    });

    this.setState({ displayVal: value, });
  }

  async updateRecipientHandler(value) {
    this.setState(async oldState => {
      oldState.paymentVal.payments[0].recipient = value;

      return oldState;
    });
  }

  // validates recipient and payment amount
  // also sets the variables of these values in the state
  // returns the values it sets, to prevent async weirdness
  validatePaymentInput(paymentVal) {
    const address = paymentVal.payments[0].recipient;
    const payment = convertPayment("bn", paymentVal.payments[0]);
    const { channelState } = this.props;
    this.setState({ addressError: null, balanceError: null });

    let balanceError = null
    let addressError = null
    // validate that the token amount is within bounds
    if (payment.amountToken.gt(Big(channelState.balanceTokenUser))) {
      balanceError = "Insufficient balance in channel";
    }
    if (payment.amountToken.lte(Big(0)) ) {
      balanceError = "Please enter a payment amount above 0";
    }

    // validate recipient is valid address OR the empty address
    // recipient address can be empty
    const isValidRecipient = Web3.utils.isAddress(address) && (address !== emptyAddress);

    if (!isValidRecipient) {
      addressError = address + " is an invalid address";
    }

    this.setState({ balanceError, addressError });

    return { balanceError, addressError };
  }

  async paymentHandler() {
    const { connext } = this.props;
    const { paymentVal } = this.state;
    // check if the recipient needs collateral
    const needsCollateral = await connext.recipientNeedsCollateral(
      paymentVal.payments[0].recipient,
      convertPayment("str", { amountWei: paymentVal.payments[0].amountWei, amountToken: paymentVal.payments[0].amountToken })
    );
    // do not send collateral request if it is not valid
    // check if the values are reasonable
    // before beginning the request for collateral
    const { balanceError, addressError } = this.validatePaymentInput(
      paymentVal
    );
    if (addressError || balanceError) {
      return;
    }

    // needs collateral can indicate that the recipient does
    // not have a channel, or that it does not have current funds
    // in either case, you need to send a failed payment
    // to begin auto collateralization process
    if (needsCollateral) {
      // this can have 3 potential outcomes:
      // - collateralization failed (return)
      // - payment succeeded (return)
      // - channel collateralized
      const collateralizationStatus = await this.collateralizeRecipient(
        paymentVal
      );
      switch (collateralizationStatus) {
        // setting state for these cases done in collateralize
        case CollateralStates.PaymentMade:
        case CollateralStates.Timeout:
          return;
        case CollateralStates.Success:
        default:
        // send payment via fall through
      }
    }

    // send payment
    await this._sendPayment(paymentVal);
  }

  async collateralizeRecipient(paymentVal) {
    const { connext } = this.props;

    // collateralize otherwise
    this.setState({
      paymentState: PaymentStates.Collateralizing,
      showReceipt: true
    });

    // collateralize by sending payment
    const err = await this._sendPayment(paymentVal, true);
    // somehow it worked???
    if (!err) {
      this.setState({
        showReceipt: true,
        paymentState: PaymentStates.Success
      });
      return CollateralStates.PaymentMade;
    }

    // call to send payment failed, monitor collateral
    // watch for confirmation on the recipients side
    // of the channel for 20s
    let needsCollateral
    await interval(
      async (iteration, stop) => {
        // returns null if no collateral needed
        needsCollateral = await connext.recipientNeedsCollateral(
          paymentVal.payments[0].recipient,
          convertPayment("str", paymentVal.payments[0].amount)
        );
        if (!needsCollateral || iteration > 20) {
          stop();
        }
      },
      5000,
      { iterations: 20 }
    );

    if (needsCollateral) {
      this.setState({
        showReceipt: true,
        paymentState: PaymentStates.CollateralTimeout
      });
      return CollateralStates.Timeout;
    }

    return CollateralStates.Success;
  }

  // returns a string if there was an error, null
  // if successful
  async _sendPayment(paymentVal, isCollateralizing = false) {
    const { connext } = this.props;

    const { balanceError, addressError } = this.validatePaymentInput(
      paymentVal
    );
    // return if either errors exist
    // state is set by validator
    // mostly a sanity check, this should be done before calling
    // this function
    if (balanceError || addressError) {
      return;
    }

    // collateralizing is handled before calling this send payment fn
    // by payment you can call the appropriate type here
    try {
      await connext.buy(paymentVal);
      // display receipts
      this.setState({
        showReceipt: true,
        paymentState: PaymentStates.Success
      });
      return null;
    } catch (e) {
      if (!isCollateralizing) {
        // only assume errors if collateralizing
        console.log("Unexpected error sending payment:", e);
        this.setState({
          paymentState: PaymentStates.OtherError,
          showReceipt: true
        });
      }
      // setting state for collateralize handled in 'collateralizeRecipient'
      return e.message;
    }
  }

  closeModal = () => {
    this.setState({ showReceipt: false, paymentState: PaymentStates.None });
  };

  render() {
    const { connextState, classes, dTokStreams } = this.props;
    const { paymentState, paymentVal, showReceipt, sendError, streamViewingEnabled, currentStreamKey } = this.state;

    if (Object.keys(dTokStreams.streams).length < 1 || currentStreamKey === null) {
      return <div>No streams avaliable...</div>;
    }

    console.log(dTokStreams);

    return (
      <Grid
        container
        spacing={16}
        direction="column"
        style={{
          display: "flex",
          paddingLeft: 12,
          paddingRight: 12,
          paddingTop: "10%",
          paddingBottom: "10%",
          textAlign: "center",
          justify: "center"
        }}
      >
        <Grid item xs={12}>
          <Select
            fullWidth
            value={currentStreamKey}
            onChange={e => this.setState({ currentStreamKey: e.target.value })}
            style={{
              border: "1px solid #3CB8F2",
              color: "#3CB8F2",
              textAlign: "center",
              borderRadius: "4px",
              height: "45px"
            }}
            disableUnderline
            IconComponent={() => null}
          >
            {Object.keys(dTokStreams.streams).map(streamKey => (
              <MenuItem value={streamKey} key={streamKey}>{dTokStreams.streams[streamKey].value.title}</MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid
          container
          wrap="nowrap"
          direction="row"
          justify="center"
          alignItems="center"
        >
          <Grid item xs={12}>
            {(streamViewingEnabled && parseInt(getOwedBalanceInDAI(connextState, false)) > 0) &&
              <iframe title="stream" className={classes.streamIframe} src="http://media.livepeer.org/embed?aspectRatio=16%3A9&maxWidth=100%25&url=http%3A%2F%2Fd7eb1baa.ngrok.io%2Fstream%2Fa24de3ee390b3ddfc73882f4372fa86316bc484a69ae9dbe7b1bb9bad6502de7P720p30fps16x9.m3u8" allowFullScreen></iframe>
            }
            {((!streamViewingEnabled) && parseInt(getOwedBalanceInDAI(connextState, false)) > 0) &&
              <div className={classes.streamBlocker}>
                <div className={classes.streamBlockerTextSpacer} />
                <div className={classes.streamBlockerText}>
                  <div className={classes.streamBlockerTextInner}>
                    You must enable the stream below to watch. <span role="img" aria-label="">🙈</span>
                  </div>
                </div>
              </div>
            }
            {(parseInt(getOwedBalanceInDAI(connextState, false)) <= 0) &&
              <div className={classes.streamBlocker}>
                <div className={classes.streamBlockerTextSpacer} />
                <div className={classes.streamBlockerText}>
                  <div className={classes.streamBlockerTextInner}>
                    Your balance is empty! <span role="img" aria-label="">😲</span>
                  </div>
                </div>
              </div>
            }
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Grid container direction="row" justify="center" alignItems="center">
            <Typography variant="h2">
              <span>
                {getOwedBalanceInDAI(connextState, false)}
              </span>
            </Typography>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="body2">
            {(parseInt(getOwedBalanceInDAI(connextState, false)) <= 0) &&
              <span>
                Please click the button below to deposit DAI for viewing the stream.
              </span>
            }
            {(parseInt(getOwedBalanceInDAI(connextState, false)) > 0) &&
              <span>
                Viewing the stream (by clicking "Start Stream" below) will cost $0.02 per minute.
              </span>
            }
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Button
            fullWidth
            style={{
              color: "#FFF",
              backgroundColor: "#FCA311"
            }}
            size="large"
            variant="contained"
            onClick={() => 
              // Only enable viewing of the stream if the user has a non-zero balance.
              (parseInt(getOwedBalanceInDAI(connextState, false)) > 0) && this.setState({ streamViewingEnabled: !streamViewingEnabled })
            }
            {...( // We only want the button to function as a link to the /deposit page if the DAI balance is currently empty.
              (parseInt(getOwedBalanceInDAI(connextState, false)) <= 0) ?
                {
                  to: "/deposit",
                  component: Link
                }
              :
                {}
            )}
          >
            {(parseInt(getOwedBalanceInDAI(connextState, false)) <= 0) &&
              "Deposit DAI to View Stream"
            }
            {(parseInt(getOwedBalanceInDAI(connextState, false)) > 0) && (!streamViewingEnabled) &&
              "Start Stream"
            }
            {(parseInt(getOwedBalanceInDAI(connextState, false)) > 0) && streamViewingEnabled &&
              "Stop Stream"
            }
            {(parseInt(getOwedBalanceInDAI(connextState, false)) > 0) &&
              <RemoveRedEye style={{ marginLeft: "5px" }} />
            }
            {(parseInt(getOwedBalanceInDAI(connextState, false)) <= 0) &&
              <Block style={{ marginLeft: "5px" }} />
            }
          </Button>
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="outlined"
            style={{
              background: "#FFF",
              border: "1px solid #F22424",
              color: "#F22424",
              width: "15%"
            }}
            size="medium"
            onClick={() => this.props.history.push("/")}
          >
            Back
          </Button>
        </Grid>
        {/* We only show the PaymentConfirmationDialog if there was some kind of issue / error processing the payment. */}
        <PaymentConfirmationDialog
          showReceipt={showReceipt && (paymentState !== PaymentStates.Success)}
          sendError={sendError}
          amountToken={
            paymentVal.payments[0].amountToken
              ? Web3.utils.fromWei(
                  paymentVal.payments[0].amountToken
                )
              : "0"
          }
          recipient={paymentVal.payments[0].recipient}
          history={this.props.history}
          closeModal={this.closeModal}
          paymentState={paymentState}
        />
        {/* We show the MySnackbar component if the payment was successful. */}
        <MySnackbar
          variant="success"
          openWhen={showReceipt && (paymentState === PaymentStates.Success)}
          onClose={() => this.closeModal()}
          message="Successfully paid $0.02 for another minute of viewing! 👀"
          duration={5000}
        />
      </Grid>
    );
  }
}

StreamViewer.contextTypes = {
  drizzle: PropTypes.object,
};

const mapStateToProps = state => {
  return {
    drizzleStatus: state.drizzleStatus,
    dTokStreams: state.contracts.dTokStreams
  }
}

export default withStyles(styles)(drizzleConnect(StreamViewer, mapStateToProps));
