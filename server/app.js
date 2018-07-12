const express = require('express');
const bodyParser = require('body-parser');
const config = require('./config');

const app = express();

app.use(bodyParser.json({limit: '300mb'}));

const index = require('./routes/index.js');
app.use('/', index);

app.listen(config.port);

