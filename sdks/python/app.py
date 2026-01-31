from flask import Flask, request, jsonify
import json
import sys
import traceback
import inspect

app = Flask(__name__)

@app.route('/transform', methods=['POST'])
def transform():
    """
    Transform endpoint
    Receives an event and beforeSend code, applies the transformation
    """
    try:
        data = request.get_json()

        if not data or 'event' not in data or 'beforeSendCode' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing event or beforeSendCode'
            }), 400

        event = data['event']
        before_send_code = data['beforeSendCode']

        # Execute the beforeSend code
        try:
            # Create a namespace with common imports available
            # This allows beforeSend code to use re, json, etc.
            import re
            global_namespace = {
                're': re,
                'json': json,
                '__builtins__': __builtins__
            }
            local_namespace = {}

            # Execute the code to define the beforeSend function
            exec(before_send_code, global_namespace, local_namespace)

            # Find the function (usually named 'before_send' or similar)
            before_send_fn = None
            for key, value in local_namespace.items():
                if callable(value) and not key.startswith('__'):
                    before_send_fn = value
                    break

            if before_send_fn is None:
                return jsonify({
                    'success': False,
                    'error': 'Could not find a callable function in beforeSend code'
                }), 400
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Failed to parse beforeSend code: {str(e)}'
            }), 400

        # Apply the transformation
        try:
            # Clone the event to avoid mutation issues
            event_clone = json.loads(json.dumps(event))

            # Check how many arguments the function takes
            # beforeSend takes (event, hint), tracesSampler takes just (sampling_context)
            sig = inspect.signature(before_send_fn)
            num_params = len(sig.parameters)

            # Execute the function with appropriate arguments
            if num_params == 1:
                # Single argument function (tracesSampler style)
                transformed_event = before_send_fn(event_clone)
            else:
                # Two argument function (beforeSend style)
                transformed_event = before_send_fn(event_clone, {})

            return jsonify({
                'success': True,
                'transformedEvent': transformed_event
            })
        except Exception as e:
            error_trace = traceback.format_exc()
            return jsonify({
                'success': False,
                'error': f'Transformation error: {str(e)}',
                'traceback': error_trace,
                'transformedEvent': None
            }), 500

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f'Unexpected error: {error_trace}', file=sys.stderr)
        return jsonify({
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }), 500

@app.route('/validate', methods=['POST'])
def validate():
    """
    Validate endpoint
    Validates beforeSend code for syntax errors without executing it
    """
    try:
        data = request.get_json()

        if not data or 'code' not in data:
            return jsonify({
                'valid': False,
                'errors': [{'message': 'Missing code parameter'}]
            }), 400

        code = data['code']
        errors = []

        try:
            # Use compile() to check syntax without executing
            compile(code, '<string>', 'exec')

            # If we get here, syntax is valid
            return jsonify({
                'valid': True,
                'errors': []
            })
        except SyntaxError as e:
            # Extract error details
            error_info = {
                'line': e.lineno,
                'column': e.offset,
                'message': str(e.msg)
            }
            errors.append(error_info)

            return jsonify({
                'valid': False,
                'errors': errors
            })
        except Exception as e:
            # Other compilation errors
            errors.append({'message': str(e)})
            return jsonify({
                'valid': False,
                'errors': errors
            })

    except Exception as e:
        print(f'Validation error: {str(e)}', file=sys.stderr)
        return jsonify({
            'valid': False,
            'errors': [{'message': f'Validation service error: {str(e)}'}]
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'sdk': 'python'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
