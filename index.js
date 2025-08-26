const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')
const FormData = require('form-data')
const multer = require('multer')
const bodyParser = require('body-parser')

const app = express()
const upload = multer()

app.use(cors())
app.use(bodyParser.json())

app.post('/upscale', upload.single('image'), async (req, res) => {
  // ... kode sama persis dengan sebelumnya ...
})

// ✅ Export biar bisa dipakai Vercel
module.exports = app
