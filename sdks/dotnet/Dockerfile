FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine

WORKDIR /app

# Copy project files
COPY *.csproj ./
RUN dotnet restore

# Copy source code
COPY . .

# Build the application
RUN dotnet build -c Release --no-restore

EXPOSE 5002

CMD ["dotnet", "run", "--no-build", "-c", "Release"]
