# Blockchain Service

One Paragraph of project description goes here

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

## Docs

To generate the documentation it is best to start a python virtual environment.
The following was used to generate initial docs.
See http://docs.readthedocs.io/en/latest/getting_started.html#in-rst

```
$ pip --version
pip 9.0.1 from /usr/local/lib/python2.7/site-packages (python 2.7)
$ virtualenv --version
15.1.0
$ virtualenv .blockchain-service
$ source ./.blockchain-service/bin/activate
$(.blockchain-service) pip install sphinx sphinx-autobuild
$(.blockchain-service) sphinx-quickstart
```

JSDoc (http://usejsdoc.org/) tags in the JavaScript source files are processed into reStructuredText (http://docutils.sourceforge.net/rst.html) to be included in the sphinx documentation (e.g. `make html`).  This is done using jsdoc and the template provided by the npm module jsdoc-sphinx.

```
$ jsdoc -t node_modules/jsdoc-sphinx/template -d jsdocs src/blockchain.js
$ cd ./docs
$ make html
```
