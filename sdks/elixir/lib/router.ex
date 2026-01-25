defmodule BeforeSendPlayground.Router do
  use Plug.Router
  use Plug.ErrorHandler

  plug(CORSPlug)
  plug(Plug.Logger)
  plug(:match)
  plug(Plug.Parsers, parsers: [:json], json_decoder: Jason)
  plug(:dispatch)

  post "/transform" do
    case conn.body_params do
      %{"event" => event, "beforeSendCode" => before_send_code} ->
        transform(conn, event, before_send_code)

      _ ->
        send_error(conn, 400, "Missing required fields: event, beforeSendCode")
    end
  end

  post "/validate" do
    case conn.body_params do
      %{"code" => code} ->
        validate(conn, code)

      _ ->
        send_error(conn, 400, "Missing required field: code")
    end
  end

  get "/health" do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, Jason.encode!(%{status: "healthy", sdk: "elixir"}))
  end

  match _ do
    send_resp(conn, 404, "Not found")
  end

  defp transform(conn, event, before_send_code) do
    try do
      # Clone the event to prevent mutation
      event_clone = event |> Jason.encode!() |> Jason.decode!()

      # Compile and execute the beforeSend function
      {result, _binding} =
        Code.eval_string(before_send_code, [event: event_clone, hint: %{}])

      # Check if result is a function
      transformed_event =
        cond do
          is_function(result, 2) ->
            # Call the function with event and hint
            apply(result, [event_clone, %{}])

          is_function(result, 1) ->
            # Call the function with just event
            apply(result, [event_clone])

          true ->
            # If not a function, assume it's the result itself
            result
        end

      conn
      |> put_resp_content_type("application/json")
      |> send_resp(
        200,
        Jason.encode!(%{
          success: true,
          transformedEvent: transformed_event
        })
      )
    rescue
      e in SyntaxError ->
        send_error(conn, 400, "Syntax error: #{Exception.message(e)}")

      e in CompileError ->
        send_error(conn, 400, "Compilation error: #{Exception.message(e)}")

      e in ArgumentError ->
        send_error(conn, 400, "Argument error: #{Exception.message(e)}")

      e ->
        stacktrace = Exception.format(:error, e, __STACKTRACE__)
        send_error(conn, 500, "Runtime error: #{Exception.message(e)}", stacktrace)
    end
  end

  defp validate(conn, code) do
    try do
      # Try to compile the code to check for syntax errors
      Code.compile_string(code)

      conn
      |> put_resp_content_type("application/json")
      |> send_resp(
        200,
        Jason.encode!(%{
          valid: true,
          errors: []
        })
      )
    rescue
      e in SyntaxError ->
        errors = [
          %{
            line: e.line,
            column: e.column,
            message: Exception.message(e)
          }
        ]

        conn
        |> put_resp_content_type("application/json")
        |> send_resp(
          200,
          Jason.encode!(%{
            valid: false,
            errors: errors
          })
        )

      e in CompileError ->
        errors = [
          %{
            line: e.line,
            column: nil,
            message: Exception.message(e)
          }
        ]

        conn
        |> put_resp_content_type("application/json")
        |> send_resp(
          200,
          Jason.encode!(%{
            valid: false,
            errors: errors
          })
        )

      e ->
        errors = [
          %{
            line: nil,
            column: nil,
            message: Exception.message(e)
          }
        ]

        conn
        |> put_resp_content_type("application/json")
        |> send_resp(
          200,
          Jason.encode!(%{
            valid: false,
            errors: errors
          })
        )
    end
  end

  defp send_error(conn, status, message, traceback \\ nil) do
    response =
      case traceback do
        nil -> %{success: false, error: message}
        _ -> %{success: false, error: message, traceback: traceback}
      end

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(status, Jason.encode!(response))
  end

  @impl Plug.ErrorHandler
  def handle_errors(conn, %{kind: _kind, reason: reason, stack: _stack}) do
    send_error(conn, conn.status, "Internal server error: #{inspect(reason)}")
  end
end
