const axios = require('axios')
const OAuth2AdminBraspag = require('../admin/get-auth')

const auth = async (clientId, clientSecret, merchantId, storeId, isSandbox) => new Promise((resolve, reject) => {
  const oAuth2AdminBraspag = new OAuth2AdminBraspag(
    clientId,
    clientSecret,
    storeId,
    isSandbox
  )

  const request = async (isRetry) => {
    oAuth2AdminBraspag.preparing
      .then(() => {
        const { accessToken } = oAuth2AdminBraspag
        const urlAuthSOP = `https://transaction${isSandbox ? 'sandbox' : ''}.pagador.com.br/post/api/public/v2/accesstoken`
        const headers = {
          MerchantId: merchantId,
          Authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json'
        }
        return axios.post(urlAuthSOP, {}, { headers })
      })
      .then(({ data }) => {
        let expire = new Date()
        if (data.ExpiresIn) {
          expire = new Date(`${data.ExpiresIn.replace('T', ' ')} UTC-3`)
        }
        resolve({
          accessToken: data.AccessToken,
          expiresIn: expire.getTime()
        })
      })
      .catch(err => {
        if (!isRetry && err.response && err.response.status >= 429) {
          setTimeout(() => request(true), 7000)
        }
        reject(err)
      })
  }
  request()
})

module.exports = function (clientId, clientSecret, merchantId, storeId, isSandbox = false, firestoreColl = 'braspag_token_sop') {
  const self = this

  let documentRef
  // const hashLogin = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  if (firestoreColl) {
    documentRef = require('firebase-admin')
      .firestore()
      .doc(`${firestoreColl}/${storeId}`)
  }

  this.preparing = new Promise((resolve, reject) => {
    const authenticate = (accessToken) => {
      self.accessToken = accessToken
      resolve(self)
    }

    const handleAuth = (isSandbox) => {
      console.log(`> Braspag SOP #${storeId} ${isSandbox ? 'SandBox' : ''}`)
      auth(clientId, clientSecret, merchantId, storeId, isSandbox)
        .then((data) => {
          console.log('> Braspag SOP Token Update')
          authenticate(data.accessToken)
          const expiresInToString = new Date(data.expiresIn).toISOString()
          if (documentRef) {
            documentRef.set({
              accessToken: data.accessToken,
              expiresIn: Date.now() + (2 * 60 * 1000),
              // ...data,
              expiresInToString,
              updated_at: new Date().toISOString(),
              isSandbox
            })
              .catch(console.error)
          }
        })
        .catch(reject)
    }

    if (documentRef) {
      documentRef.get()
        .then((documentSnapshot) => {
          if (documentSnapshot.exists &&
            Date.now() < documentSnapshot.get('expiresIn')
          ) {
            authenticate(documentSnapshot.get('accessToken'), isSandbox)
          } else {
            handleAuth(isSandbox)
          }
        })
        .catch(console.error)
    } else {
      handleAuth(isSandbox)
    }
  })
}
