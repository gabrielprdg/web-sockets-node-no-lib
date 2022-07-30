import { createServer } from 'http'
const PORT = 3000
createServer((req,res) => {
  res.writeHead(200)
  throw new Error('test')
  res.end('Hey there!')
}).listen(PORT, () => {
  console.log(`Server listening port ${PORT}`)
})

// error handling to keep the server on

//.on() -> add a listener function that will listener all the eventName passed as an argument
;
[
  "uncaughtException",
  "unhandledRejection"
].forEach(event => {
  process.on(event, (err) => {
    console.error(`Something bad happened, event: ${event}, msg: ${err.stack || err}`)
  })
});

