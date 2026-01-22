"""
TDD tests for Python SDK transformation service.
These tests describe the desired behavior - implement to make them pass!
"""
import pytest
import json
from flask import Flask


@pytest.fixture
def client():
    """Create test client for Flask app."""
    try:
        from app import app
        app.config['TESTING'] = True
        with app.test_client() as client:
            yield client
    except Exception:
        # App not yet properly structured - return mock
        app = Flask(__name__)

        @app.route('/transform', methods=['POST'])
        def transform():
            return {'success': False, 'error': 'Not implemented'}, 501

        @app.route('/health', methods=['GET'])
        def health():
            return {'status': 'healthy', 'sdk': 'python'}, 200

        app.config['TESTING'] = True
        with app.test_client() as client:
            yield client


class TestTransformEndpoint:
    """Tests for POST /transform endpoint."""

    def test_transform_with_valid_beforesend(self, client):
        """Should transform event with valid beforeSend code."""
        event = {
            'exception': {
                'values': [{
                    'type': 'ValueError',
                    'value': 'Original error'
                }]
            }
        }

        before_send_code = """
def before_send(event, hint):
    event['exception']['values'][0]['value'] = 'Modified error'
    return event
"""

        response = client.post(
            '/transform',
            data=json.dumps({
                'event': event,
                'beforeSendCode': before_send_code
            }),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['transformedEvent'] is not None
        assert data['transformedEvent']['exception']['values'][0]['value'] == 'Modified error'

    def test_transform_returns_none_drops_event(self, client):
        """Should handle beforeSend that returns None (drop event)."""
        event = {
            'exception': {
                'values': [{
                    'type': 'ValueError',
                    'value': 'Test error'
                }]
            }
        }

        before_send_code = """
def before_send(event, hint):
    return None
"""

        response = client.post(
            '/transform',
            data=json.dumps({
                'event': event,
                'beforeSendCode': before_send_code
            }),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['transformedEvent'] is None

    def test_missing_event_returns_400(self, client):
        """Should return 400 if event is missing."""
        response = client.post(
            '/transform',
            data=json.dumps({
                'beforeSendCode': 'def before_send(event, hint): return event'
            }),
            content_type='application/json'
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Missing' in data['error']

    def test_missing_beforesend_code_returns_400(self, client):
        """Should return 400 if beforeSendCode is missing."""
        response = client.post(
            '/transform',
            data=json.dumps({
                'event': {}
            }),
            content_type='application/json'
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Missing' in data['error']

    def test_invalid_python_syntax_returns_400(self, client):
        """Should return 400 for invalid Python syntax."""
        event = {
            'exception': {
                'values': [{
                    'type': 'ValueError',
                    'value': 'Test error'
                }]
            }
        }

        before_send_code = 'invalid python syntax {'

        response = client.post(
            '/transform',
            data=json.dumps({
                'event': event,
                'beforeSendCode': before_send_code
            }),
            content_type='application/json'
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'parse' in data['error'].lower()

    def test_runtime_error_returns_500(self, client):
        """Should return 500 for runtime errors in beforeSend."""
        event = {
            'exception': {
                'values': [{
                    'type': 'ValueError',
                    'value': 'Test error'
                }]
            }
        }

        before_send_code = """
def before_send(event, hint):
    raise Exception('Runtime error')
"""

        response = client.post(
            '/transform',
            data=json.dumps({
                'event': event,
                'beforeSendCode': before_send_code
            }),
            content_type='application/json'
        )

        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'Transformation error' in data['error']
        assert 'traceback' in data  # Should include traceback

    def test_preserve_event_structure(self, client):
        """Should preserve event structure when beforeSend returns event unchanged."""
        event = {
            'event_id': '456',
            'exception': {
                'values': [{
                    'type': 'ValueError',
                    'value': 'Test error',
                    'stacktrace': {
                        'frames': [
                            {'filename': 'app.py', 'lineno': 20}
                        ]
                    }
                }]
            },
            'contexts': {
                'os': {'name': 'Linux', 'version': '5.10'}
            }
        }

        before_send_code = """
def before_send(event, hint):
    return event
"""

        response = client.post(
            '/transform',
            data=json.dumps({
                'event': event,
                'beforeSendCode': before_send_code
            }),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['transformedEvent'] == event

    def test_add_custom_properties(self, client):
        """Should handle beforeSend that adds custom properties."""
        event = {
            'exception': {
                'values': [{
                    'type': 'ValueError',
                    'value': 'Test error'
                }]
            }
        }

        before_send_code = """
def before_send(event, hint):
    event['tags'] = {'custom': 'tag'}
    event['extra'] = {'info': 'data'}
    return event
"""

        response = client.post(
            '/transform',
            data=json.dumps({
                'event': event,
                'beforeSendCode': before_send_code
            }),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['transformedEvent']['tags'] == {'custom': 'tag'}
        assert data['transformedEvent']['extra'] == {'info': 'data'}

    def test_complex_unity_metadata_cleanup(self, client):
        """Should handle Unity metadata cleanup with complex logic."""
        event = {
            'exception': {
                'values': [{
                    'type': 'Error',
                    'value': 'FATAL EXCEPTION [Thread-94] Unity version : 6000.2.14f1 Device model : realme android.content.res.Resources$NotFoundException'
                }]
            }
        }

        before_send_code = """
import re

def before_send(event, hint):
    if 'exception' in event and 'values' in event['exception']:
        for exception in event['exception']['values']:
            if exception.get('value') and 'Unity version' in exception['value']:
                match = re.search(r'([\\w\\.]+(?:Exception|Error))', exception['value'])
                if match:
                    exception['type'] = match.group(1)
                    exception['value'] = match.group(1)
                else:
                    exception['type'] = 'NativeCrash'
                    exception['value'] = 'Android Native Crash'
    return event
"""

        response = client.post(
            '/transform',
            data=json.dumps({
                'event': event,
                'beforeSendCode': before_send_code
            }),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        # Should extract the actual exception type
        assert 'NotFoundException' in data['transformedEvent']['exception']['values'][0]['type']


class TestHealthEndpoint:
    """Tests for GET /health endpoint."""

    def test_health_check(self, client):
        """Should return health status."""
        response = client.get('/health')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'
        assert data['sdk'] == 'python'
