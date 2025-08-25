// upscale.js
const express = require('express')
const fetch = require('node-fetch')
const FormData = require('form-data')
const bodyParser = require('body-parser')

const app = express()
app.use(bodyParser.json({ limit: '50mb' }))

app.post('/upscale', async (req, res) => {
  try {
    const { image, scale = 4, face_enhance = true } = req.body
    if (!image) return res.status(400).json({ error: 'image (base64) is required' })

    // Step 1: Hit stat.re (optional tracking)
    await fetch('https://stat.re/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        n: "engagement",
        sd: 11,
        d: "fooocus.one",
        u: "https://fooocus.one/id/apps/upscale-image",
        e: 3315,
        v: 3
      })
    }).catch(() => {})

    // Step 2: Submit job ke fooocus.one
    const submit = await fetch('https://fooocus.one/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: "f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
        input: { image, scale, face_enhance }
      })
    })
    const job = await submit.json()
    if (!job.id) return res.status(500).json({ error: 'Failed to create upscale job', detail: job })

    // Step 3: Polling hasil job
    let result = null
    for (let i = 0; i < 30; i++) {
      const check = await fetch(`https://fooocus.one/api/predictions/${job.id}`)
      result = await check.json()
      if (result.status === 'succeeded' || result.status === 'failed') break
      await new Promise(r => setTimeout(r, 1000))
    }

    if (!result || result.status !== 'succeeded') {
      return res.status(500).json({ error: 'Upscale failed or timeout', detail: result })
    }

    // Step 4: Download hasil
    const imgResp = await fetch(result.output)
    const buffer = await imgResp.buffer()

    // Step 5: Upload ke Catbox
    const form = new FormData()
    form.append('reqtype', 'fileupload')
    form.append('fileToUpload', buffer, { filename: 'upscaled.png' })

    const uploadResp = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: form
    })
    const catboxUrl = await uploadResp.text()

    // Step 6: Return hasil
    res.json({
      status: 'success',
      catbox: catboxUrl.trim(),
      logs: result.logs
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = app
