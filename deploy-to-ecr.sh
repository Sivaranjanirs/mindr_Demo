#!/bin/bash

# ECR Deployment Script for Mindr Application
# Usage: ./deploy-to-ecr.sh [AWS_REGION] [AWS_ACCOUNT_ID]

set -e

# Configuration
AWS_REGION=${1:-us-east-1}
AWS_ACCOUNT_ID=${2:-$(aws sts get-caller-identity --query Account --output text)}
BACKEND_REPO="mindr-backend"
FRONTEND_REPO="mindr-frontend"
ECR_BASE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "🚀 Starting ECR deployment for Mindr application"
echo "   AWS Region: ${AWS_REGION}"
echo "   AWS Account: ${AWS_ACCOUNT_ID}"
echo "   ECR Base URI: ${ECR_BASE_URI}"
echo ""

# Step 1: Create ECR repositories if they don't exist
echo "📦 Creating ECR repositories..."

aws ecr describe-repositories --repository-names ${BACKEND_REPO} --region ${AWS_REGION} 2>/dev/null || {
    echo "Creating backend repository..."
    aws ecr create-repository --repository-name ${BACKEND_REPO} --region ${AWS_REGION}
}

aws ecr describe-repositories --repository-names ${FRONTEND_REPO} --region ${AWS_REGION} 2>/dev/null || {
    echo "Creating frontend repository..."
    aws ecr create-repository --repository-name ${FRONTEND_REPO} --region ${AWS_REGION}
}

echo "✅ ECR repositories ready"
echo ""

# Step 2: Authenticate Docker to ECR
echo "🔐 Authenticating Docker to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_BASE_URI}
echo "✅ Docker authenticated to ECR"
echo ""

# Step 3: Build, tag, and push backend image
echo "🏗️  Building and pushing backend image..."
docker build -t ${BACKEND_REPO} ./backend
docker tag ${BACKEND_REPO}:latest ${ECR_BASE_URI}/${BACKEND_REPO}:latest
docker tag ${BACKEND_REPO}:latest ${ECR_BASE_URI}/${BACKEND_REPO}:$(date +%Y%m%d-%H%M%S)
docker push ${ECR_BASE_URI}/${BACKEND_REPO}:latest
docker push ${ECR_BASE_URI}/${BACKEND_REPO}:$(date +%Y%m%d-%H%M%S)
echo "✅ Backend image pushed to ECR"
echo ""

# Step 4: Build, tag, and push frontend image
echo "🏗️  Building and pushing frontend image..."
docker build -t ${FRONTEND_REPO} ./frontend
docker tag ${FRONTEND_REPO}:latest ${ECR_BASE_URI}/${FRONTEND_REPO}:latest
docker tag ${FRONTEND_REPO}:latest ${ECR_BASE_URI}/${FRONTEND_REPO}:$(date +%Y%m%d-%H%M%S)
docker push ${ECR_BASE_URI}/${FRONTEND_REPO}:latest
docker push ${ECR_BASE_URI}/${FRONTEND_REPO}:$(date +%Y%m%d-%H%M%S)
echo "✅ Frontend image pushed to ECR"
echo ""

# Step 5: Output deployment information
echo "🎉 Deployment complete!"
echo ""
echo "📋 ECR Image URIs:"
echo "   Backend:  ${ECR_BASE_URI}/${BACKEND_REPO}:latest"
echo "   Frontend: ${ECR_BASE_URI}/${FRONTEND_REPO}:latest"
echo ""
echo "📋 Tagged versions:"
echo "   Backend:  ${ECR_BASE_URI}/${BACKEND_REPO}:$(date +%Y%m%d-%H%M%S)"
echo "   Frontend: ${ECR_BASE_URI}/${FRONTEND_REPO}:$(date +%Y%m%d-%H%M%S)"
echo ""
echo "💡 Next steps:"
echo "   1. Use these image URIs in your ECS task definitions or Kubernetes deployments"
echo "   2. Ensure your deployment environment has access to the data volume"
echo "   3. Configure environment variables (VITE_API_BASE_URL for frontend)"
echo ""