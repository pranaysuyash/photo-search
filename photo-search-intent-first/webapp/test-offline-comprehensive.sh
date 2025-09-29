#!/bin/bash

# Comprehensive Offline Test Runner
# This script runs the complete offline test suite with various configurations

set -e

echo "🚀 Starting Comprehensive Offline Test Suite"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if dev server is running
check_dev_server() {
    print_status "Checking if development server is running..."
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        print_success "Development server is running"
        return 0
    else
        print_warning "Development server not found, starting it..."
        npm run dev &
        DEV_SERVER_PID=$!
        print_status "Waiting for development server to start..."
        sleep 10
        if curl -s http://localhost:5173 > /dev/null 2>&1; then
            print_success "Development server started successfully"
            return 0
        else
            print_error "Failed to start development server"
            exit 1
        fi
    fi
}

# Install dependencies if needed
install_deps() {
    print_status "Checking dependencies..."
    if [ ! -d "node_modules/playwright" ]; then
        print_status "Installing Playwright browsers..."
        npx playwright install
    fi
}

# Run basic offline tests
run_basic_tests() {
    print_status "Running basic offline tests..."
    npm run test:offline:ci
    if [ $? -eq 0 ]; then
        print_success "Basic offline tests passed"
    else
        print_error "Basic offline tests failed"
        return 1
    fi
}

# Run mobile offline tests
run_mobile_tests() {
    print_status "Running mobile offline tests..."
    npm run test:offline:mobile
    if [ $? -eq 0 ]; then
        print_success "Mobile offline tests passed"
    else
        print_error "Mobile offline tests failed"
        return 1
    fi
}

# Run performance tests
run_performance_tests() {
    print_status "Running performance tests..."
    npm run test:offline:performance
    if [ $? -eq 0 ]; then
        print_success "Performance tests passed"
    else
        print_error "Performance tests failed"
        return 1
    fi
}

# Run full test suite with UI
run_ui_tests() {
    print_status "Running full test suite with UI..."
    print_status "This will open the Playwright test runner UI"
    print_status "Press Enter when ready to continue..."
    read -r
    npm run test:e2e:ui
}

# Generate test report
generate_report() {
    print_status "Generating test report..."
    if [ -d "test-results" ]; then
        print_status "Test results are available in the test-results directory"
        print_status "Open test-results/index.html in your browser to view the full report"
    else
        print_warning "No test results found"
    fi
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    if [ ! -z "$DEV_SERVER_PID" ]; then
        kill $DEV_SERVER_PID 2>/dev/null || true
        print_status "Development server stopped"
    fi
}

# Set up trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    echo "Starting comprehensive offline test suite..."

    # Parse command line arguments
    SKIP_BASIC=false
    SKIP_MOBILE=false
    SKIP_PERFORMANCE=false
    RUN_UI=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-basic)
                SKIP_BASIC=true
                shift
                ;;
            --skip-mobile)
                SKIP_MOBILE=true
                shift
                ;;
            --skip-performance)
                SKIP_PERFORMANCE=true
                shift
                ;;
            --ui)
                RUN_UI=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --skip-basic      Skip basic offline tests"
                echo "  --skip-mobile     Skip mobile offline tests"
                echo "  --skip-performance Skip performance tests"
                echo "  --ui              Run tests with UI"
                echo "  --help, -h        Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Install dependencies
    install_deps

    # Check dev server
    check_dev_server

    # Run tests based on flags
    TEST_RESULTS=()

    if [ "$SKIP_BASIC" = false ]; then
        print_status "=== Running Basic Offline Tests ==="
        if run_basic_tests; then
            TEST_RESULTS+=("Basic Tests: PASSED")
        else
            TEST_RESULTS+=("Basic Tests: FAILED")
        fi
    fi

    if [ "$SKIP_MOBILE" = false ]; then
        print_status "=== Running Mobile Offline Tests ==="
        if run_mobile_tests; then
            TEST_RESULTS+=("Mobile Tests: PASSED")
        else
            TEST_RESULTS+=("Mobile Tests: FAILED")
        fi
    fi

    if [ "$SKIP_PERFORMANCE" = false ]; then
        print_status "=== Running Performance Tests ==="
        if run_performance_tests; then
            TEST_RESULTS+=("Performance Tests: PASSED")
        else
            TEST_RESULTS+=("Performance Tests: FAILED")
        fi
    fi

    if [ "$RUN_UI" = true ]; then
        print_status "=== Running UI Tests ==="
        run_ui_tests
    fi

    # Generate report
    generate_report

    # Print summary
    echo ""
    echo "🎯 Test Summary"
    echo "=================================================="
    for result in "${TEST_RESULTS[@]}"; do
        if [[ $result == *"PASSED"* ]]; then
            echo -e "${GREEN}✓${NC} $result"
        else
            echo -e "${RED}✗${NC} $result"
        fi
    done

    # Check if any tests failed
    for result in "${TEST_RESULTS[@]}"; do
        if [[ $result == *"FAILED"* ]]; then
            print_error "Some tests failed. Check the output above for details."
            exit 1
        fi
    done

    print_success "All tests completed successfully!"
    echo ""
    echo "📊 Next Steps:"
    echo "1. View detailed test reports in test-results/index.html"
    echo "2. Check screenshots and videos in test-results/*/"
    echo "3. Review performance metrics in the test output"
    echo "4. Use --ui flag for interactive test debugging"
}

# Run main function with all arguments
main "$@"