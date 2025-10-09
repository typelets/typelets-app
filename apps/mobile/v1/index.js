import 'expo-router/entry';
import { Platform } from 'react-native';

// Initialize New Relic agent
try {
  const NewRelic = require('newrelic-react-native-agent');
  const { version } = require('./package.json');

  // New Relic tokens for iOS and Android
  let appToken;

  if (Platform.OS === 'ios') {
    appToken = 'AA4947ff8556e29649729eb4a51ec43c236e936603-NRMA';
  } else {
    appToken = 'AAd9a8f7117b043a06ea91e7f4afb65cf34344223f-NRMA';
  }

  const agentConfiguration = {
    // Android Specific
    // Optional: Enable or disable collection of event data.
    analyticsEventEnabled: true,

    // Optional: Enable or disable crash reporting.
    crashReportingEnabled: true,

    // Optional: Enable or disable interaction tracing. Trace instrumentation still occurs, but no traces are harvested.
    // This will disable default and custom interactions.
    interactionTracingEnabled: true,

    // Optional: Enable or disable reporting successful HTTP requests to the MobileRequest event type.
    networkRequestEnabled: true,

    // Optional: Enable or disable reporting network and HTTP request errors to the MobileRequestError event type.
    networkErrorRequestEnabled: true,

    // Optional: Enable or disable capture of HTTP response bodies for HTTP error traces, and MobileRequestError events.
    httpResponseBodyCaptureEnabled: true,

    // Optional: Enable or disable agent logging.
    loggingEnabled: true,

    // Optional: Specifies the log level. Omit this field for the default log level.
    // Options include: ERROR (least verbose), WARNING, INFO, VERBOSE, AUDIT (most verbose).
    logLevel: NewRelic.LogLevel.INFO,

    // iOS Specific
    // Optional: Enable/Disable automatic instrumentation of WebViews
    webViewInstrumentation: true,

    // Optional: Set a specific collector address for sending data. Omit this field for default address.
    // collectorAddress: "",

    // Optional: Set a specific crash collector address for sending crashes. Omit this field for default address.
    // crashCollectorAddress: ""
  };

  // Initialize New Relic agent
  if (NewRelic && NewRelic.startAgent) {
    NewRelic.startAgent(appToken, agentConfiguration);
    NewRelic.setJSAppVersion(version);
  }
} catch (error) {
  // Silently fail if New Relic initialization fails
}
