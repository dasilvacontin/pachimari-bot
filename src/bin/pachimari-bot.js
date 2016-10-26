#!/usr/bin/env node
// @flow
const Twit = require('promised-twit')
const rp = require('request-promise')
const cheerio = require('cheerio')
const pick = require('object.pick')

const config = pick(process.env, ['consumer_key', 'consumer_secret', 'access_token', 'access_token_secret'])
const twit = new Twit(config)

// pachimari item in blizzard gear store
const targetURL = 'http://gear.blizzard.com/overwatch-collectibles/overwatch-pachimari-plush'

async function isProductAvailable () {
  const body = await rp(targetURL)
  const $ = cheerio.load(body)
  const availabilityText = $('.product-type-data').text().trim().replace(/\s+/g, ' ')
  console.log('blizzgearstore:', availabilityText)

  let available = false
  if (availabilityText !== '') {
    available = availabilityText.indexOf('More stock coming soon!') === -1
  } else console.log('captcha\'ed, lol')
  return available
}

type TwitterUser = {
  id: number,
  name: string,
  screen_name: string
}

type Tweet = {
  created_at: string,
  id: number,
  text: string,
  in_reply_to_user_id: Number,
  in_reply_to_screen_name: string,
  user: TwitterUser
}

const botname = 'PachimariBot'
const replies = ['Squeak!', 'Squeak?', 'Squeak!~~', 'Squeak squeak!']
const SEC = 1000
const MIN = 60 * SEC

function logTweet (tweet: Tweet) {
  console.log(`${tweet.user.screen_name}: ${tweet.text}`)
}

function replyTweet (tweet: Tweet) {
  const randomIndex = Math.floor(Math.random() * replies.length)
  const randomReply = replies[randomIndex]
  twit.post('statuses/update', {
    status: `@${tweet.user.screen_name} ${randomReply}`,
    in_reply_to_status_id: tweet.id
  })
}

const mentionsStream = twit.stream('statuses/filter', {
  track: `${botname},pachimari`
})
mentionsStream.on('tweet', (tweet: Tweet) => {
  logTweet(tweet)

  if (tweet.user.screen_name !== botname) {
    // delay so that Pachimari doesn't reply to you in 0.5ms
    setTimeout(() => replyTweet(tweet), (1 + Math.random() * 2) * SEC)
  }
})
console.log('Listening for mentions!')

function delay (ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }

async function tweetWhenAvailable () {
  while ((await isProductAvailable()) === false) {
    const timestamp = (new Date()).toString()
    console.log(`blizzgearstore: ${timestamp} ~ not yet available :'(`)
    const wait = 10 * MIN
    console.log(`will wait ${wait / 1000 / 60}min till next req`)
    await delay(wait)
  }

  await twit.post('statuses/update', { status: `Squeak!!~~~ ${targetURL}` })
}

tweetWhenAvailable()
.catch(console.error.bind(console))
