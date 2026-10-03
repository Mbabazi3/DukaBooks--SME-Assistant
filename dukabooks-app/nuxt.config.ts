export default defineNuxtConfig({
  compatibilityDate: '2026-09-03',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'DukaBooks — SME Invoice Assistant',
      htmlAttrs: { lang: 'en' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }]
    }
  },
  // Server-only config (never sent to the browser). Override each value with
  // the matching env var, e.g. gptPlatform.apiKey ← NUXT_GPT_PLATFORM_API_KEY.
  runtimeConfig: {
    gptPlatform: {
      baseUrl: 'https://api.gpt-core.com',
      apiKey: '',
      workspaceId: '',
      agentId: '',
      invoiceResultId: ''
    }
  }
})
