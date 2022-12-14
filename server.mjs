import { createServer } from 'http'
const PORT = 1337
import crypto from 'crypto'
const WEBSOCKET_MAGIC_STRING_KEY = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const SEVEN_BITS_INTEGER_MARKER = 125
const SIXTEEN_BITS_INTEGER_MARKER = 126
const SIXTYFOUR_BITS_INTEGER_MARKER = 127
const MAXIMUM_SIXTEENBITS_INTEGER = 2 ** 16

const MASK_KEY_BITES_LENGTH = 4
const OPCODE_TEXT = 0x01 //1 bit in binary 1

// parseInt('10000000', 2)

const FIRST_BIT = 128

const server = createServer((req,res) => {
  res.writeHead(200)
  res.end('Hey there!')
}).listen(PORT, () => {
  console.log(`Server listening port ${PORT} 🚀 🔥 `)
})

function onSocketUpgrade(req,socket,head) {
  const {'sec-websocket-key': webClientWebSocket} = req.headers
  console.log(`${webClientWebSocket} connected 🔥`)
  const headers = prepareHandShakeHeaders(webClientWebSocket)
  socket.write(headers)
  socket.on('readable', () => onSocketReadable(socket))

}

function sendMessage(msg, socket) {
  const dataFrameBuffer = prepareMessage(msg)
  socket.write(dataFrameBuffer)
}

function prepareMessage(message) {
  const msg = Buffer.from(message)
  const messageSize = msg.length

  let dataFrameBuffer


  // '0x' + Math.abs(128).toString(16) == 0x80
  const firstByte = 0x80 | OPCODE_TEXT //single frame + text
  if(messageSize <= SEVEN_BITS_INTEGER_MARKER) {
    const bytes = [firstByte]
    dataFrameBuffer = Buffer(bytes.concat(messageSize))
  } else if(messageSize <= MAXIMUM_SIXTEENBITS_INTEGER) { 
    const offsetFourBytes = 4
    const target = Buffer.allocUnsafe(offsetFourBytes)
    target[0] = firstByte
    target[1] = SIXTEEN_BITS_INTEGER_MARKER | 0x0 // just to know the mask
    target.writeUint16BE(messageSize, 2) //content length is 2 bytes

    dataFrameBuffer = target

    //aloc 4 bytes
    //[0] - 128 + 1 = 0x81 FIN + OPCODE
    //[1] - 126 + 0= payload length marker + mask indicator
    //[2] 0 - content length
    //[3] 171 - content length
    //[4] - remaining bytes
  }else {
    throw new Error('Message too long today !')
  }

  const totalLength = dataFrameBuffer.byteLength + messageSize
  const dataFrameResponse = concat([dataFrameBuffer, msg], totalLength)
  return dataFrameResponse
}

function concat(bufferList, totalLength) {
  const target = Buffer.allocUnsafe(totalLength)
  let offset = 0
  for (const buffer of bufferList) {
    target.set(buffer, offset)
    offset += buffer.length
  }

  return target
}

function onSocketReadable(socket) {
  //consume optcode (first byte)
  //1 - 1byte = 8bits
  socket.read(1)

  //Because the first bit is always 1 for client to server messages

  //you can substract one bit (128 ou '10000000') from this byte to get rid of the mask 
  const [ markerAndPayloadLength ] = socket.read(1)

  const lengthIndicatorInBits = markerAndPayloadLength - FIRST_BIT

  let messageLength = 0

  if(lengthIndicatorInBits <= SEVEN_BITS_INTEGER_MARKER){
    messageLength = lengthIndicatorInBits
  }else if(lengthIndicatorInBits === SIXTEEN_BITS_INTEGER_MARKER){
    //unsigned, big-endian 16-bit-integer [0-65K] - 2 ** 16
    messageLength = socket.read(2).readUint16BE(0)
  }else{
    throw new Error("Your message is too long, we don't handle 64-bits message")
  }

  const maskKey = socket.read(MASK_KEY_BITES_LENGTH)
  const encoded = socket.read(messageLength)
  const decoded = unmask(encoded, maskKey)
  const received = decoded.toString('utf8')
  const data = JSON.parse(received)


  console.log('message receive ', data)

  const msg = JSON.stringify({
    message: data,
    at: new Date().toISOString()
  })

  sendMessage(msg, socket)
}

function unmask(encodedBuffer, maskKey) {
  const finalBuffer = Buffer.from(encodedBuffer)
  // the maskKey has only 4 bytes 
  //  index % 4 === 0, 1, 2, 3 = index bits neede to decode the message

  //XOR ^
  //return 1 if both are different
  //return 0 if both are equal

  //(71).toString().padStart(8, "0") = 0 1 0 0 0 1 1 1
  //(52).toString().padStart(8, "0") = 0 0 1 1 0 1 0 1
  //                                   0 1 1 1 0 0 1 0       

  //(71 ^ 52).toString(2).padStart(8, "0") = '01110010'
  //String.fromCharCode(parseInt('01110010',2))

  const fillWithEightZeros = (t) => t.padStart(8, '0')
  const toBinary = (n) => fillWithEightZeros(n.toString(2))
  const fromBinaryToDecimal = (t) => parseInt(toBinary(t),2)
  const getCharfromBinary = (t) => String.fromCharCode(fromBinaryToDecimal(t))

  for(var index = 0; index < encodedBuffer.length; index++){
    finalBuffer[index] = encodedBuffer[index] ^ maskKey[index % MASK_KEY_BITES_LENGTH]
    const logger = {
      unmaskingCalc: `${toBinary(encodedBuffer[index])} ^ ${toBinary(maskKey[index % MASK_KEY_BITES_LENGTH])} = ${toBinary(finalBuffer[index])}}`, 
      decoded: getCharfromBinary(finalBuffer[index])
    }
    console.log(logger)
  }

  return finalBuffer
}

function prepareHandShakeHeaders(id){
  const acceptKey = createSocketAccept(id)
  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
    ''
  ].map(line => line.concat('\r\n')).join('')
  return headers
}

function createSocketAccept (id) {
  const shaone = crypto.createHash('sha1')
  shaone.update(id+WEBSOCKET_MAGIC_STRING_KEY)
  return shaone.digest('base64')
}

server.on('upgrade', onSocketUpgrade)

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

