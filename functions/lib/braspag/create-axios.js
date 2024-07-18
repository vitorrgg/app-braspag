const axios = require('axios')
const { isSandbox } = require('../../__env')

module.exports = (merchantId, merchantKey, isQuery, isSimulated, isCielo) => {
  const headers = {
    'Content-Type': 'application/json',
    MerchantId: merchantId,
    MerchantKey: merchantKey
  }

  // console.log(`>Request ${isSandbox || isSimulated ? 'sandbox' : ''}`)
  const url = `api${isQuery ? 'query' : ''}${isSandbox || isSimulated ? 'sandbox' : ''}`
  const baseURL = isCielo ? `https://${url}.cieloecommerce.cielo.com.br/1` : `https://${url}.braspag.com.br/v2`

  return axios.create({
    baseURL,
    headers
  })
}
