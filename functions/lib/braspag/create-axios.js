const axios = require('axios')
const { isSandbox } = require('../../__env')

module.exports = (merchantId, merchantKey, isQuery) => {
  const version = 'v2'
  const headers = {
    'Content-Type': 'application/json',
    MerchantId: merchantId,
    MerchantKey: merchantKey
  }

  console.log(`>Request ${isSandbox ? 'sandbox' : ''}`)
  const url = `api${isQuery ? 'query' : ''}${isSandbox ? 'sandbox' : ''}`

  return axios.create({
    baseURL: `https://${url}.braspag.com.br/${version}`,
    headers
  })
}
