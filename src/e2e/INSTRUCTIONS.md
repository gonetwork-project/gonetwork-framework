This code is used to test framework end to end with as little mocking as possible. For now we concentrate only on fake eth node (like ganache-cli) that runs at `localhost:8545`. Once it works fine there we will add support for test networks like `ropsten`.

The folder lives under `src` since it makes working with typescript much easier - project's main tsconfig.json is shared.