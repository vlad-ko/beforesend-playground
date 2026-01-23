# frozen_string_literal: true

require 'rack/test'
require 'json'

# TDD tests for Ruby SDK transformation service.
# These tests describe the desired behavior - implement to make them pass!

RSpec.describe 'Ruby SDK Transform Service' do
  include Rack::Test::Methods

  def app
    Sinatra::Application
  end

  describe 'POST /transform' do
    context 'with valid beforeSend code' do
      it 'transforms event with valid beforeSend code' do
        event = {
          'exception' => {
            'values' => [{
              'type' => 'StandardError',
              'value' => 'Original error'
            }]
          }
        }

        before_send_code = <<~RUBY
          lambda do |event, hint|
            event['exception']['values'][0]['value'] = 'Modified error'
            event
          end
        RUBY

        post '/transform',
             { event: event, beforeSendCode: before_send_code }.to_json,
             { 'CONTENT_TYPE' => 'application/json' }

        expect(last_response.status).to eq(200)
        data = JSON.parse(last_response.body)
        expect(data['success']).to be true
        expect(data['transformedEvent']).not_to be_nil
        expect(data['transformedEvent']['exception']['values'][0]['value']).to eq('Modified error')
      end

      it 'handles beforeSend that returns nil (drops event)' do
        event = {
          'exception' => {
            'values' => [{
              'type' => 'StandardError',
              'value' => 'Test error'
            }]
          }
        }

        before_send_code = <<~RUBY
          lambda do |event, hint|
            nil
          end
        RUBY

        post '/transform',
             { event: event, beforeSendCode: before_send_code }.to_json,
             { 'CONTENT_TYPE' => 'application/json' }

        expect(last_response.status).to eq(200)
        data = JSON.parse(last_response.body)
        expect(data['success']).to be true
        expect(data['transformedEvent']).to be_nil
      end

      it 'preserves event structure when beforeSend returns event unchanged' do
        event = {
          'event_id' => '456',
          'exception' => {
            'values' => [{
              'type' => 'StandardError',
              'value' => 'Test error',
              'stacktrace' => {
                'frames' => [
                  { 'filename' => 'app.rb', 'lineno' => 20 }
                ]
              }
            }]
          },
          'contexts' => {
            'os' => { 'name' => 'Linux', 'version' => '5.10' }
          }
        }

        before_send_code = <<~RUBY
          lambda do |event, hint|
            event
          end
        RUBY

        post '/transform',
             { event: event, beforeSendCode: before_send_code }.to_json,
             { 'CONTENT_TYPE' => 'application/json' }

        expect(last_response.status).to eq(200)
        data = JSON.parse(last_response.body)
        expect(data['success']).to be true
        expect(data['transformedEvent']).to eq(event)
      end

      it 'handles beforeSend that adds custom properties' do
        event = {
          'exception' => {
            'values' => [{
              'type' => 'StandardError',
              'value' => 'Test error'
            }]
          }
        }

        before_send_code = <<~RUBY
          lambda do |event, hint|
            event['tags'] = { 'custom' => 'tag' }
            event['extra'] = { 'info' => 'data' }
            event
          end
        RUBY

        post '/transform',
             { event: event, beforeSendCode: before_send_code }.to_json,
             { 'CONTENT_TYPE' => 'application/json' }

        expect(last_response.status).to eq(200)
        data = JSON.parse(last_response.body)
        expect(data['success']).to be true
        expect(data['transformedEvent']['tags']).to eq({ 'custom' => 'tag' })
        expect(data['transformedEvent']['extra']).to eq({ 'info' => 'data' })
      end

      it 'handles complex Unity metadata cleanup' do
        event = {
          'exception' => {
            'values' => [{
              'type' => 'Error',
              'value' => 'FATAL EXCEPTION [Thread-94] Unity version : 6000.2.14f1 Device model : realme android.content.res.Resources$NotFoundException'
            }]
          }
        }

        before_send_code = <<~RUBY
          lambda do |event, hint|
            if event['exception'] && event['exception']['values']
              event['exception']['values'].each do |exception|
                if exception['value'] && exception['value'].include?('Unity version')
                  match = exception['value'].match(/([\\w\\.]+(?:Exception|Error))/)
                  if match
                    exception['type'] = match[1]
                    exception['value'] = match[1]
                  else
                    exception['type'] = 'NativeCrash'
                    exception['value'] = 'Android Native Crash'
                  end
                end
              end
            end
            event
          end
        RUBY

        post '/transform',
             { event: event, beforeSendCode: before_send_code }.to_json,
             { 'CONTENT_TYPE' => 'application/json' }

        expect(last_response.status).to eq(200)
        data = JSON.parse(last_response.body)
        expect(data['success']).to be true
        expect(data['transformedEvent']['exception']['values'][0]['type']).to include('NotFoundException')
      end
    end

    context 'with invalid input' do
      it 'returns 400 if event is missing' do
        post '/transform',
             { beforeSendCode: 'lambda { |event, hint| event }' }.to_json,
             { 'CONTENT_TYPE' => 'application/json' }

        expect(last_response.status).to eq(400)
        data = JSON.parse(last_response.body)
        expect(data['success']).to be false
        expect(data['error']).to include('Missing')
      end

      it 'returns 400 if beforeSendCode is missing' do
        post '/transform',
             { event: {} }.to_json,
             { 'CONTENT_TYPE' => 'application/json' }

        expect(last_response.status).to eq(400)
        data = JSON.parse(last_response.body)
        expect(data['success']).to be false
        expect(data['error']).to include('Missing')
      end

      it 'returns 400 for invalid Ruby syntax' do
        event = {
          'exception' => {
            'values' => [{
              'type' => 'StandardError',
              'value' => 'Test error'
            }]
          }
        }

        before_send_code = 'invalid ruby syntax {'

        post '/transform',
             { event: event, beforeSendCode: before_send_code }.to_json,
             { 'CONTENT_TYPE' => 'application/json' }

        expect(last_response.status).to eq(400)
        data = JSON.parse(last_response.body)
        expect(data['success']).to be false
        expect(data['error'].downcase).to include('parse')
      end
    end

    context 'with runtime errors' do
      it 'returns 500 for runtime errors in beforeSend' do
        event = {
          'exception' => {
            'values' => [{
              'type' => 'StandardError',
              'value' => 'Test error'
            }]
          }
        }

        before_send_code = <<~RUBY
          lambda do |event, hint|
            raise StandardError, 'Runtime error'
          end
        RUBY

        post '/transform',
             { event: event, beforeSendCode: before_send_code }.to_json,
             { 'CONTENT_TYPE' => 'application/json' }

        expect(last_response.status).to eq(500)
        data = JSON.parse(last_response.body)
        expect(data['success']).to be false
        expect(data['error']).to include('Transformation error')
        expect(data['traceback']).not_to be_nil
      end
    end
  end

  describe 'GET /health' do
    it 'returns health status' do
      get '/health'

      expect(last_response.status).to eq(200)
      data = JSON.parse(last_response.body)
      expect(data['status']).to eq('healthy')
      expect(data['sdk']).to eq('ruby')
    end
  end
end
