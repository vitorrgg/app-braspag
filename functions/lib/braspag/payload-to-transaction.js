const { parseAddress, parsePaymentType } = require('./parse-utils')
// /*
const parseFraudAnalysis = (appData, params, Address, fingerPrintId) => {
  const { amount, buyer, items } = params
  const isAnalyseFirst = Boolean(appData.is_analyse_first)
  const isAnalyseAlways = Boolean(appData.is_analyse_always)
  const fraudAnalysis = {
    Sequence: isAnalyseFirst ? 'AnalyseFirst' : 'AuthorizeFirst',
    SequenceCriteria: isAnalyseFirst ? 'Always' : (isAnalyseAlways ? 'Always' : 'OnSuccess'),
    Provider: 'ClearSale',
    TotalOrderAmount: (amount.total * 100),
    FingerPrintId: fingerPrintId,
    Shipping: {
      Addressee: buyer.fullname,
      Method: 'Other',
      Identity: buyer.doc_number,
      IdentityType: buyer.registry_type.toUpperCase() === 'P' ? '1' : '2',
      ...Address
    },
    Cart: {
      ReturnsAccepted: true,
      Items: items.map(item => {
        return {
          Name: item.name || item.variation_id || item.product_id,
          Quantity: item.quantity,
          Sku: item.sku,
          UnitPrice: Math.floor((item.final_price || item.price) * 100),
          Type: 'Default'
        }
      })
    }
  }
  return fraudAnalysis
}
// */

module.exports = (appData, orderId, params, methodPayment, isCielo) => {
  const { amount, buyer, to } = params

  const methodConfig = appData[methodPayment]

  const Address = to && to.street ? parseAddress(to) : parseAddress(params.billing_address)
  const body = {
    MerchantOrderId: orderId,
    Customer: {
      Name: buyer.fullname,
      Identity: buyer.doc_number,
      IdentityType: buyer.registry_type.toUpperCase() === 'P' ? 'CPF' : 'CNPJ'
    },
    Payment: {
      Provider: methodConfig.provider,
      Type: parsePaymentType[methodPayment] || 'CreditCard',
      Amount: (amount.total * 100)
    }
  }

  if (methodPayment === 'credit_card') {
    const hashCard = JSON.parse(Buffer.from(params.credit_card.hash, 'base64'))
    const installmentsNumber = params.installments_number || 1

    if (isCielo) {
      delete body.Payment.Provider
    }

    Object.assign(
      body.Payment,
      {
        Installments: installmentsNumber,
        CreditCard: {
          PaymentToken: hashCard.token
        },
        Capture: true,
        FraudAnalysis: parseFraudAnalysis(appData, params, Address, hashCard.fingerPrintId)
      }
    )
  } else if (methodPayment === 'account_deposit') {
    if (isCielo) {
      delete body.Payment.Provider
    }

    Object.assign(body.Customer, { Address })
    Object.assign(body.Payment, { QrCodeExpiration: 86400 })
  }

  return body
}
