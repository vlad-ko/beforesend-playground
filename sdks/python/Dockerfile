FROM python:3.12-alpine

WORKDIR /app

# Install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

EXPOSE 5001

CMD ["python", "app.py"]
