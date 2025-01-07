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


  // App ID Passkit Generator DEV
  APP_ID_PASSKIT_GENERATOR_DEV:'passkitGenerator.dev.internal.mandaiapi.ciam',
  // App ID Passkit Generator UAT
  APP_ID_PASSKIT_GENERATOR_UAT:'passkitGenerator.uat.internal.mandaiapi.ciam',
  // App ID Passkit Generator Prod
  APP_ID_PASSKIT_GENERATOR_PROD:'passkitGenerator.dev.internal.mandaiapi.ciam',

  // user signup generate passkit for send in the email
  SIGNUP_CHECK_AEM:true,

  LOG_APP_PREFIX:'[CIAM-MAIN]'

};

module.exports = appConfig;
