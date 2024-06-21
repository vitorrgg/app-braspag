; (function () {
  const isSandbox = window._braspagIsSandbox
  console.log('>> SOP: ', isSandbox)

  const accessToken = window._braspagAccessToken
  // const merchantId = window._braspagMerchantIdProtectedCard

  const newScript = `
  <script> 
    var io_bbout_element_id = gatewayFingerprint;
  </script> 
  `
  document.head.appendChild(newScript)

  const script = '<script type=”text/javascript” src=”https://mpsnare.iesnare.com/snare.js”></script>'
  document.appendChild(script)
  const elementsScript = '<input> type="hidden" name="gatewayFingerprint" id="gatewayFingerprint" </input>'
  const newForm = document.createElement('form')
  newForm.setAttribute('id', 'formBraspag')
  newForm.innerHTML = elementsScript
  document.body.appendChild(newForm)

  window._braspagHashCard = async function (cardClient) {
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
    return new Promise(async function (resolve, reject) {
      const options = {
        accessToken,
        onSuccess: function (response) {
          console.log('>', response)
          if (response.PaymentToken) {
            const data = JSON.stringify({ token: response.PaymentToken })
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
