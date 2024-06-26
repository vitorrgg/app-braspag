; (function () {
  const isSandbox = window._braspagIsSandbox
  console.log('>> SOP: ', isSandbox)

  const accessToken = window._braspagAccessToken
  const elementScript = `(function (a, b, c, d, e, f, g) {
    a['CsdpObject'] = e; a[e] = a[e] || function () {
    (a[e].q = a[e].q || []).push(arguments)
    }, a[e].l = 1 * new Date(); f = b.createElement(c),
    g = b.getElementsByTagName(c)[0]; f.async = 1; f.src = d; g.parentNode.insertBefore(f, g)
    })(window, document, 'script', '//device.clearsale.com.br/p/fp.js', 'csdp');
    csdp('app', 'seu_app');
    csdp('outputsessionid', 'mySessionId');`

  const newScript = document.createElement('script')
  newScript.innerHTML = elementScript
  document.head.appendChild(newScript)
  // const merchantId = window._braspagMerchantIdProtectedCard
  // const newScript2 = document.createElement('script')
  // newScript2.type = 'text/javascript'
  // newScript2.src = 'https://mpsnare.iesnare.com/snare.js'
  // document.head.append(newScript2)

  // const elementsScript = '<input type="hidden" name="gatewayFingerprint" id="gatewayFingerprint"> </input>'
  // const newForm = document.createElement('form')
  // newForm.innerHTML = elementsScript
  // document.body.appendChild(newForm)

  const elementsScript = '<input type="hidden" id="mySessionId" value=""/>'
  const newForm = document.createElement('form')
  newForm.innerHTML = elementsScript
  document.body.appendChild(newForm)

  let fingerPrintId
  setTimeout(() => {
    fingerPrintId = document.getElementById('mySessionId').value
    console.log('>> id ', fingerPrintId)

    const elementScript = `
    (function (a, b, c, d, e, f, g) {
      a['CsdpObject'] = e; a[e] = a[e] || function () {
      (a[e].q = a[e].q || []).push(arguments)
      }, a[e].l = 1 * Date.now(); f = b.createElement(c),
      g = b.getElementsByTagName(c)[0]; f.async = 1; f.src = d; g.parentNode.insertBefore(f, g)
      })(window, document, 'script', '//device.clearsale.com.br/p/fp.js', 'csdp');
      csdp('app', 'seu_app');
      csdp('sessionid', '${fingerPrintId}');`

    const newScript = document.createElement('script')
    newScript.innerHTML = elementScript
    document.body.appendChild(newScript)
  }, 100)

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

    return new Promise(async function (resolve, reject) {
      console.log('>> pos id ', fingerPrintId)
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
