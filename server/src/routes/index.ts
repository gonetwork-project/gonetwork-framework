import * as express from 'express'
import testrpc from './testrpc';
import mqtt from './mqtt'

const router = express.Router();

router.use('/testrpc', testrpc);
router.use('/mqtt', mqtt);

export default router;
