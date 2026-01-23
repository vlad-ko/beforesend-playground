# Troubleshooting

## Common Issues

### SDK Container Won't Start

**Symptoms:**
- Container exits immediately
- `docker-compose ps` shows container as "Exited"

**Solutions:**

1. Check container logs:
   ```bash
   docker-compose logs sdk-javascript
   docker-compose logs sdk-python
   ```

2. Rebuild the container:
   ```bash
   docker-compose build sdk-javascript
   docker-compose up -d sdk-javascript
   ```

3. Check for port conflicts:
   ```bash
   # See what's using the port
   lsof -i :5000  # JavaScript SDK
   lsof -i :5001  # Python SDK
   ```

4. Clean rebuild:
   ```bash
   docker-compose down
   docker-compose build --no-cache sdk-javascript
   docker-compose up -d
   ```

### Port Conflicts

**Symptoms:**
- Error: "port is already allocated"
- Container fails to start

**Solutions:**

1. Change ports in `docker-compose.yml`:
   ```yaml
   ui:
     ports:
       - "3001:3000"  # Change 3000 → 3001

   api:
     ports:
       - "4001:4000"  # Change 4000 → 4001
   ```

2. Stop conflicting services:
   ```bash
   # Find what's using the port
   lsof -i :3000

   # Kill the process
   kill -9 <PID>
   ```

3. Use different ports for SDKs:
   ```yaml
   sdk-javascript:
     ports:
       - "6000:5000"  # External 6000, internal 5000
   ```

### Transformation Errors

**Symptoms:**
- Error: "Transformation failed"
- beforeSend code doesn't work

**Solutions:**

1. **Check syntax:**
   ```javascript
   // Bad - missing return
   (event, hint) => {
     event.tags = { test: true };
   }

   // Good - explicit return
   (event, hint) => {
     event.tags = { test: true };
     return event;
   }
   ```

2. **Check for null returns:**
   ```javascript
   // Drops the event (returns null)
   (event, hint) => {
     return null;
   }

   // Keeps the event
   (event, hint) => {
     return event;
   }
   ```

3. **Check SDK-specific syntax:**
   - JavaScript: `(event, hint) => { ... return event; }`
   - Python: `def before_send(event, hint): ... return event`
   - Ruby: `lambda do |event, hint| ... event end`

4. **View detailed errors:**
   ```bash
   # Check SDK logs for stack traces
   docker-compose logs -f sdk-javascript
   ```

### API Gateway Not Responding

**Symptoms:**
- UI shows "Network Error"
- Cannot reach http://localhost:4000

**Solutions:**

1. Check if API is running:
   ```bash
   docker-compose ps api
   ```

2. Check API logs:
   ```bash
   docker-compose logs api
   ```

3. Restart API:
   ```bash
   docker-compose restart api
   ```

4. Rebuild API:
   ```bash
   docker-compose build api
   docker-compose up -d api
   ```

### UI Not Loading

**Symptoms:**
- Blank page at http://localhost:3000
- "Cannot connect" error

**Solutions:**

1. Check if UI container is running:
   ```bash
   docker-compose ps ui
   ```

2. Check UI logs:
   ```bash
   docker-compose logs ui
   ```

3. Check for JavaScript errors:
   - Open browser DevTools (F12)
   - Check Console tab for errors

4. Rebuild UI:
   ```bash
   docker-compose build ui
   docker-compose up -d ui
   ```

5. Clear browser cache:
   - Chrome: Ctrl+Shift+Delete → Clear cache
   - Firefox: Ctrl+Shift+Delete → Clear cache

### Docker Issues

**Symptoms:**
- "Cannot connect to Docker daemon"
- "docker: command not found"

**Solutions:**

1. Ensure Docker is running:
   ```bash
   # macOS
   open -a Docker

   # Linux
   sudo systemctl start docker
   ```

2. Check Docker version:
   ```bash
   docker --version
   docker-compose --version
   ```

3. Restart Docker:
   ```bash
   # macOS: Quit and restart Docker Desktop
   # Linux:
   sudo systemctl restart docker
   ```

### Clean Slate Reset

**When nothing else works:**

```bash
# 1. Stop everything
docker-compose down -v

# 2. Remove all containers and images
docker system prune -a

# 3. Rebuild from scratch
docker-compose build --no-cache

# 4. Start fresh
docker-compose up -d

# 5. Check status
docker-compose ps
```

## Performance Issues

### Slow Transformations

**Causes:**
- Large event payloads
- Complex beforeSend code
- Resource constraints

**Solutions:**

1. Simplify beforeSend code
2. Reduce event size
3. Check Docker resource limits:
   ```bash
   docker stats
   ```

4. Increase Docker resources:
   - Docker Desktop → Settings → Resources
   - Increase CPU/Memory limits

### High Memory Usage

**Solutions:**

1. Check memory usage:
   ```bash
   docker stats
   ```

2. Restart containers:
   ```bash
   docker-compose restart
   ```

3. Limit container memory in `docker-compose.yml`:
   ```yaml
   sdk-javascript:
     deploy:
       resources:
         limits:
           memory: 512M
   ```

## Debugging Tips

### Enable Verbose Logging

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f api

# View last 100 lines
docker-compose logs --tail=100 sdk-python

# Follow new logs only
docker-compose logs -f --tail=0
```

### Inspect Running Containers

```bash
# List all containers
docker-compose ps

# Execute command in container
docker-compose exec api sh
docker-compose exec sdk-python bash

# View container details
docker inspect beforesend-playground-api-1
```

### Network Debugging

```bash
# Check network connectivity
docker-compose exec api ping sdk-python

# Check if port is accessible
docker-compose exec api curl http://sdk-javascript:5000/health

# View network details
docker network inspect beforesend-network
```

### Test SDK Directly

Bypass the UI and API Gateway:

```bash
# Test JavaScript SDK directly
curl -X POST http://localhost:5000/transform \
  -H "Content-Type: application/json" \
  -d '{
    "event": {"event_id": "test"},
    "beforeSendCode": "(event) => { event.tags = {test: true}; return event; }"
  }'

# Test Python SDK directly
curl -X POST http://localhost:5001/transform \
  -H "Content-Type: application/json" \
  -d '{
    "event": {"event_id": "test"},
    "beforeSendCode": "def before_send(event, hint):\n    event[\"tags\"] = {\"test\": True}\n    return event"
  }'
```

## Getting Help

1. Check container logs first
2. Try a clean rebuild
3. Search GitHub issues
4. Contact Sentry SE team
5. File a new issue with:
   - Error message
   - Container logs
   - Steps to reproduce
   - Docker version
   - OS version

## Known Issues

### macOS Silicon (M1/M2/M3)

Some SDK images may have platform compatibility issues:

```bash
# Force platform
docker-compose build --build-arg DOCKER_PLATFORM=linux/amd64
```

### Windows

Path separator issues in volume mounts. Ensure using forward slashes:

```yaml
volumes:
  - ./api:/app  # Correct
  - .\api:/app  # Wrong
```

### Network Issues

If containers can't communicate:

```bash
# Recreate network
docker network rm beforesend-network
docker network create beforesend-network
docker-compose up -d
```
