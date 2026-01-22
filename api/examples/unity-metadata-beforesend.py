# Python beforeSend example
# Cleans up Unity/Android metadata pollution from exception messages

import re

def before_send(event, hint):
    if 'exception' in event and 'values' in event['exception']:
        for exception in event['exception']['values']:
            # Check if metadata is polluting the exception value
            if (exception.get('value') and
                ('Unity version' in exception['value'] or
                 'Device model' in exception['value'] or
                 'Device fingerprint' in exception['value'])):

                # Extract actual exception type using regex
                match = re.search(r'([\w\.]+(?:Exception|Error))', exception['value'])

                if match:
                    # Found the real exception - use it
                    exception['type'] = match.group(1)
                    exception['value'] = match.group(1)
                else:
                    # No exception found - use generic but descriptive title
                    exception['type'] = 'NativeCrash'
                    exception['value'] = 'Android Native Crash'

    return event
