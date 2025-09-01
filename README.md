# Mindr 🧠

A health and wellness RAG (Retrieval-Augmented Generation) application that provides personalized recommendations for cognitive health, nutrition, exercise, sleep, and stress management.

## Overview

Mindr is a full-stack application that uses local document retrieval to provide evidence-based health recommendations. The system combines a FastAPI backend with a React frontend, containerized with Docker for easy deployment.

### Key Features

- **RAG-Based Recommendations**: Local document retrieval with semantic search
- **Health Categories**: Cognitive health, nutrition, exercise, sleep, and stress management
- **Real-time Chat Interface**: Streaming responses with privacy protection
- **Health Metrics**: Latency tracking and performance monitoring
- **Data Privacy**: Built-in PII redaction for emails and phone numbers
- **Comprehensive Testing**: Unit, integration, and E2E tests

## Architecture

- **Backend**: FastAPI with local RAG implementation using FastEmbed
- **Frontend**: React with TypeScript and Vite
- **Data**: Markdown-based health knowledge snippets
- **Deployment**: Docker Compose with health checks
- **Testing**: Pytest (backend), Vitest (frontend), Playwright (E2E)

## Prerequisites

- **Python 3.8+**
- **Node.js 18+**
- **Docker & Docker Compose**
- **Git**

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd mindr
```

### 2. Using Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up -d --build

# Access the application
open http://localhost
```

The application will be available at:
- Frontend: http://localhost
- Backend API: http://localhost:8000
- Health check: http://localhost:8000/health

### 3. Local Development Setup

#### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the backend server
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Development

### Project Structure

```
mindr/
├── backend/              # FastAPI backend
│   ├── app.py           # Main application
│   ├── rag_index.py     # RAG implementation
│   ├── requirements.txt # Python dependencies
│   └── test_*.py        # Backend tests
├── frontend/            # React frontend
│   ├── src/            # Source code
│   ├── package.json    # Node dependencies
│   └── __tests__/      # Frontend tests
├── data/
│   └── snippets/       # Health knowledge base
├── e2e-tests/          # End-to-end tests
├── scripts/
│   └── run-tests.sh    # Test runner script
└── docker-compose.yml  # Container orchestration
```

### Running Tests

Use the comprehensive test script:

```bash
# Run all tests
./scripts/run-tests.sh

# Run specific test suites
./scripts/run-tests.sh backend   # Backend tests only
./scripts/run-tests.sh frontend  # Frontend tests only
./scripts/run-tests.sh e2e       # E2E tests only
./scripts/run-tests.sh security  # Security scans
```

Individual test commands:

```bash
# Backend tests
cd backend && pytest --cov=. --cov-report=html

# Frontend tests
cd frontend && npm run test:coverage

# E2E tests (requires running application)
cd e2e-tests && npx playwright test
```

### Code Quality

```bash
# Backend linting (if applicable)
cd backend && python -m flake8

# Frontend linting
cd frontend && npm run lint
```

## API Documentation

Once the backend is running, visit:
- **Interactive API docs**: http://localhost:8000/docs
- **OpenAPI schema**: http://localhost:8000/openapi.json

### Key Endpoints

- `GET /health` - Health check endpoint
- `POST /chat` - Chat interface with streaming responses
- `GET /metrics` - Performance metrics
- `GET /documents` - Available document metadata

## Configuration

### Environment Variables

- `PYTHONUNBUFFERED=1` - Python output buffering
- `VITE_API_BASE_URL` - Frontend API base URL

### Data Management

Health knowledge is stored in `data/snippets/` as markdown files. Each file should follow this format:

```markdown
Title: Topic Name
Key ideas: Brief summary

## Content
Detailed health information...
```

## Deployment

### Production Deployment

```bash
# Build for production
docker-compose -f docker-compose.yml up -d --build

# Or use ECR deployment
./deploy-to-ecr.sh
```

### AWS ECR Deployment

See `ECR-DEPLOYMENT.md` for detailed AWS deployment instructions.

## Monitoring & Health Checks

The application includes built-in health checks:

```bash
# Check backend health
curl http://localhost:8000/health

# Check frontend availability
curl http://localhost/
```

Performance metrics are available at `/metrics` endpoint.

## Security

- **PII Protection**: Automatic redaction of emails and phone numbers
- **CORS Configuration**: Restricted to localhost origins
- **Dependency Scanning**: Security audits for Python and Node.js packages
- **Container Security**: Non-root user execution in containers

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 80 and 8000 are available
2. **Docker issues**: Run `docker-compose down -v` to clean up
3. **Node modules**: Delete `node_modules` and run `npm install`
4. **Python environment**: Recreate virtual environment if issues persist

### Logs

```bash
# View container logs
docker-compose logs backend
docker-compose logs frontend

# Follow logs in real-time
docker-compose logs -f
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `./scripts/run-tests.sh`
5. Submit a pull request

## Testing Coverage

- **Backend**: Pytest with coverage reporting
- **Frontend**: Vitest with coverage reporting
- **E2E**: Playwright for full user journey testing
- **Security**: Dependency vulnerability scanning

## License

[Add your license information here]

## Support

For issues and questions:
1. Check existing issues in the repository
2. Create a new issue with detailed information
3. Include logs and reproduction steps# mindr_Demo
