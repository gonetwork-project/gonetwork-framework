import * as express from 'express'
import * as bodyParser from 'body-parser';

import index from './routes/index'

class App {

    public app: any;

    constructor () {
        this.app = express();
        this.app.use(bodyParser.json({limit: '1mb'}));
        this.mountRoutes()
    }

    private mountRoutes (): void {
        this.app.use('/', index);
    }
}

export default new App().app;