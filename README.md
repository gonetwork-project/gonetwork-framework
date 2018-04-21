# Blockchain Service

The BlockChain service is written as a standalone library that provides full offchain support for transactions and geth calls.  The service is written as a lightweight library for use in various projects.  All signing is handled by the library and generates the appropriate HTTP packets that can be sent to any geth node you'd like.  There is minimal trust in the geth node servicing you request beyond the fact that it will distribute your message as your privateKey and signing is handled in the application context running the library.

When making eth_call functions however, you need to be more weary (in general) of the communication endpoint as results can be easily spoofed.

This library will work well in conjunction with standard Geth HTTP Gateway Providers/Apis; Infura, EtherScan, etc.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

What things you need to install the software and how to install them

```
Give examples
```

### Installing

A step by step series of examples that tell you have to get a development env running

Say what the step will be

```
Give the example
```

And repeat

```
until finished
```

End with an example of getting some data out of the system or using it for a little demo

## Running the tests

Explain how to run the automated tests for this system

### Break down into end to end tests

Explain what these tests test and why

```
Give an example
```

### And coding style tests

Explain what these tests test and why

```
Give an example
```

## Deployment

Add additional notes about how to deploy this on a live system

## Built With

* [LibraryName](http://someurl/) - Used for ...

## Contributing

Please read [CONTRIBUTING.md](https://someurl) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

For the versions available, see the [tags on this repository](https://github.com/your/project/tags).

## Authors

* **Amit Shah** - *Initial work* - [URL](https://github.com/Url)


## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* Hat tip to anyone who's code was used
* Inspiration
* etc
