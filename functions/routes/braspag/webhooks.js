// REF.: // https://braspag.github.io//manual/braspag-pagador#post-de-notifica%C3%A7%C3%A3o
const getAppData = require('../../lib/store-api/get-app-data')
const axios = require('../../lib/braspag/create-axios')
const { parseStatus } = require('../../lib/braspag/parse-utils')
const {
  addPaymentHistory,
  getOrderIntermediatorTransactionId
} = require('../../lib/store-api/utils')
const { logger } = require('../../context')

exports.post = async ({ appSdk, admin }, req, res) => {
  const { body, query } = req
  /*
    {
      "RecurrentPaymentId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "PaymentId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "ChangeType": "2"
    }
  */

  try {
    const type = body.ChangeType
    const storeId = parseInt(query.store_id, 10)

    logger.info(`>> webhook ${JSON.stringify(body)}, type:${type}, store: ${storeId}`)
    const auth = await appSdk.getAuth(storeId)
    const appData = await getAppData({ appSdk, storeId, auth })
    const { merchant_id: merchantId, merchant_key: merchantKey, is_cielo: isCielo } = appData

    if (type === 1) {
      // Payment status change
      // const isSimulated = appData.credit_card?.provider === 'Simulado' &&
      //   appData.banking_billet?.provider === 'Simulado'

      const appName = isCielo ? 'Cielo' : 'Braspag'
      const appAxios = axios(merchantId, merchantKey, true, false, isCielo)
      const { data: { Payment: payment } } = await appAxios.get(`/sales/${body.PaymentId}`)
      let dateTime = new Date()
      logger.info(`>> payment [${appName}]: ${JSON.stringify(payment)}`)

      const order = await getOrderIntermediatorTransactionId(appSdk, storeId, body.PaymentId, auth)
      if (order) {
        const openedAt = order.opened_at
        const status = (parseStatus[payment.Status] || 'unknown')
        if (order.financial_status.current !== status) {
          // updadte status
          const transaction = order.transactions.find(transaction => transaction.intermediator.transaction_id === body.PaymentId)
          logger.info('>> Try add payment history')

          let notificationCode = `${type};${payment.Type};`
          if ((parseStatus[payment.Status] === 'refunded' || parseStatus[payment.Status] === 'voided') &&
            payment?.VoidedDate) {
            dateTime = new Date(`${payment?.VoidedDate} UTC-3`)
            notificationCode += `${dateTime};`
          } else if (payment.CapturedDate && parseStatus[payment.Status] === 'paid') {
            dateTime = new Date(`${payment.CapturedDate} UTC-3`)
            notificationCode += `${dateTime.toISOString()};`
          }

          if (openedAt) {
            // Braspag invoices do not validate the payment time, only the day is informed.
            // If the payment is made on the same day, a payment history will be generated before the order is created,
            // and will not update the order status.

            const dateOpenedAt = new Date(openedAt)
            if (dateTime.getTime() <= dateOpenedAt.getTime()) {
              dateTime = new Date()
            }
          }

          const bodyPaymentHistory = {
            date_time: dateTime.toISOString(),
            status,
            notification_code: notificationCode,
            flags: [appName]
          }
          if (transaction && transaction._id) {
            bodyPaymentHistory.transaction_id = transaction._id
          }
          // logger.info('>> ', dateTime, ' ', payment?.CapturedDate,  ' ',  payment?.VoidedDate)
          await addPaymentHistory(appSdk, storeId, order._id, auth, bodyPaymentHistory)
          logger.info(`>> Status update to ${status}`)
          return res.sendStatus(200)
        } else {
          logger.info(`Status is ${status}`)
          return res.sendStatus(200)
        }
      } else {
        return res.status(404)
          .send({ message: `order with TransactionId #${body.PaymentId} not found` })
      }
    }
  } catch (error) {
    logger.error(error)
    const errCode = 'WEBHOOK_BRASPAG_INTERNAL_ERR'
    let status = 409
    let message = error.message
    if (error.response) {
      status = error.response.status || status
      const { data } = error.response
      if (status !== 401 && status !== 403) {
        message = error.response.message || message
      } else if (data && Array.isArray(data.errors) && data.errors[0] && data.errors[0].message) {
        message = data.errors[0].message
      }
    }
    return res.status(status || 500)
      .send({
        error: errCode,
        message
      })
  }
}
