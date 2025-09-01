#!/bin/bash

# Comprehensive test runner script for Mindr application
# Usage: ./scripts/run-tests.sh [backend|frontend|e2e|all]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is required but not installed"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is required but not installed"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is required but not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is required but not installed"
        exit 1
    fi
    
    log_success "All dependencies are available"
}

# Setup test environment
setup_test_env() {
    log_info "Setting up test environment..."
    
    # Create test data directory
    mkdir -p data/snippets
    
    # Create sample test data if it doesn't exist
    if [ ! -f "data/snippets/test-sleep.md" ]; then
        cat > data/snippets/test-sleep.md << EOF
Title: Sleep Hygiene Basics
Key ideas: Good sleep habits for better rest

## Sleep Tips
1. Maintain consistent sleep schedule
2. Create dark, cool environment
3. Avoid screens before bedtime
4. Exercise regularly but not late
EOF
    fi
    
    if [ ! -f "data/snippets/test-nutrition.md" ]; then
        cat > data/snippets/test-nutrition.md << EOF
Title: Healthy Nutrition
Key ideas: Balanced diet for wellness

## Nutrition Guidelines
1. Eat variety of whole foods
2. Stay hydrated throughout day
3. Limit processed foods
4. Include fruits and vegetables
EOF
    fi
    
    log_success "Test environment setup complete"
}

# Run backend tests
run_backend_tests() {
    log_info "Running backend tests..."
    
    cd backend
    
    # Install test dependencies if not already installed
    if [ ! -d ".venv" ]; then
        log_info "Creating virtual environment..."
        python3 -m venv .venv
        source .venv/bin/activate
        pip install -r requirements.txt
        pip install -r test_requirements.txt
    else
        source .venv/bin/activate
    fi
    
    # Run tests with coverage
    log_info "Executing pytest with coverage..."
    pytest --verbose \
           --cov=. \
           --cov-report=term-missing \
           --cov-report=html:coverage_html \
           --cov-report=xml:coverage.xml \
           --junit-xml=test-results.xml
    
    # Check coverage threshold
    coverage_percentage=$(coverage report --show-missing | grep TOTAL | awk '{print $4}' | sed 's/%//')
    if (( $(echo "$coverage_percentage < 80" | bc -l) )); then
        log_warning "Backend test coverage is below 80% ($coverage_percentage%)"
    else
        log_success "Backend test coverage: $coverage_percentage%"
    fi
    
    cd ..
    log_success "Backend tests completed"
}

# Run frontend tests
run_frontend_tests() {
    log_info "Running frontend tests..."
    
    cd frontend
    
    # Install dependencies if not already installed
    if [ ! -d "node_modules" ]; then
        log_info "Installing npm dependencies..."
        npm ci
    fi
    
    # Run tests with coverage
    log_info "Executing vitest with coverage..."
    npm run test:coverage
    
    # Check if coverage meets threshold
    if [ -f "coverage/coverage-summary.json" ]; then
        coverage_percentage=$(node -e "
            const coverage = require('./coverage/coverage-summary.json');
            console.log(coverage.total.lines.pct);
        ")
        
        if (( $(echo "$coverage_percentage < 80" | bc -l) )); then
            log_warning "Frontend test coverage is below 80% ($coverage_percentage%)"
        else
            log_success "Frontend test coverage: $coverage_percentage%"
        fi
    fi
    
    cd ..
    log_success "Frontend tests completed"
}

# Run E2E tests
run_e2e_tests() {
    log_info "Running E2E tests..."
    
    # Build and start application
    log_info "Building and starting application containers..."
    docker-compose up -d --build
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    timeout 60 bash -c 'until curl -f http://localhost/ &>/dev/null; do sleep 2; done' || {
        log_error "Frontend service failed to start"
        docker-compose logs
        docker-compose down -v
        exit 1
    }
    
    timeout 60 bash -c 'until curl -f http://localhost:8000/health &>/dev/null; do sleep 2; done' || {
        log_error "Backend service failed to start"
        docker-compose logs
        docker-compose down -v
        exit 1
    }
    
    log_success "Application is ready"
    
    # Run E2E tests
    cd e2e-tests
    
    # Install dependencies if not already installed
    if [ ! -d "node_modules" ]; then
        log_info "Installing E2E test dependencies..."
        npm ci
        npx playwright install --with-deps
    fi
    
    # Run Playwright tests
    log_info "Executing Playwright tests..."
    npx playwright test --reporter=html
    
    cd ..
    
    # Cleanup
    log_info "Cleaning up containers..."
    docker-compose down -v
    
    log_success "E2E tests completed"
}

# Run security scans
run_security_scan() {
    log_info "Running security scans..."
    
    # Check for common security issues in Python dependencies
    if command -v safety &> /dev/null; then
        log_info "Scanning Python dependencies for vulnerabilities..."
        cd backend
        safety check --json --output security-report.json || true
        cd ..
    else
        log_warning "Safety not installed, skipping Python security scan"
    fi
    
    # Check for common security issues in Node.js dependencies
    if command -v npm &> /dev/null; then
        log_info "Scanning Node.js dependencies for vulnerabilities..."
        cd frontend
        npm audit --audit-level moderate --json > security-audit.json || true
        cd ..
    fi
    
    log_success "Security scans completed"
}

# Generate test report
generate_report() {
    log_info "Generating test report..."
    
    cat > test-report.md << EOF
# Mindr Test Report

Generated on: $(date)

## Test Results Summary

### Backend Tests
- **Location**: \`backend/test-results.xml\`
- **Coverage Report**: \`backend/coverage_html/index.html\`

### Frontend Tests
- **Coverage Report**: \`frontend/coverage/index.html\`

### E2E Tests
- **Report**: \`e2e-tests/playwright-report/index.html\`

## Security Scans
- **Python Dependencies**: \`backend/security-report.json\`
- **Node.js Dependencies**: \`frontend/security-audit.json\`

## How to View Reports

1. **Backend Coverage**: Open \`backend/coverage_html/index.html\` in a browser
2. **Frontend Coverage**: Open \`frontend/coverage/index.html\` in a browser
3. **E2E Test Report**: Open \`e2e-tests/playwright-report/index.html\` in a browser

## Running Individual Test Suites

\`\`\`bash
# Backend tests only
./scripts/run-tests.sh backend

# Frontend tests only
./scripts/run-tests.sh frontend

# E2E tests only
./scripts/run-tests.sh e2e

# All tests
./scripts/run-tests.sh all
\`\`\`
EOF
    
    log_success "Test report generated: test-report.md"
}

# Main execution
main() {
    local test_type=${1:-"all"}
    
    log_info "Starting Mindr test suite - Type: $test_type"
    
    check_dependencies
    setup_test_env
    
    case $test_type in
        "backend")
            run_backend_tests
            ;;
        "frontend")
            run_frontend_tests
            ;;
        "e2e")
            run_e2e_tests
            ;;
        "security")
            run_security_scan
            ;;
        "all")
            run_backend_tests
            run_frontend_tests
            run_e2e_tests
            run_security_scan
            ;;
        *)
            log_error "Unknown test type: $test_type"
            log_info "Available options: backend, frontend, e2e, security, all"
            exit 1
            ;;
    esac
    
    generate_report
    log_success "All tests completed successfully! 🎉"
}

# Run main function with all arguments
main "$@"