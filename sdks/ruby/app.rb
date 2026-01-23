# frozen_string_literal: true

require 'sinatra'
require 'json'

# Configure Sinatra for API mode
set :bind, '0.0.0.0'
set :port, 5004
set :environment, :production

# Disable all protection middleware for API usage
disable :protection

# Transform endpoint
# Receives an event and beforeSend code, applies the transformation
post '/transform' do
  content_type :json

  begin
    request.body.rewind
    data = JSON.parse(request.body.read)

    unless data['event'] && data['beforeSendCode']
      return [
        400,
        { success: false, error: 'Missing event or beforeSendCode' }.to_json
      ]
    end

    event = data['event']
    before_send_code = data['beforeSendCode']

    # Execute the beforeSend code
    begin
      # Evaluate the code to get the lambda/proc
      before_send_fn = eval(before_send_code)

      unless before_send_fn.respond_to?(:call)
        return [
          400,
          { success: false, error: 'beforeSend code must return a callable (lambda/proc)' }.to_json
        ]
      end
    rescue SyntaxError, StandardError => e
      return [
        400,
        { success: false, error: "Failed to parse beforeSend code: #{e.message}" }.to_json
      ]
    end

    # Apply the transformation
    begin
      # Clone the event to avoid mutation issues
      event_clone = JSON.parse(JSON.generate(event))

      # Execute the beforeSend function
      # Ruby lambdas enforce arity, so we need to check and call appropriately
      # beforeSend can accept (event, hint) or just (event)
      transformed_event = if before_send_fn.arity == 1
                            before_send_fn.call(event_clone)
                          else
                            before_send_fn.call(event_clone, {})
                          end

      { success: true, transformedEvent: transformed_event }.to_json
    rescue StandardError => e
      traceback = e.backtrace.join("\n")
      [
        500,
        {
          success: false,
          error: "Transformation error: #{e.message}",
          traceback: traceback,
          transformedEvent: nil
        }.to_json
      ]
    end
  rescue JSON::ParserError => e
    [
      400,
      { success: false, error: "Invalid JSON: #{e.message}" }.to_json
    ]
  rescue StandardError => e
    warn "Unexpected error: #{e.message}\n#{e.backtrace.join("\n")}"
    [
      500,
      { success: false, error: "Unexpected error: #{e.message}" }.to_json
    ]
  end
end

# Health check endpoint
get '/health' do
  content_type :json
  { status: 'healthy', sdk: 'ruby' }.to_json
end
