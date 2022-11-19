# [Yoga With Adriene Bot](http://t.me/YogaWithAdrieneBot?start=github)

## Run locally

```
npm start
```

It start watching source code and starts next dev server.
On each change it restarts the whole server.
When the server starts, it uses hack from `next.config.js`: on the build stage it runs webhook to start itself in long polling mode. This way we do not need tunnels like `ngrok`.

### Requirements

- `.env` file with secrets:
  ```
  BOT_TOKEN=<test bot token>
  NODE_ENV=development
  LOG_CHAT_ID=<chat to send logs>
  ADMIN_ID=<my user id>
  YOUTUBE_API_KEY=<...>
  GOOGLE_APP_PROJECT_ID=<...>
  GOOGLE_APP_PRIVATE_KEY=<...>
  GOOGLE_APP_CLIENT_EMAIL=<...>
  ```

### Changelog

2022-11-19

- Migrated from heroku to vercel


2022-03-13

- Remove dashbot as it causes build errors with grpc dependency