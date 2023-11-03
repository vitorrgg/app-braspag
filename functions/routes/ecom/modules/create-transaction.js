const { baseUri } = require('../../../__env')
const axios = require('../../../lib/braspag/create-axios')
const { parseStatus } = require('../../../lib/braspag/parse-utils')
const bodyBraspag = require('../../../lib/braspag/payload-to-transaction')
exports.post = async ({ appSdk, admin }, req, res) => {
  /**
   * Requests coming from Modules API have two object properties on body: `params` and `application`.
   * `application` is a copy of your app installed by the merchant,
   * including the properties `data` and `hidden_data` with admin settings configured values.
   * JSON Schema reference for the Create Transaction module objects:
   * `params`: https://apx-mods.e-com.plus/api/v1/create_transaction/schema.json?store_id=100
   * `response`: https://apx-mods.e-com.plus/api/v1/create_transaction/response_schema.json?store_id=100
   *
   * Examples in published apps:
   * https://github.com/ecomplus/app-pagarme/blob/master/functions/routes/ecom/modules/create-transaction.js
   * https://github.com/ecomplus/app-custom-payment/blob/master/functions/routes/ecom/modules/create-transaction.js
   */

  const { params, application } = req.body
  const { storeId } = req
  // merge all app options configured by merchant
  const appData = Object.assign({}, application.data, application.hidden_data)
  // setup required `transaction` response object
  const { amount } = params
  const transaction = {
    amount: amount.total
  }

  // indicates whether the buyer should be redirected to payment link right after checkout
  const redirectToPayment = false
  const orderId = params.order_id

  const { merchant_id: merchantId, merchant_key: merchantKey, is_cielo: isCielo } = appData
  const methodPayment = params.payment_method.code
  const isSimulated = (methodPayment === 'credit_card' || methodPayment === 'banking_billet') &&
    appData[methodPayment]?.provider === 'Simulado'

  try {
    const appName = isCielo ? 'Cielo' : 'Braspag'
    const appAxios = axios(merchantId, merchantKey, null, isSimulated, isCielo)
    const body = bodyBraspag(appData, orderId, params, methodPayment)
    console.log(`>> body #${storeId} [${appName}]: ${JSON.stringify(body)}`)
    const { data } = await appAxios.post('/sales', body)
    console.log(`>> data #${storeId} [${appName}]: ${JSON.stringify(data)}`)

    const payment = data.Payment
    const intermediator = {}

    if (methodPayment === 'credit_card') {
      intermediator.transaction_id = payment.PaymentId
      intermediator.transaction_reference = payment.ProofOfSale
      intermediator.transaction_code = payment.AcquirerTransactionId
      // `${payment.AuthorizationCode}`

      transaction.status = {
        current: parseStatus[payment.Status] || 'unknown',
        updated_at: payment.CapturedDate ? new Date(`${payment.CapturedDate} UTC+0`).toISOString() : new Date().toISOString()
      }
    } else if (methodPayment === 'banking_billet') {
      transaction.banking_billet = {
        code: payment.DigitableLine,
        valid_thru: new Date(payment.ExpirationDate).toISOString(),
        link: payment.Url
      }

      intermediator.transaction_id = payment.PaymentId
      intermediator.transaction_reference = payment.BoletoNumber
      // transaction_code: data.retorno

      transaction.status = {
        current: 'pending',
        updated_at: new Date().toISOString()
      }
    } else {
      intermediator.transaction_id = payment.PaymentId
      intermediator.transaction_reference = payment.ProofOfSale
      intermediator.transaction_code = payment.AcquirerTransactionId

      const qrCodeBase64 = payment.QrCodeBase64Image
      const qrCode = payment.QrCodeString

      const collectionQrCode = admin.firestore().collection('qr_code_braspag')
      await collectionQrCode.doc(orderId).set({ qrCode: qrCodeBase64 })

      const qrCodeSrc = `${baseUri}/qr-code?orderId=${orderId}`

      transaction.notes = '<div style="display:block;margin:0 auto"> ' +
        `<img src="${qrCodeSrc}" style="display:block;margin:0 auto; width:150px;"> ` +
        `<input readonly type="text" id="pix-copy" value="${qrCode}" />` +
        `<button type="button" class="btn btn-sm btn-light" onclick="let codePix = document.getElementById('pix-copy')
          codePix.select()
          document.execCommand('copy')">Copiar Pix</button></div>`

      transaction.status = {
        current: 'pending',
        updated_at: new Date().toISOString()
      }
    }

    transaction.intermediator = intermediator

    res.send({
      redirect_to_payment: redirectToPayment,
      transaction
    })
  } catch (error) {
    console.log(error.response)
    // try to debug request error
    const errCode = 'BRASPAG_TRANSACTION_ERR'
    let { message } = error
    const err = new Error(`${errCode} #${storeId} - ${orderId} => ${message}`)
    if (error.response) {
      const { status, data } = error.response
      if (status !== 401 && status !== 403) {
        err.payment = JSON.stringify(transaction)
        err.status = status
        if (typeof data === 'object' && data) {
          err.response = JSON.stringify(data)
        } else {
          err.response = data
        }
      } else if (data && Array.isArray(data.errors) && data.errors[0] && data.errors[0].message) {
        message = data.errors[0].message
      }
    }
    console.error(err)
    res.status(409)
    res.send({
      error: errCode,
      message
    })
  }
}
