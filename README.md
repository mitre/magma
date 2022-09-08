# Magma
The future of CALDERA's UI/UX.

## Dependencies
* NodeJS (v16+ recommended)
* CALDERA (v4.0.0+)

## Installation
CALDERA needs to be running in the background, so be sure to start it up
beforehand and make sure it's accessible at http://localhost:8888.

If you are going to run Magma without developing on it, you can build 
this project into a static directory to serve up however you choose, i.e. 
nginx. To do so:

1. Run `npm install`.
1. Run `npm run build`.

Your bundled directory is called `dist/`, located at the project root.

### Development
To serve up the UI in a development environment (with hot-reloading, etc.), do

1. Run `npm install`.
1. Run `npm run dev`.

You can reach the UI in your browser at [http://localhost:3000](http://localhost:3000)

### Code Quality
Currently Linting is done manually by the developer. To do so:

1. Run `npm run lint`.

In order to run linting with it automatically formatting issues:

1. Run `npm run lintfix`.

### Testing
Magma uses [Jest](https://jestjs.io/) as its frontend testing framework. All tests are located at the `src/tests` directory.

1. Run `npm run test-all` to run all tests.

Each vue component is tested for accessibility in their respected file. This is done using a custom Jest matcher, [jest-axe](https://github.com/nickcolley/jest-axe). Jest-axe adheres to
[axe-core rules](https://github.com/dequelabs/axe-core/blob/master/doc/rule-descriptions.md). Each one of these rules can be modified or disabled when calling the axe function.

1. Run `npm run test-accessibility` to run only accessibility tests.