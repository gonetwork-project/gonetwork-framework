This code is used to test framework end to end with as little mocking as possible. For now we concentrate only on fake eth node (ganache-cli) that runs at `localhost:8546`. Right now we use predefined set of private keys.

Once it works fine there we will add support for test networks like `ropsten` and custom private keys.

The folder lives under `src` since it makes working with typescript much easier - project's main tsconfig.json is shared.

# How to use it for development

All three processes needs to run in parallel:

  * `yarn watch` - compiles `./src` to `./lib`
  * `cd lib/e2e && nodemon .` - you can run it from `./` but then changes outside `lib/e2e` will trigger a reload
  * `ganache-cli -b 3 --unlock 0 --account="0xb5079282b7b1e48f82270011149c56b6191cd1f2846e01c419f0a1a57acc42,10000000000000000000000000" --unlock 1 --account="0x4c65754b227fb8467715d2949555abf6fe8bcba11c6773433c8a7a05a2a1fc78,10000000000000000000000000" --unlock 2 --account="0xa8344e81509696058a3c14e520693f94ce9c99c26f03310b2308a4c59b35bb3d,10000000000000000000000000" --unlock 3 --account="0x157258c195ede5fad2f054b45936dae4f3e1b1f0a18e0edc17786d441a207224,10000000000000000000000000"`

To speed up development, contracts are deployed once per ganache-cli run.

Any severe and reproducible issues should be documented in the source, so developers new to project can easily identify them as well.
