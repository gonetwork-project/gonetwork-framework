import app from './App'
import config from './config'

console.log(config.port);
app.listen(config.port, (err:Error) => {
  if (err) {
    return console.log(err)
  }
  return console.log(`server is listening on ${config.port}`)
})