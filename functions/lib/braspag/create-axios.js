const axios = require('axios')
const isSandbox = require('../../__env')

module.exports = (merchantId, merchantKey, isQuery) => {
  const version = 'v2'
  const headers = {
    'Content-Type': 'application/json',
    MerchantId: merchantId,
    MerchantKey: merchantKey
  }

  const url = `api${isQuery ? 'query' : ''}${isSandbox ? 'sandbox' : ''}`
  // console.log('>BaseUrl: ', url, ' version: ', version)

  return axios.create({
    baseURL: `https://${url}.braspag.com.br/${version}`,
    headers
  })
}
