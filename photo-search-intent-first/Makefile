#!/usr/bin/make -f

# Photo Search Intent-First - Build targets

# Python environment
VENV = .venv
PYTHON = $(VENV)/bin/python
PIP = $(VENV)/bin/pip

# Parity harness for API surface comparison
.PHONY: parity-check parity-update parity-dump

parity-check:
	@echo "Checking API parity between server.py and baseline..."
	PYTHONPATH=. $(PYTHON) scripts/api_parity.py --mode check

parity-update:
	@echo "Updating baseline snapshot from original_server.py..."
	PYTHONPATH=. $(PYTHON) scripts/api_parity.py --mode update-baseline

parity-dump:
	@echo "Dumping current server.py routes..."
	PYTHONPATH=. $(PYTHON) scripts/api_parity.py --mode dump --app server

parity-dump-baseline:
	@echo "Dumping baseline original_server.py routes..."
	PYTHONPATH=. $(PYTHON) scripts/api_parity.py --mode dump --app original

# Development helpers
.PHONY: install test lint

install:
	python -m venv $(VENV)
	$(PIP) install -r requirements.txt

test:
	PYTHONPATH=. $(PYTHON) -m pytest tests/

lint:
	$(PYTHON) -m ruff check .
	$(PYTHON) -m mypy .

# Server targets
.PHONY: serve

serve:
	PYTHONPATH=. $(PYTHON) -m uvicorn api.server:app --host 127.0.0.1 --port 8000 --reload

# CI target - fails build if parity breaks
.PHONY: ci-check

ci-check: parity-check test lint
	@echo "All CI checks passed!"

# Help
.PHONY: help

help:
	@echo "Available targets:"
	@echo "  parity-check       - Verify server.py matches baseline (fails on diff)"
	@echo "  parity-update      - Update baseline from original_server.py"
	@echo "  parity-dump        - Show current server.py routes"
	@echo "  parity-dump-baseline - Show baseline routes"
	@echo "  install           - Set up Python virtual environment"
	@echo "  serve             - Start development server"
	@echo "  test              - Run test suite"
	@echo "  lint              - Run linters"
	@echo "  ci-check          - Run all CI checks (parity + tests + lint)"