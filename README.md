# [Yoga With Adriene Bot](http://t.me/YogaWithAdrieneBot?start=github)

## Run locally
The bot sets up webhook on heroku but for local development uses long polling.  
Runs `heroku local` and watches the changes.

### Requirements

- [heroku-cli](https://devcenter.heroku.com/articles/heroku-cli#download-and-install)
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

Having above requirements, run this to start the bot locally

```
npm start
```


