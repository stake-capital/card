import React, { Component } from "react";
import Button from "@material-ui/core/Button";
import ReceiveIcon from "@material-ui/icons/SaveAlt";
import TextField from "@material-ui/core/TextField";
import Tooltip from "@material-ui/core/Tooltip";
import { CopyToClipboard } from "react-copy-to-clipboard";
import Typography from "@material-ui/core/Typography";
import * as eth from "ethers";
import QRGenerate from "./qrGenerate";
import { withStyles, Grid } from "@material-ui/core";
import MySnackbar from "./snackBar";
import Web3 from "web3";
import { getAmountInUSD } from "../utils/currencyFormatting";
import * as Connext from "connext";
import dai from "../assets/dai.svg";
import Maker from "../assets/Maker.svg";
import ConnextHorizontal from "../assets/ConnextHorizontal.svg";
import money2020 from "../assets/money2020.svg";

const mailgun = require("mailgun-js");
const { Big } = Connext.big;

const styles = theme => ({
  icon: {
    width: "40px",
    height: "40px"
  }
});

class ReceiveCard extends Component {
  constructor(props) {
    super(props);

    this.state = {
      amountToken: null,
      displayValue: "",
      error: null,
      qrUrl: this.generateQrUrl("0"),
      copied: false,
      dismissed: false
    };
  }

  sendMakerRequest = async() =>{
    const { publicUrl, address } = this.props;
    const APIKEY = "27afb88a0b59ef58eb92dd8cb1ca24e3" //process.env.MAILGUN_API_KEY
    const DOMAIN = 'money2020.connext.network'
    const mg = mailgun({apiKey: APIKEY, domain: DOMAIN});
    const url = `${publicUrl || "https:/"}/send?amountToken=1&recipient=${address || eth.constants.AddressZero}`;
    const data = {
      from: 'Dai Card <requests@money2020.connext.network>',
      to: 'hunter@connext.network', //dai2020@makerdao.com
      subject: `DAI REQUEST ${address || eth.constants.AddressZero}`,
      text: url
    };
    await mg.messages().send(data, function (error, body) {
      console.log(body);
    });
    console.log(`sent message`);
    this.props.history.push('/money2020confirmation')
  }

  closeModal = async () => {
    this.setState({ copied: false });
  };

  handleCopy = () => {
    const error = this.validatePayment();
    if (error) {
      this.setState({ copied: false });
      return;
    }
    this.setState({ copied: true });
  };

  validatePayment = () => {
    const { amountToken } = this.state;
    const { connextState, maxTokenDeposit } = this.props;
    let error = null;
    this.setState({ error: null });
    if (!amountToken) {
      error = "Please enter a valid amount";
      this.setState({ error });
      return error;
    }
    const tokenBig = Big(amountToken);
    const amount = {
      amountWei: "0",
      amountToken: maxTokenDeposit
    };
    if (tokenBig.gt(Big(amount.amountToken))) {
      error = `Channel balances are capped at ${getAmountInUSD(
        amount,
        connextState
      )}`;
    }
    if (tokenBig.lte(eth.constants.Zero)) {
      error = "Please enter a payment amount above 0";
    }

    this.setState({ error });
    return error;
  };

  updatePaymentHandler = async value => {
    // protect against precision errors
    const decimal = value.startsWith(".")
      ? value.substr(1)
      : value.split(".")[1];

    let error = null;
    let tokenVal = value;
    if (decimal && decimal.length > 18) {
      tokenVal = value.startsWith(".")
        ? value.substr(0, 19)
        : value.split(".")[0] + "." + decimal.substr(0, 18);
      error = `Value too precise! Using ${tokenVal}`;
    }
    this.setState({
      qrUrl: this.generateQrUrl(value),
      amountToken: Web3.utils.toWei(tokenVal, "ether"),
      displayValue: value,
      error
    });
  };

  generateQrUrl = value => {
    const { publicUrl, address } = this.props;
    // function should take a payment value
    // and convert it to the url with
    // appropriate strings to prefill a send
    // modal state (recipient, amountToken)
    const url = `${publicUrl || "https:/"}/send?amountToken=${value ||
      "0"}&recipient=${address || eth.constants.AddressZero}`;
    return url;
  };

  render() {
    const { classes } = this.props;
    const {
      qrUrl,
      error,
      displayValue,
      amountToken,
      copied,
      dismissed
    } = this.state;
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
          textAlign: "center",
          justifyContent: "center"
        }}
      >
        <MySnackbar
          variant="success"
          openWhen={copied}
          onClose={this.closeModal}
          message="Copied!"
        />

        {dismissed ? (
          <Grid container>
            <Grid
              container
              wrap="nowrap"
              direction="row"
              justify="center"
              alignItems="center"
            >
              <Grid item xs={12}>
                <ReceiveIcon className={classes.icon} />
              </Grid>
            </Grid>
            <Grid item xs={12} style={{ padding: "2% 0% 2% 0%" }}>
              <TextField
                fullWidth
                id="outlined-number"
                label="Amount"
                value={displayValue}
                type="number"
                margin="normal"
                variant="outlined"
                onChange={evt => this.updatePaymentHandler(evt.target.value)}
                error={error !== null}
                helperText={error}
              />
            </Grid>
            <Grid item xs={12} style={{ padding: "2% 2% 2% 2%" }}>
              <QRGenerate value={qrUrl} />
            </Grid>
            <Grid item xs={12} style={{ padding: "2% 0% 2% 0%" }}>
              {/* <CopyIcon style={{marginBottom: "2px"}}/> */}
              <CopyToClipboard
                onCopy={this.handleCopy}
                text={
                  (error == null || error.indexOf("too precise") !== -1) &&
                  amountToken != null
                    ? qrUrl
                    : ""
                }
              >
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={this.validatePayment}
                >
                  <Typography noWrap variant="body1">
                    <Tooltip
                      disableFocusListener
                      disableTouchListener
                      title="Click to Copy"
                    >
                      <span>{qrUrl}</span>
                    </Tooltip>
                  </Typography>
                </Button>
              </CopyToClipboard>
            </Grid>
            <Grid container justify="space-evenly">
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
          </Grid>
        ) : (
          <Grid container wrap="wrap" justify="center">
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
              <object data={Maker} type="image/svg+xml" style={{ width: "80px" }}>
                <img src="yourfallback.jpg" />
              </object>
            </Grid>
            <Grid
              container
              wrap="nowrap"
              direction="row"
              justify="center"
              alignItems="center"
              style={{ padding: "2% 0% 2% 0%" }}
            >
              <Typography xs={12} variant="h4">
                Get your first stablecoin!
              </Typography>
            </Grid>
            <Grid
              container
              wrap="nowrap"
              direction="row"
              justify="center"
              alignItems="center"
              style={{ padding: "5% 5% 5% 5%" }}
            >
              <Button
                variant="outlined"
                style={{
                  background: "#FFF",
                  border: "1px solid blue",
                  padding: "5% 20% 5% 20%",
                  boxShadow:"1px black"
                }}
                size="medium"
                onClick={() => this.sendMakerRequest()}
              >
                <Grid
                  container
                  wrap="wrap"
                  direction="row"
                  justify="center"
                  alignItems="center"
                >
                  <Typography style={{ color: "blue" }}>
                    Request 1 Dai &nbsp;
                  </Typography>
                  <object
                    data={dai}
                    type="image/svg+xml"
                    style={{ width: "20px" }}
                  >
                    <img src="yourfallback.jpg" />
                  </object>
                </Grid>
              </Button>
            </Grid>
            <Grid
              container
              justify="center"
              style={{ padding: "5% 5% 5% 5%" }}
            >
              <Button
                variant="outlined"
                style={{
                  background: "#FFF",
                  border: "1px solid #CCCCCC",
                  color: "#CCCCCC",
                  width: "15%",
                  marginRight: "10px"
                }}
                size="medium"
                onClick={() => this.setState({ dismissed: true })}
              >
                Dismiss
              </Button>
              {/* <Button
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
                Home
              </Button> */}
            </Grid>
          </Grid>
        )}
      </Grid>
    );
  }
}

export default withStyles(styles)(ReceiveCard);
