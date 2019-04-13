import React, { Component } from "react";
import Button from "@material-ui/core/Button";
import DepositIcon from "@material-ui/icons/AttachMoney";
import Tooltip from "@material-ui/core/Tooltip";
import { CopyToClipboard } from "react-copy-to-clipboard";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import QRGenerate from "./qrGenerate";
import MySnackbar from "./snackBar";
import { withStyles } from "@material-ui/core";
import { CurrencyType } from "connext/dist/state/ConnextState/CurrencyTypes";
import getExchangeRates from "connext/dist/lib/getExchangeRates";
import CurrencyConvertable from "connext/dist/lib/currency/CurrencyConvertable";
import Currency from "connext/dist/lib/currency/Currency";


const styles = theme => ({
  icon: {
    width: "40px",
    height: "40px"
  }
});

class DepositCard extends Component {
  constructor(props) {
    super(props);

    this.state = {
      value: "0",
      error: null,
      copied: false
    };
  }

  closeModal = async () => {
    await this.setState({ copied: false });
  };

  render() {
    const { classes, address, connextState, browserMinimumBalance, maxTokenDeposit } = this.props;
    const { copied, } = this.state;

    let minEth//, minDai
    let maxDai, maxEth
    if (connextState && connextState.runtime.canDeposit && browserMinimumBalance) {
      const minConvertable = new CurrencyConvertable(
        CurrencyType.WEI,
        browserMinimumBalance.wei,
        () => getExchangeRates(connextState)
      )

      const maxConvertable = new CurrencyConvertable(
        CurrencyType.BEI,
        maxTokenDeposit,
        () => getExchangeRates(connextState)
      )

      minEth = minConvertable.toETH().amountBigNumber.toFixed()
      //minDai = Currency.USD(browserMinimumBalance.dai).format({})
      maxEth = maxConvertable.toETH().amountBigNumber.toFixed()
      maxDai = Currency.USD(maxConvertable.toUSD().amountBigNumber).format({})
    }

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
          onClose={() => this.closeModal()}
          message="Copied!"
        />
        <Grid
          container
          wrap="nowrap"
          direction="row"
          justify="center"
          alignItems="center"
        >
          <Grid item xs={12}>
            <DepositIcon className={classes.icon} />
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="body2">
            <Tooltip
              disableFocusListener
              disableTouchListener
              title="This covers gas fees."
            >
              <span>{`Deposit minimum of: ${minEth || ""} Eth.`}</span>
            </Tooltip>
          </Typography>
        </Grid>
        <Grid item xs={12} margin="1em">
          <QRGenerate value={address} />
        </Grid>
        <Grid item xs={12}>
          <CopyToClipboard
            onCopy={() => this.setState({ copied: true })}
            text={address}
          >
            <Button variant="outlined" fullWidth>
              <Typography noWrap variant="body1">
                <Tooltip
                  disableFocusListener
                  disableTouchListener
                  title="Click to Copy"
                >
                  <span>{address}</span>
                </Tooltip>
              </Typography>
            </Button>
          </CopyToClipboard>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="body2">
            <span>{`Deposits over ${maxEth ? maxEth.substring(0, 4) : ""} Eth 
                      or ${maxDai ? maxDai.substring(1, 3) : ""} Dai will be refunded`}</span>
          </Typography>
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
      </Grid>
    );
  }
}

export default withStyles(styles)(DepositCard);
