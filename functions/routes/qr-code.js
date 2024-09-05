const { logger } = require("../context")

exports.get = async ({ appSdk, admin }, req, res) => {
  const collectionQrCode = admin.firestore().collection('qr_code_braspag')
  try {
    const { orderId } = req.query
    const doc = await collectionQrCode.doc(orderId).get()
    let qrCode
    if (doc) {
      qrCode = doc.data().qrCode
    }
    if (qrCode) {
      const img = Buffer.from(qrCode, 'base64')
      res.setHeader('Content-Length', img.length)
      res.setHeader('Content-Type', 'image/png')
      res.end(img)
    }
  } catch (err) {
    logger.error(err)
    res.status(500)
    const { message } = err
    res.send({
      error: 'QR_CODE_ERROR',
      message
    })
  }
}
