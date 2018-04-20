module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
   development: {
	   host: "localhost",
	   port: 8000,
	   network_id: "*", // Match any network id
	   gas: 6721975
	  }
	,
	ropsten: {
      host: "localhost",
      port: 8545,
      network_id: "3",
      gas:3500000
    }}
};
