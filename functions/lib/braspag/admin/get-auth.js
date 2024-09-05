const { logger } = require('../../../context')
const auth = require('./create-auth')

module.exports = function (clientId, clientSecret, storeId, isSandbox = false, firestoreColl = 'braspag_admin') {
  const self = this

  let documentRef
  const hashLogin = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  if (firestoreColl) {
    documentRef = require('firebase-admin')
      .firestore()
      .doc(`${firestoreColl}/${storeId}-${hashLogin}`)
  }

  this.preparing = new Promise((resolve, reject) => {
    const authenticate = (accessToken) => {
      self.accessToken = accessToken
      resolve(self)
    }

    const handleAuth = (isSandbox) => {
      logger.info(`> Admin Braspag Auth #${storeId} ${isSandbox ? 'SandBox' : ''}`)
      auth(hashLogin, isSandbox)
        .then((data) => {
          logger.info(`> Admin Braspag ${JSON.stringify(data)}`)
          authenticate(data.access_token)
          const expiresIn = Date.now() + (data.expires_in * 1000)
          if (documentRef) {
            documentRef.set({
              accessToken: data.access_token,
              expiresIn,
              expiresInToString: new Date(expiresIn).toISOString(),
              updated_at: new Date().toISOString(),
              isSandbox
            }).catch(logger.error)
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
        .catch(logger.error)
    } else {
      handleAuth(isSandbox)
    }
  })
}
