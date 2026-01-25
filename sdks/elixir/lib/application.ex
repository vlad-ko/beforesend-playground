defmodule BeforeSendPlayground.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {Plug.Cowboy, scheme: :http, plug: BeforeSendPlayground.Router, options: [port: 5011]}
    ]

    IO.puts("Elixir SDK service listening on port 5011")

    opts = [strategy: :one_for_one, name: BeforeSendPlayground.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
