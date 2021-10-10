let config = JSON.parse(Buffer.from(process.env.GC_CREDENTIALS, "base64").toString())

export default config