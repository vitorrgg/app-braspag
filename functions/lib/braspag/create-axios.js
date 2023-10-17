const axios = require('axios')
const { isSandbox } = require('../../__env')

module.exports = (merchantId, merchantKey, isQuery, isSimulated) => {
  const version = 'v2'
  const headers = {
    'Content-Type': 'application/json',
    MerchantId: merchantId,
    MerchantKey: merchantKey
  }

  console.log(`>Request ${isSandbox || isSimulated ? 'sandbox' : ''}`)
  const url = `api${isQuery ? 'query' : ''}${isSandbox || isSimulated ? 'sandbox' : ''}`

  return axios.create({
    baseURL: `https://${url}.braspag.com.br/${version}`,
    headers
  })
}
