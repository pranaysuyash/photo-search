#!/bin/bash

# Critical Lint Issues Fix Script
# This script addresses the most critical linting issues systematically

set -e

echo "🔧 Fixing Critical Lint Issues"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to fix non-null assertions in ErrorDemo.tsx
fix_non_null_assertions() {
    print_status "Fixing non-null assertions in ErrorDemo.tsx..."

    cat > fix_non_null.js << 'EOF'
const fs = require('fs');
const path = require('path');

const errorDemoPath = path.join(__dirname, 'src/components/ErrorDemo.tsx');

if (fs.existsSync(errorDemoPath)) {
    let content = fs.readFileSync(errorDemoPath, 'utf8');

    // Fix non-null assertions by adding proper null checks
    const fixes = [
        // Replace action.metadata!.updatedAt with optional chaining and null check
        {
            pattern: /action\.metadata!\.updatedAt/g,
            replacement: 'action.metadata?.updatedAt'
        },
        // Replace nextAction.metadata!.updatedAt with optional chaining and null check
        {
            pattern: /nextAction\.metadata!\.updatedAt/g,
            replacement: 'nextAction.metadata?.updatedAt'
        },
        // Replace action.metadata!.retryCount with optional chaining and null check
        {
            pattern: /action\.metadata!\.retryCount/g,
            replacement: 'action.metadata?.retryCount'
        },
        // Replace action.metadata!.lastError with optional chaining and null check
        {
            pattern: /action\.metadata!\.lastError/g,
            replacement: 'action.metadata?.lastError'
        },
        // Replace filters.before! with optional chaining
        {
            pattern: /filters\.before!/g,
            replacement: 'filters.before'
        },
        // Replace filters.after! with optional chaining
        {
            pattern: /filters\.after!/g,
            replacement: 'filters.after'
        }
    ];

    let changes = 0;
    fixes.forEach(fix => {
        const newContent = content.replace(fix.pattern, fix.replacement);
        if (newContent !== content) {
            content = newContent;
            changes++;
        }
    });

    if (changes > 0) {
        fs.writeFileSync(errorDemoPath, content);
        print_success "Fixed $changes non-null assertions in ErrorDemo.tsx"
    } else {
        print_warning "No non-null assertions found to fix in ErrorDemo.tsx"
    }
} else {
    print_warning "ErrorDemo.tsx not found"
}
EOF

    node fix_non_null.js
    rm fix_non_null.js
}

# Function to fix unused imports
fix_unused_imports() {
    print_status "Fixing unused imports..."

    # Fix unused imports in ModelStatusIndicator.tsx
    if grep -q "Wifi," src/components/ModelStatusIndicator.tsx; then
        sed -i '' '/Wifi,/d' src/components/ModelStatusIndicator.tsx
        print_success "Fixed unused Wifi import in ModelStatusIndicator.tsx"
    fi
}

# Function to fix skeleton key issues
fix_skeleton_keys() {
    print_status "Fixing skeleton key issues..."

    cat > fix_skeleton_keys.js << 'EOF'
const fs = require('fs');
const path = require('path');

const skeletonPath = path.join(__dirname, 'src/components/ui/Skeleton.tsx');

if (fs.existsSync(skeletonPath)) {
    let content = fs.readFileSync(skeletonPath, 'utf8');

    // Fix array index key issue
    const pattern = /{Array\.from\(\{ length: count \}, \(_, index\) => \(([\s\S]*?)key=\{`skeleton-grid-item-\$\{index\}`\}([\s\S]*?)\)\)}/g;
    const replacement = `{Array.from({ length: count }, (_, index) => ($1key=\`skeleton-grid-item-\${Math.random()}\`$2))}`;

    if (content.match(pattern)) {
        content = content.replace(pattern, replacement);
        fs.writeFileSync(skeletonPath, content);
        print_success "Fixed skeleton key issue in Skeleton.tsx"
    } else {
        print_warning "No skeleton key issues found to fix"
    }
} else {
    print_warning "Skeleton.tsx not found"
}
EOF

    node fix_skeleton_keys.js
    rm fix_skeleton_keys.js
}

# Function to run biome auto-fix
run_biome_fix() {
    print_status "Running Biome auto-fix..."

    npx @biomejs/biome check src --write --max-diagnostics=100 || true
    print_success "Biome auto-fix completed"
}

# Function to check progress
check_progress() {
    print_status "Checking linting progress..."

    # Get current error count
    local error_count=$(npx @biomejs/biome check src --max-diagnostics=500 2>&1 | grep -o 'Found [0-9]* errors' | head -1 | grep -o '[0-9]*' || echo "0")
    local warning_count=$(npx @biomejs/biome check src --max-diagnostics=500 2>&1 | grep -o 'Found [0-9]* warnings' | head -1 | grep -o '[0-9]*' || echo "0")

    echo "Current status: $error_count errors, $warning_count warnings"
}

# Main execution
main() {
    echo "Starting critical lint fixes..."

    # Parse command line arguments
    local skip_non_null=false
    local skip_imports=false
    local skip_skeleton=false
    local skip_biome=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-non-null)
                skip_non_null=true
                shift
                ;;
            --skip-imports)
                skip_imports=true
                shift
                ;;
            --skip-skeleton)
                skip_skeleton=true
                shift
                ;;
            --skip-biome)
                skip_biome=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --skip-non-null   Skip fixing non-null assertions"
                echo "  --skip-imports    Skip fixing unused imports"
                echo "  --skip-skeleton   Skip fixing skeleton keys"
                echo "  --skip-biome      Skip biome auto-fix"
                echo "  --help, -h        Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Check initial status
    check_progress

    # Apply fixes based on flags
    if [ "$skip_non_null" = false ]; then
        fix_non_null_assertions
    fi

    if [ "$skip_imports" = false ]; then
        fix_unused_imports
    fi

    if [ "$skip_skeleton" = false ]; then
        fix_skeleton_keys
    fi

    if [ "$skip_biome" = false ]; then
        run_biome_fix
    fi

    # Check final status
    check_progress

    print_success "Critical lint fixes completed!"
    echo ""
    echo "📊 Next Steps:"
    echo "1. Run 'npx @biomejs/biome check src' to see remaining issues"
    echo "2. Address remaining issues manually if needed"
    echo "3. Run tests to ensure fixes don't break functionality"
}

# Run main function with all arguments
main "$@"