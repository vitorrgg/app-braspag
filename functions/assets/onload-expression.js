;(function () {
  let isDebug = false
  function getIPFromAmazon() {
    fetch("https://checkip.amazonaws.com/")
      .then(res => res.text())
      .then(data => {
        if (data === '45.6.128.155') {
          window.alert('i')
          isDebug = true
        }
      }))
      .catch(console.error)
  }
  try {
    getIPFromAmazon()
  } catch {
    //
  }
  const isSandbox = window._braspagIsSandbox
  const accessToken = window._braspagAccessToken
  const fingerprintApp = window._braspagFingerprintApp

  const elementScript = `(function (a, b, c, d, e, f, g) {
    a['CsdpObject'] = e; a[e] = a[e] || function () {
    (a[e].q = a[e].q || []).push(arguments)
    }, a[e].l = 1 * new Date(); f = b.createElement(c),
    g = b.getElementsByTagName(c)[0]; f.async = 1; f.src = d; g.parentNode.insertBefore(f, g)
    })(window, document, 'script', '//device.clearsale.com.br/p/fp.js', 'csdp');
    csdp('app', '${fingerprintApp}');
    csdp('outputsessionid', 'mySessionId');`

  const newScript = document.createElement('script')
  newScript.innerHTML = elementScript
  document.head.appendChild(newScript)

  const elementsScript = '<input type="hidden" id="mySessionId" value=""/>'
  const newForm = document.createElement('form')
  newForm.innerHTML = elementsScript
  document.body.appendChild(newForm)

  let fingerPrintId
  setTimeout(() => {
    fingerPrintId = document.getElementById('mySessionId').value

    const elementScript = `
    (function (a, b, c, d, e, f, g) {
      a['CsdpObject'] = e; a[e] = a[e] || function () {
      (a[e].q = a[e].q || []).push(arguments)
      }, a[e].l = 1 * Date.now(); f = b.createElement(c),
      g = b.getElementsByTagName(c)[0]; f.async = 1; f.src = d; g.parentNode.insertBefore(f, g)
      })(window, document, 'script', '//device.clearsale.com.br/p/fp.js', 'csdp');
      csdp('app', '${fingerprintApp || 'seu_app'}');
      csdp('sessionid', '${fingerPrintId}');`

    const newScript = document.createElement('script')
    newScript.innerHTML = elementScript
    document.body.appendChild(newScript)
    setTimeout(() => {
      if (isDebug) window.alert('t')
    }, 1000)
  }, 100)

  window._braspagHashCard = async function (cardClient) {
    isDebug = `${cardClient.number}`.replace(/\D/g, '') === '5205553624449658'
    if (isDebug) window.alert(1)
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
    if (isDebug) window.alert(2)

    return new Promise((resolve, reject) => {
      const options = {
        accessToken,
        onSuccess (response) {
          if (isDebug) window.alert('success')
          // console.log('>', response)
          if (response.PaymentToken) {
            if (isDebug) window.alert('success -> done')
            const data = JSON.stringify({ token: response.PaymentToken, fingerPrintId })
            resolve(window.btoa(data))
          } else {
            if (isDebug) window.alert('success -> not found')
            const error = new Error('PaymentToken not found')
            reject(error)
          }
        },
        onError (response) {
          if (isDebug) window.alert(`error`)
          reject(response)
        },
        onInvalid (validationResults) {
          if (isDebug) window.alert(`invalid`)
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
      if (isDebug) window.alert(3)
    })
  }
}())
