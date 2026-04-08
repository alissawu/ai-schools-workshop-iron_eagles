.PHONY: setup start test clean

setup:
	npm install
	pip3 install -r companion/requirements.txt

start:
	npm start

test:
	npm test

clean:
	rm -rf node_modules dist
