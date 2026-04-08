.PHONY: setup start test clean

VENV := companion/.venv
PYTHON := $(VENV)/bin/python3

setup:
	npm install
	python3 -m venv $(VENV)
	$(VENV)/bin/pip install -r companion/requirements.txt
	$(PYTHON) -m patchright install chromium

start:
	npx concurrently --names "frontend,niche" --prefix-colors "cyan,magenta" "npm run dev" "$(PYTHON) companion/server.py"

test:
	npm test

clean:
	rm -rf node_modules dist $(VENV)
