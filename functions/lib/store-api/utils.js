const getOrderById = async (appSdk, storeId, orderId, auth) => {
  const { response: { data } } = await appSdk.apiRequest(storeId, `/orders/${orderId}.json`, 'GET', null, auth)
  return data
}

const addPaymentHistory = async (appSdk, storeId, orderId, auth, body) => {
  return appSdk.apiRequest(storeId, `orders/${orderId}/payments_history.json`, 'POST', body, auth)
}

const updateTransaction = (appSdk, storeId, orderId, auth, body, transactionId) => {
  const urlTransaction = transactionId ? `/${transactionId}` : ''
  const method = transactionId ? 'PATCH' : 'POST'

  return appSdk.apiRequest(storeId, `orders/${orderId}/transactions${urlTransaction}.json`, method, body, auth)
}

const getOrderIntermediatorTransactionId = async (appSdk, storeId, invoiceId, auth) => {
  let queryString = `?transactions.intermediator.transaction_id=${invoiceId}`
  queryString += '&fields=transactions,financial_status.current,status'
  const { response: { data } } = await appSdk
    .apiRequest(storeId, `/orders.json${queryString}`, 'GET', null, auth)

  // console.log(`>>> ${JSON.stringify(data)}`)

  return data?.result.length ? data?.result[0] : null
}

module.exports = {
  getOrderById,
  addPaymentHistory,
  updateTransaction,
  getOrderIntermediatorTransactionId
}
