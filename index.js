let fs = require('fs')
let path = require('path')
let os = require('os')
let { promisify } = require('util')
let execa = require('execa')
let Twitter = new require('twit')(require('./twitter-config'))
let oneCached = require('one-cache')


// tweet current song playing to twitter
// needs: twitter auth, file system

/** @type {String -> Promise<String>} */
let readFile = filepath => promisify(fs.readFile)(filepath, 'utf8')

/** @type {String|Number -> String} */
function formatSeconds (number) {
  // ">> 0" casts float to number (i think)
  let minutes = (number / 60) >> 0
  let seconds = number % 60

  if (String(seconds).length === 1) {
    seconds = `0${seconds}`
  }

  return `${minutes}:${seconds}`
}

/** @type {String -> String} */
function song(cmusData) {
  let parts = cmusData.split(os.EOL)

  let duration = parts[2].split(' ')[1]
  let position = parts[3].split(' ')[1]

  let formatted = formatSeconds(position) + '/' + formatSeconds(duration)

  let artist = parts[4].split(' ').slice(2).join(' ')
  let album = parts[5].split(' ').slice(2).join(' ')
  let title = parts[6].split(' ').slice(2).join(' ')

  let string = `Currently playing ${title} by ${artist} [${formatted}].`
  return string
}

/** @type {String -> Promise<Object>} */
function tweet (content) {
  try {
    return Twitter.post('statuses/update', { status: content })
  } catch (error) {
    console.error('[tweet()] error: ', error.message)
  }
}

async function main() {
  try {
    let { stdout: cmusData } = await execa('cmus-remote', ['-Q'])
    let currentSongInfo = song(cmusData)
    let twitterJson = await oneCached('bar', () => {
      return tweet(currentSongInfo)
    })
    let tweetedTweetId = twitterJson.data.id_str

    console.log(`Successfully tweeted! ${currentSongInfo}`)
    process.exit(0)
  } catch (error) {
    console.error('[main()] error:', error)

    // if (error.stderr.toLowerCase().includes('cmus is not running')) {
    //   console.error('cmus is not running')
    //   // exit badly
    //   process.exit(1)
    // }
  }
}

main()
