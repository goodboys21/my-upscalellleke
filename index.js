const express = require('express')
const app = require('./upscale')

const server = express()
server.use('/', app)

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
