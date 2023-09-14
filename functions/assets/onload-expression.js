; (function () {
  const isSandbox = window._barspagIsSandbox

  const accessToken = window._braspagAccessToken
  const merchantId = window._braspagMerchantIdProtectedCard

  /*
    Ref.: https://braspag.github.io//manual/cartao-protegido-api-rest

    SANDBOX: https://cartaoprotegidoapisandbox.braspag.com.br/
    PRODUÇÃO:https://cartaoprotegidoapi.braspag.com.br/

  */
  // console.log('>> ', accessToken, ' ', merchantId)
  const baseUrL = `https://cartaoprotegidoapi${isSandbox ? 'sandbox' : ''}.braspag.com.br`

  window._braspagHashCard = async function (cardClient) {
    const Card = {
      Number: cardClient.number,
      Holder: cardClient.name,
      ExpirationDate: `${cardClient.month.toString()}/20${cardClient.year.toString()}`,
      SecurityCode: cardClient.cvc
    }
    return new Promise(async function (resolve, reject) {
      const headers = {
        'Content-Type': 'application/json',
        MerchantID: merchantId,
        Authorization: `Bearer ${accessToken}`
      }
      const body = JSON.stringify({ Alias: `${Date.now()}`, Card })
      console.log('>> ', JSON.stringify(headers), ' body ', body)
      try {
        const response = await fetch(
          `${baseUrL}/v1/Token`,
          {
            method: 'POST',
            headers,
            body
          }
        )

        if (response.status >= 400) {
          throw new Error(await response.text())
        }
        const json = await response.json()
        const data = JSON.stringify({ TokenReference: json.TokenReference, Alias: json.Alias })

        resolve(window.btoa(data))
      } catch (error) {
        console.error(error)
        reject(error)
      }
    })
  }
}())
