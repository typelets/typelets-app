import { Platform } from 'react-native';
import { APP_VERSION } from './src/constants/version';

// Initialize New Relic with error handling
try {
  const NewRelicModule = require('newrelic-react-native-agent');
  const NewRelic = NewRelicModule.default || NewRelicModule;

  if (NewRelic && NewRelic.startAgent) {
    let appToken;

    if (Platform.OS === 'ios') {
      appToken = 'AAc3e01a8a8dfd3e2fef5e493052472740f6b4efab-NRMA';
    } else {
      appToken = 'AA29e5cbf5c69abe369e2ceed761a18688dbc00d91-NRMA';
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

    NewRelic.startAgent(appToken, agentConfiguration);
    NewRelic.setJSAppVersion(APP_VERSION);

    if (__DEV__) {
      console.log('[New Relic] Agent started successfully with version:', APP_VERSION);
      console.log('[New Relic] Platform:', Platform.OS);
    }

    // Send initialization log to NewRelic
    if (NewRelic.logInfo) {
      NewRelic.logInfo('NewRelic agent initialized', {
        platform: Platform.OS,
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
      });
    }
  } else {
    console.warn('[New Relic] Agent module loaded but startAgent not available');
  }
} catch (error) {
  console.warn('[New Relic] Failed to initialize:', error.message);
}

import 'expo-router/entry';
