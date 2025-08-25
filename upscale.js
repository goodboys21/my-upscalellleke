const express = require('express')
const fetch = require('node-fetch')
const FormData = require('form-data')
const multer = require('multer')

const router = express.Router()
const upload = multer()

// POST /upscale - bisa upload file langsung
router.post('/upscale', upload.single('image'), async (req, res) => {
  try {
    let base64Image

    if (req.file) {
      // kalau upload file binary
      const mime = req.file.mimetype
      const buffer = req.file.buffer
      base64Image = `data:${mime};base64,${buffer.toString('base64')}`
    } else if (req.body.image) {
      // fallback kalau masih pakai base64
      base64Image = req.body.image
    } else {
      return res.status(400).json({ error: 'No image provided' })
    }

    const scale = Number(req.body.scale) || 4
    const face_enhance = req.body.face_enhance !== 'false'

    // Step 1: tracking
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

    // Step 2: submit job
    const submit = await fetch('https://fooocus.one/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: "f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
        input: { image: base64Image, scale, face_enhance }
      })
    })
    const job = await submit.json()
    if (!job.id && !job.data?.id) {
  return res.status(500).json({ error: 'Failed to create upscale job', detail: job })
}

// Ambil id job (kadang di `id`, kadang di `data.id`)
const jobId = job.id || job.data.id
    // Step 3: polling hasil
    let result = null
for (let i = 0; i < 30; i++) {
  const check = await fetch(`https://fooocus.one/api/predictions/${jobId}`)
  result = await check.json()
  if (result.status === 'succeeded' || result.status === 'failed') break
  await new Promise(r => setTimeout(r, 1000))
}

    if (!result || result.status !== 'succeeded') {
      return res.status(500).json({ error: 'Upscale failed or timeout', detail: result })
    }

    // Step 4: download hasil
    const imgResp = await fetch(result.output)
    const buffer = await imgResp.buffer()

    // Step 5: upload ke Catbox
    const form = new FormData()
    form.append('reqtype', 'fileupload')
    form.append('fileToUpload', buffer, { filename: 'upscaled.png' })

    const uploadResp = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: form
    })
    const catboxUrl = await uploadResp.text()

    res.json({
      status: 'success',
      catbox: catboxUrl.trim(),
      logs: result.logs
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
