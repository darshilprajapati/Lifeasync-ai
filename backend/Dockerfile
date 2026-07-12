# Base runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

# SDK image for building the application
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files and restore dependencies
COPY ["LifeSyncAI.API/LifeSyncAI.API.csproj", "LifeSyncAI.API/"]
COPY ["LifeSyncAI.Core/LifeSyncAI.Core.csproj", "LifeSyncAI.Core/"]
RUN dotnet restore "LifeSyncAI.API/LifeSyncAI.API.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/LifeSyncAI.API"
RUN dotnet build "LifeSyncAI.API.csproj" -c Release -o /app/build

# Publish the build output
FROM build AS publish
RUN dotnet publish "LifeSyncAI.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final runtime image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# SQLite database storage directory configuration
ENV ConnectionStrings__DefaultConnection="Data Source=/app/data/lifesync.db"
RUN mkdir -p /app/data

ENTRYPOINT ["dotnet", "LifeSyncAI.API.dll"]
