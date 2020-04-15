# Yoga With Adriene Bot

## Run locally

The bot sets up webhook, so the machine should be exposed to internet.  
I use localhost.run service for that. The public hostname should be stored in `.env` file.

Starts the tunnel 

```
npm run tunnel
```

Runs `heroku local` and watches the changes.

```
npm start
```
