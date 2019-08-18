import { IconButton, Snackbar, SnackbarContent, withStyles } from "@material-ui/core";
import { amber, green, red } from "@material-ui/core/colors";
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  HourglassFull as HourglassIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from "@material-ui/icons";
import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";

const variantIcon = {
  success: CheckCircleIcon,
  warning: HourglassIcon,
  error: ErrorIcon,
  info: InfoIcon
};

const styles = theme => ({
  success: {
    backgroundColor: green[600]
  },
  error: {
    backgroundColor: red[600]
  },
  warning: {
    backgroundColor: amber[700]
  },
  icon: {
    fontSize: 20
  },
  iconVariant: {
    opacity: 0.9,
    marginRight: theme.spacing(1)
  },
  message: {
    display: "flex",
    alignItems: "center"
  }
});

function MySnackbar(props) {
  const { classes, className, variant, openWhen, onClose, message, duration } = props;
  const Icon = variantIcon[variant];
  return (
    <Snackbar
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "center"
      }}
      open={openWhen}
      autoHideDuration={duration || 5000}
      onClose={onClose}
    >
      <SnackbarContent
        className={classNames(classes[variant], className)}
        aria-describedby="client-snackbar"
        message={
          <span id="client-snackbar" className={classes.message}>
            <Icon className={classNames(classes.icon, classes.iconVariant)} />
            {message}
          </span>
        }
        action={[
          <IconButton
            key="close"
            aria-label="Close"
            color="inherit"
            className={classes.close}
            onClick={onClose}
          >
            <CloseIcon className={classes.icon} />
          </IconButton>
        ]}
      />
    </Snackbar>
  );
}

MySnackbar.propTypes = {
  classes: PropTypes.object.isRequired,
  className: PropTypes.string,
  variant: PropTypes.oneOf(["success", "warning", "error"]).isRequired,
  openWhen: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  message: PropTypes.node.isRequired,
  duration: PropTypes.number
};

export default withStyles(styles)(MySnackbar);
