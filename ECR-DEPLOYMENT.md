# ECR Deployment Guide

This guide will help you deploy the Mindr application containers to Amazon ECR.

## Prerequisites

1. **Install AWS CLI v2**:
   ```bash
   # macOS
   curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
   sudo installer -pkg AWSCLIV2.pkg -target /
   
   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   
   # Windows
   # Download and run: https://awscli.amazonaws.com/AWSCLIV2.msi
   ```

2. **Configure AWS credentials**:
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, Region, and output format
   ```

3. **Verify AWS setup**:
   ```bash
   aws sts get-caller-identity
   # Should return your AWS account details
   ```

## Deployment Steps

### Option 1: Automated Deployment Script

Run the deployment script with your AWS details:

```bash
# Using defaults (us-east-1 region, auto-detect account ID)
./deploy-to-ecr.sh

# Specify region and account ID
./deploy-to-ecr.sh us-west-2 123456789012
```

The script will:
- ✅ Create ECR repositories if they don't exist
- 🔐 Authenticate Docker to ECR  
- 🏗️ Build and push both backend and frontend images
- 📋 Provide deployment URIs for use in ECS/EKS

### Option 2: Manual Steps

1. **Create ECR repositories**:
   ```bash
   aws ecr create-repository --repository-name mindr-backend --region us-east-1
   aws ecr create-repository --repository-name mindr-frontend --region us-east-1
   ```

2. **Authenticate Docker to ECR**:
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [ACCOUNT-ID].dkr.ecr.us-east-1.amazonaws.com
   ```

3. **Build and push images**:
   ```bash
   # Backend
   docker build -t mindr-backend ./backend
   docker tag mindr-backend:latest [ACCOUNT-ID].dkr.ecr.us-east-1.amazonaws.com/mindr-backend:latest
   docker push [ACCOUNT-ID].dkr.ecr.us-east-1.amazonaws.com/mindr-backend:latest
   
   # Frontend  
   docker build -t mindr-frontend ./frontend
   docker tag mindr-frontend:latest [ACCOUNT-ID].dkr.ecr.us-east-1.amazonaws.com/mindr-frontend:latest
   docker push [ACCOUNT-ID].dkr.ecr.us-east-1.amazonaws.com/mindr-frontend:latest
   ```

## Testing ECR Images Locally

After pushing to ECR, test the images locally:

```bash
# Set your AWS details
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-east-1

# Pull and run from ECR
docker-compose -f docker-compose.ecr.yml up
```

## Using in Production

### ECS Task Definition Example

```json
{
  "family": "mindr-backend",
  "containerDefinitions": [
    {
      "name": "mindr-backend",
      "image": "[ACCOUNT-ID].dkr.ecr.us-east-1.amazonaws.com/mindr-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "mountPoints": [
        {
          "sourceVolume": "data",
          "containerPath": "/app/data"
        }
      ],
      "environment": [
        {
          "name": "PYTHONUNBUFFERED",
          "value": "1"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 40
      }
    }
  ],
  "volumes": [
    {
      "name": "data",
      "host": {
        "sourcePath": "/opt/mindr/data"
      }
    }
  ]
}
```

### Kubernetes Deployment Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mindr-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mindr-backend
  template:
    metadata:
      labels:
        app: mindr-backend
    spec:
      containers:
      - name: mindr-backend
        image: [ACCOUNT-ID].dkr.ecr.us-east-1.amazonaws.com/mindr-backend:latest
        ports:
        - containerPort: 8000
        volumeMounts:
        - name: data-volume
          mountPath: /app/data
        env:
        - name: PYTHONUNBUFFERED
          value: "1"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 40
          periodSeconds: 30
      volumes:
      - name: data-volume
        hostPath:
          path: /opt/mindr/data
```

## Important Notes

- **Data Volume**: Ensure your deployment environment has the `data/snippets` directory with your markdown files
- **Environment Variables**: Set `VITE_API_BASE_URL` appropriately for your frontend deployment
- **Security**: Use IAM roles instead of hardcoded credentials in production
- **Monitoring**: Enable CloudWatch logging and monitoring for production deployments