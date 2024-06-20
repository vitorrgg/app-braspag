const { parseAddress, parsePaymentType } = require('./parse-utils')

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

    const isAnalyseFirst = Boolean(appData.is_analyse_first)
    const isAnalyseAlways = Boolean(appData.is_analyse_always)
    Object.assign(
      body.Payment,
      {
        Installments: installmentsNumber,
        CreditCard: {
          PaymentToken: hashCard.token
        },
        Capture: true,
        FraudAnalysis: {
          Sequence: isAnalyseFirst ? 'AnalyseFirst' : 'AuthorizeFirst',
          SequenceCriteria: isAnalyseFirst ? 'Always' : (isAnalyseAlways ? 'Always' : 'OnSuccess'),
          Provider: 'RedShield'
        }
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
