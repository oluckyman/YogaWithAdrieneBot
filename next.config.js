/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
}

module.exports = (phase) => {
  // For local development on localhost
  if (phase === 'phase-development-server') {
    // Call the webhook to initiate the bot and lunch polling
    const hookUrl = 'http://localhost:3000/api/webhook?dev=true'
    console.info(`Fetching ${hookUrl}`)
    fetch(hookUrl).then((res) => console.info('Got webhook status:', res.status))
  }
  // TODO: consider initiating the webhook in production from here
  return nextConfig
}
