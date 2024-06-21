; (function () {
  const isSandbox = window._braspagIsSandbox
  console.log('>> SOP: ', isSandbox)

  const accessToken = window._braspagAccessToken
  const elementScript = 'var io_bbout_element_id = "gatewayFingerprint";'
  const newScript = document.createElement('script')
  newScript.innerHTML = elementScript
  document.head.appendChild(newScript)
  // const merchantId = window._braspagMerchantIdProtectedCard
  const newScript2 = document.createElement('script')
  newScript2.type = 'text/javascript'
  newScript2.src = 'https://mpsnare.iesnare.com/snare.js'
  document.head.append(newScript2)

  const elementsScript = '<input type="hidden" name="gatewayFingerprint" id="gatewayFingerprint"> </input>'
  const newForm = document.createElement('form')
  newForm.innerHTML = elementsScript
  document.body.appendChild(newForm)

  window._braspagHashCard = async function (cardClient) {
    document.body.appendChild(newScript)
    const elementsForm = `
    <input type="text" class="bp-sop-cardtype" value="creditCard" style="display: none;>
    <input type="text" class="bp-sop-cardcvvc" value="${cardClient.cvc}" style="display: none;">
    <input type="text" class="bp-sop-cardnumber" value="${cardClient.number}" style="display: none;">
    <input type="text" class="bp-sop-cardexpirationdate" value="${cardClient.month.toString()}/20${cardClient.year.toString()}" style="display: none;">
    <input type="text" class="bp-sop-cardholdername" value="${cardClient.name}" style="display: none;">
    `

    const newForm = document.createElement('form')
    newForm.setAttribute('id', 'formBraspag')
    newForm.innerHTML = elementsForm
    document.body.appendChild(newForm)

    const fingerPrintId = document.getElementById('gatewayFingerprint').value

    return new Promise(async function (resolve, reject) {
      const options = {
        accessToken,
        onSuccess: function (response) {
          // console.log('>', response)
          if (response.PaymentToken) {
            const data = JSON.stringify({ token: response.PaymentToken, fingerPrintId })
            resolve(window.btoa(data))
          } else {
            const error = new Error('PaymentToken not found')
            reject(error)
          }
        },
        onError: function (response) {
          reject(response)
        },
        onInvalid: function (validationResults) {
          reject(validationResults)
        },
        environment: isSandbox ? 'sandbox' : 'production',
        language: 'PT',
        enableBinQuery: false,
        enableVerifyCard: true,
        enableTokenize: false,
        cvvrequired: false
      }

      window.bpSop_silentOrderPost(options)
    })
  }
}())
