#!/bin/bash

# ECR Deployment Script for Mindr Application
# Usage: ./deploy-ecr.sh [AWS_REGION] [AWS_ACCOUNT_ID]

set -e

# Configuration
AWS_REGION="${1:-us-east-1}"
AWS_ACCOUNT_ID="${2:-}"
PROJECT_NAME="mindr"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Mindr ECR Deployment Script${NC}"

# Validate inputs
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}❌ Error: AWS_ACCOUNT_ID is required${NC}"
    echo "Usage: $0 [AWS_REGION] AWS_ACCOUNT_ID"
    exit 1
fi

# Get git SHA for tagging
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
echo -e "${YELLOW}📝 Using Git SHA: ${GIT_SHA}${NC}"

# ECR Repository URLs
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
BACKEND_REPO="${ECR_REGISTRY}/${PROJECT_NAME}-backend"
FRONTEND_REPO="${ECR_REGISTRY}/${PROJECT_NAME}-frontend"

echo -e "${YELLOW}🔧 Configuration:${NC}"
echo "  AWS Region: ${AWS_REGION}"
echo "  AWS Account: ${AWS_ACCOUNT_ID}"
echo "  Backend Repo: ${BACKEND_REPO}"
echo "  Frontend Repo: ${FRONTEND_REPO}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${YELLOW}🔐 Authenticating with ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Create ECR repositories if they don't exist
echo -e "${YELLOW}📦 Creating ECR repositories if needed...${NC}"
aws ecr describe-repositories --repository-names ${PROJECT_NAME}-backend --region ${AWS_REGION} 2>/dev/null || \
    aws ecr create-repository --repository-name ${PROJECT_NAME}-backend --region ${AWS_REGION}

aws ecr describe-repositories --repository-names ${PROJECT_NAME}-frontend --region ${AWS_REGION} 2>/dev/null || \
    aws ecr create-repository --repository-name ${PROJECT_NAME}-frontend --region ${AWS_REGION}

# Build and push backend
echo -e "${GREEN}🏗️  Building backend image...${NC}"
docker build -t ${PROJECT_NAME}-backend:latest ./backend
docker build -t ${PROJECT_NAME}-backend:${GIT_SHA} ./backend

echo -e "${YELLOW}🏷️  Tagging backend images...${NC}"
docker tag ${PROJECT_NAME}-backend:latest ${BACKEND_REPO}:latest
docker tag ${PROJECT_NAME}-backend:${GIT_SHA} ${BACKEND_REPO}:${GIT_SHA}

echo -e "${YELLOW}⬆️  Pushing backend images to ECR...${NC}"
docker push ${BACKEND_REPO}:latest
docker push ${BACKEND_REPO}:${GIT_SHA}

# Build and push frontend
echo -e "${GREEN}🏗️  Building frontend image...${NC}"
docker build -t ${PROJECT_NAME}-frontend:latest ./frontend
docker build -t ${PROJECT_NAME}-frontend:${GIT_SHA} ./frontend

echo -e "${YELLOW}🏷️  Tagging frontend images...${NC}"
docker tag ${PROJECT_NAME}-frontend:latest ${FRONTEND_REPO}:latest
docker tag ${PROJECT_NAME}-frontend:${GIT_SHA} ${FRONTEND_REPO}:${GIT_SHA}

echo -e "${YELLOW}⬆️  Pushing frontend images to ECR...${NC}"
docker push ${FRONTEND_REPO}:latest
docker push ${FRONTEND_REPO}:${GIT_SHA}

# Clean up local images
echo -e "${YELLOW}🧹 Cleaning up local images...${NC}"
docker rmi ${PROJECT_NAME}-backend:latest ${PROJECT_NAME}-backend:${GIT_SHA} || true
docker rmi ${PROJECT_NAME}-frontend:latest ${PROJECT_NAME}-frontend:${GIT_SHA} || true

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo
echo -e "${YELLOW}📋 Image URIs:${NC}"
echo "  Backend: ${BACKEND_REPO}:${GIT_SHA}"
echo "  Frontend: ${FRONTEND_REPO}:${GIT_SHA}"
echo
echo -e "${YELLOW}🔗 Quick deployment commands:${NC}"
echo "  docker run -p 8000:8000 ${BACKEND_REPO}:${GIT_SHA}"
echo "  docker run -p 80:80 ${FRONTEND_REPO}:${GIT_SHA}"