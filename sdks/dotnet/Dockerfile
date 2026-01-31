FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine

WORKDIR /app

# Copy all project files first for restore
COPY *.csproj ./
COPY Tests/*.csproj ./Tests/
RUN dotnet restore
RUN dotnet restore Tests/Tests.csproj

# Copy source code
COPY . .

# Build the main application
RUN dotnet build -c Release --no-restore

# Build the test project
RUN dotnet build Tests/Tests.csproj -c Release --no-restore

EXPOSE 5002

CMD ["dotnet", "run", "--no-build", "-c", "Release"]
