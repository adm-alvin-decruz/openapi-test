/**
 * AEM: aem
 * GlobalTix: glt
 * Passkit Internal: passkit
 */
const appConfig = {
  // App ID DEV
  APP_ID_DEV:'["aemDev.com.mandaiapi.ciam","gltDev.com.mandaiapi.ciam","tktDev.com.mandaiapi.ciam","passkit.Dev.internal.mandaiapi.ciam"]',
  // App ID UAT
  APP_ID_UAT:'["aemUat.com.mandaiapi.ciam","gltUat.com.mandaiapi.ciam","tktUat.com.mandaiapi.ciam","passkit.Uat.internal.mandaiapi.ciam"]',
  // App ID Prod
  APP_ID_PROD:'["aemProd.com.mandaiapi.ciam","gltProd.com.mandaiapi.ciam","tktProd.com.mandaiapi.ciam","passkit.Prod.internal.mandaiapi.ciam"]',

  // App ID Support DEV
  APP_ID_SUPPORT_DEV:'["support.Dev.internal.mandaiapi.ciam"]',
  // App ID Support UAT
  APP_ID_SUPPORT_UAT:'["support.Uat.internal.mandaiapi.ciam"]',
  // App ID Support Prod
  APP_ID_SUPPORT_PROD:'["support.Prod.internal.mandaiapi.ciam"]',


  // Passkit app ID:
  PASSKIT_APP_ID_DEV:"passkitGenerator.dev.internal.mandaiapi.ciam",
  PASSKIT_APP_ID_UAT:"passkitGenerator.uat.internal.mandaiapi.ciam",
  PASSKIT_APP_ID_PROD:"passkitGenerator.prod.internal.mandaiapi.ciam",

  // Passkit URL
  PASSKIT_URL_DEV:'https://qkvj4jup4v7hb3rl43lxoe5wjq0hzuyi.lambda-url.ap-southeast-1.on.aws',
  PASSKIT_URL_UAT:'https://qkvj4jup4v7hb3rl43lxoe5wjq0hzuyi.lambda-url.ap-southeast-1.on.aws',
  PASSKIT_URL_PROD:'https://qkvj4jup4v7hb3rl43lxoe5wjq0hzuyi.lambda-url.ap-southeast-1.on.aws',
  PASSKIT_GET_SIGNED_URL_PATH:'/v1/passkit/all/get',

  // user signup generate passkit for send in the email
  SIGNUP_CHECK_AEM:false,

  LOG_APP_PREFIX:'[CIAM-MAIN]'

};

module.exports = appConfig;
