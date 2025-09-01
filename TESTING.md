# Mindr Testing Strategy

## Overview
This document outlines the comprehensive testing strategy for the Mindr application, designed to prevent breakage when adding new features or making UI changes.

## Test Architecture

### Three-Layer Testing Approach
1. **Unit Tests** - Individual component and function testing
2. **Integration Tests** - API endpoints and component integration
3. **End-to-End Tests** - Full user journey testing

## Test Suites

### Backend Tests (`backend/`)
**Framework**: pytest with coverage reporting
**Location**: `backend/test_*.py`
**Dependencies**: `backend/test_requirements.txt`

**Coverage Areas**:
- API endpoints (`/chat`, `/reindex`, `/health`)
- RAG system functionality
- CORS configuration
- Security features
- Error handling

**Key Test Files**:
- `test_api.py` - FastAPI endpoint testing
- `test_rag.py` - RAG system and embedding tests
- `conftest.py` - Test fixtures and configuration

**Running Backend Tests**:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r test_requirements.txt
pytest --verbose --cov=. --cov-report=html
```

### Frontend Tests (`frontend/`)
**Framework**: Vitest with React Testing Library
**Location**: `frontend/src/__tests__/`
**Configuration**: `vitest.config.ts`

**Coverage Areas**:
- React component rendering
- User interactions
- State management
- API integration
- Professional UI styling
- Responsive design

**Key Test Files**:
- `App.test.tsx` - Main application component
- `Chat.test.tsx` - Chat functionality
- `Health.test.tsx` - Health dashboard
- `test-setup.ts` - MSW API mocking

**Running Frontend Tests**:
```bash
cd frontend
npm install
npm run test
npm run test:coverage
```

### E2E Tests (`e2e-tests/`)
**Framework**: Playwright
**Location**: `e2e-tests/tests/`
**Configuration**: `playwright.config.ts`

**Coverage Areas**:
- Complete user workflows
- Cross-browser compatibility
- UI consistency
- API integration
- Professional styling verification

**Key Test Files**:
- `app-navigation.spec.ts` - Navigation and routing
- `chat-functionality.spec.ts` - Complete chat workflow
- `health-dashboard.spec.ts` - Health monitoring
- `sidebar-actions.spec.ts` - Sidebar interactions

**Running E2E Tests**:
```bash
cd e2e-tests
npm install
npx playwright install --with-deps
npx playwright test
```

## Automated Testing

### Local Test Runner
**Script**: `scripts/run-tests.sh`

**Usage**:
```bash
# Run all tests
./scripts/run-tests.sh all

# Run specific test suite
./scripts/run-tests.sh backend
./scripts/run-tests.sh frontend
./scripts/run-tests.sh e2e
./scripts/run-tests.sh security
```

**Features**:
- Dependency checking
- Test environment setup
- Coverage reporting
- Security scanning
- Comprehensive reporting

### CI/CD Pipeline
**Configuration**: `.github/workflows/test.yml`

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` branch

**Jobs**:
1. **Backend Tests** - Python/pytest with PostgreSQL
2. **Frontend Tests** - Node.js/Vitest with coverage
3. **E2E Tests** - Docker Compose + Playwright
4. **Security Scan** - Trivy vulnerability scanning
5. **Docker Tests** - Container build validation

## Test Data Management

### Backend Test Data
- Located in `backend/test_data/`
- Fixtures for RAG system testing
- Mock API responses
- Database test data

### Frontend Test Data
- MSW mocks in `test-setup.ts`
- Component test fixtures
- User interaction scenarios

### E2E Test Data
- Sample health and wellness content
- Test user scenarios
- Cross-browser test cases

## Coverage Requirements

### Minimum Coverage Targets
- **Backend**: 80% line coverage
- **Frontend**: 80% line coverage
- **E2E**: Critical user paths covered

### Coverage Reporting
- **Backend**: HTML reports in `backend/coverage_html/`
- **Frontend**: HTML reports in `frontend/coverage/`
- **E2E**: Playwright reports in `e2e-tests/playwright-report/`

## Professional UI Testing

### Visual Consistency Tests
- Color palette verification
- Typography consistency
- Layout stability
- Responsive design validation

### Professional Design Validation
- No flashy animations
- Consistent spacing
- Professional color scheme
- Clean typography

## Security Testing

### Automated Security Scans
- Python dependency scanning with Safety
- Node.js dependency audit
- Container vulnerability scanning with Trivy
- SARIF reporting for GitHub Security tab

### Security Test Areas
- CORS configuration
- Input validation
- Authentication (when implemented)
- API security headers

## Maintenance Guidelines

### Adding New Tests
1. Follow existing test patterns
2. Maintain coverage requirements
3. Update test documentation
4. Add CI/CD validation

### Test Environment Updates
1. Update `test_requirements.txt` for Python
2. Update `package.json` for Node.js
3. Update Docker configurations
4. Update GitHub Actions workflow

### Debugging Failed Tests
1. Check test logs in CI/CD pipeline
2. Run tests locally with verbose output
3. Use coverage reports to identify gaps
4. Review Playwright traces for E2E failures

## Integration with Development Workflow

### Pre-commit Testing
Run relevant test suite before committing:
```bash
# Before backend changes
./scripts/run-tests.sh backend

# Before frontend changes
./scripts/run-tests.sh frontend

# Before major changes
./scripts/run-tests.sh all
```

### Pull Request Validation
All PRs automatically trigger:
- Full test suite execution
- Coverage validation
- Security scanning
- Docker build verification

### Release Testing
Before releases, run:
```bash
./scripts/run-tests.sh all
```

## Monitoring and Alerts

### Test Failure Notifications
- GitHub Actions provides email notifications
- Failed tests block PR merging
- Coverage drops trigger warnings

### Performance Monitoring
- E2E tests include performance assertions
- API response time validation
- UI loading time checks

## Best Practices

### Test Writing Guidelines
1. Write descriptive test names
2. Use proper setup/teardown
3. Mock external dependencies
4. Test both happy and error paths
5. Maintain test independence

### Professional UI Testing
1. Verify color consistency
2. Test responsive breakpoints
3. Validate typography scaling
4. Ensure layout stability
5. Test cross-browser compatibility

### API Testing
1. Test all HTTP methods
2. Validate response formats
3. Test error conditions
4. Verify CORS headers
5. Test rate limiting (when implemented)

This comprehensive testing strategy ensures the Mindr application maintains stability and professional quality while enabling confident feature development and UI improvements.