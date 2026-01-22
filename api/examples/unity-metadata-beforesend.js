// JavaScript beforeSend example
// Cleans up Unity/Android metadata pollution from exception messages

(event, hint) => {
  if (event.exception && event.exception.values) {
    for (const exception of event.exception.values) {
      // Check if metadata is polluting the exception value
      if (exception.value &&
          (exception.value.includes('Unity version') ||
           exception.value.includes('Device model') ||
           exception.value.includes('Device fingerprint'))) {

        // Extract actual exception type using regex
        const match = exception.value.match(/([\w\.]+(?:Exception|Error))/);

        if (match) {
          // Found the real exception - use it
          exception.type = match[1];
          exception.value = match[1];
        } else {
          // No exception found - use generic but descriptive title
          exception.type = 'NativeCrash';
          exception.value = 'Android Native Crash';
        }
      }
    }
  }

  return event;
}
