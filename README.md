# web-sockets-node-no-lib
Building a complete application implementing the Web Socket protocol using only Node.js built-in modules.

- Web Socket Server
    - Receiving data
      - [x] Establishes handshake connections according to the Web Socket protocol
      - [x] Receives masked data payloads
      - [x] Decodes 7-bits long data payloads 
      - [x] Decodes 16-bits long data payloads 
      - [ ] Decodes 64-bits long data payloads 
    - Replying
      - [x] Builds data frames according to the Web Socket protocol
      - [x] Sends 7-bits long unmasked data payloads
      - [x] Sends 16-bits long unmasked data payloads
      - [ ] Sends 64-bits long unmasked data payloads

