declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BOT_TOKEN: string
      NODE_ENV: 'development' | 'production'
      LOG_CHAT_ID: string
      ADMIN_ID: string
      GOOGLE_APP_PROJECT_ID: string
      GOOGLE_APP_PRIVATE_KEY: string
      GOOGLE_APP_CLIENT_EMAIL: string
      AMPLITUDE_API_KEY: string
      YOUTUBE_API_KEY: string
      HOST: string
      WEBHOOK_SECRET: string
      DATABASE_URL: string
    }
  }
}

export {}
