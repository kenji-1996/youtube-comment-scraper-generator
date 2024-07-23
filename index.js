require('dotenv').config();
const { google } = require('googleapis');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { formatDistanceToNow, parseISO, isValid, format } = require('date-fns');
const yargs = require('yargs');

// Load API key from environment variables
const apiKey = process.env.YOUTUBE_API_KEY;

// Create a YouTube client
const youtube = google.youtube({
  version: 'v3',
  auth: apiKey
});

const argv = yargs
  .option('config', {
    alias: 'c',
    description: 'Path to JSON config file',
    type: 'string',
  })
  .option('videoIds', {
    alias: 'v',
    description: 'Comma-separated list of YouTube video IDs',
    type: 'string',
  })
  .option('searchTerms', {
    alias: 's',
    description: 'Comma-separated list of search terms',
    type: 'string',
  })
  .option('maxLimit', {
    alias: 'm',
    description: 'Maximum number of comments to capture',
    type: 'number',
  })
  .option('minLikes', {
    alias: 'l',
    description: 'Minimum like count required for a comment',
    type: 'number',
  })
  .option('minReplies', {
    alias: 'r',
    description: 'Minimum reply count required for a comment',
    type: 'number',
  })
  .option('filteredWords', {
    alias: 'f',
    description: 'Comma-separated list of words to filter out',
    type: 'string',
  })
  .option('maxChars', {
    alias: 'x',
    description: 'Maximum number of characters in a comment',
    type: 'number',
  })
  .option('theme', {
    alias: 't',
    description: 'Theme for the output images ("dark" or "light")',
    type: 'string',
    choices: ['dark', 'light'],
  })
  .option('custom', {
    alias: 'u',
    description: 'Path to custom comments JSON file',
    type: 'string',
  })
  .help()
  .alias('help', 'h')
  .argv;

function validateParams(params) {
  if (params.videoIds && (!Array.isArray(params.videoIds) || !params.videoIds.every(id => typeof id === 'string'))) {
    throw new Error('Invalid videoIds. It should be an array of strings.');
  }
  if (params.searchTerms && (!Array.isArray(params.searchTerms) || !params.searchTerms.every(term => typeof term === 'string'))) {
    throw new Error('Invalid searchTerms. It should be an array of strings.');
  }
  if (params.maxLimit && (typeof params.maxLimit !== 'number' || params.maxLimit < 1)) {
    throw new Error('Invalid maxLimit. It should be a positive integer.');
  }
  if (params.minLikes && (typeof params.minLikes !== 'number' || params.minLikes < 0)) {
    throw new Error('Invalid minLikes. It should be a non-negative integer.');
  }
  if (params.minReplies && (typeof params.minReplies !== 'number' || params.minReplies < 0)) {
    throw new Error('Invalid minReplies. It should be a non-negative integer.');
  }
  if (params.filteredWords && (!Array.isArray(params.filteredWords) || !params.filteredWords.every(word => typeof word === 'string'))) {
    throw new Error('Invalid filteredWords. It should be an array of strings.');
  }
  if (params.maxChars && (typeof params.maxChars !== 'number' || params.maxChars < 1)) {
    throw new Error('Invalid maxChars. It should be a positive integer.');
  }
  if (params.theme && (params.theme !== 'dark' && params.theme !== 'light')) {
    throw new Error('Invalid theme. It should be either "dark" or "light".');
  }
}

async function getComments(params) {
  validateParams(params);

  const {
    videoIds,
    searchTerms,
    maxLimit = 10,
    minLikes = 0,
    minReplies = 0,
    filteredWords = [],
    maxChars = Infinity,
    theme = 'dark'
  } = params;

  const videoIdArray = Array.isArray(videoIds) ? videoIds : [videoIds];
  const searchTermArray = Array.isArray(searchTerms) ? searchTerms : [searchTerms];

  let totalCommentsFetched = 0;

  try {
    for (const videoId of videoIdArray) {
      console.log(`Fetching comments for video ID: ${videoId}`);
      let nextPageToken = '';
      do {
        const response = await youtube.commentThreads.list({
          part: 'snippet,replies',
          videoId: videoId,
          textFormat: 'plainText',
          pageToken: nextPageToken
        });

        for (const item of response.data.items) {
          if (totalCommentsFetched >= maxLimit) {
            break;
          }

          const commentSnippet = item.snippet.topLevelComment.snippet;
          const commentText = commentSnippet.textDisplay.toLowerCase();
          const likeCount = commentSnippet.likeCount;
          const replyCount = item.replies ? item.replies.comments.length : 0;
          const username = commentSnippet.authorDisplayName;
          const reason = [];

          let matched = false;
          searchTermArray.forEach(term => {
            if (commentText.includes(term.toLowerCase())) {
              matched = true;
            }
          });

          if (matched) {
            if (likeCount < minLikes) {
              reason.push(`didn't have enough likes (needed ${minLikes}, had ${likeCount})`);
            }
            if (replyCount < minReplies) {
              reason.push(`didn't have enough replies (needed ${minReplies}, had ${replyCount})`);
            }
            if (filteredWords.some(word => commentText.includes(word.toLowerCase()))) {
              reason.push(`contained a filtered word`);
            }
            if (commentText.length > maxChars) {
              reason.push(`exceeded max characters (allowed ${maxChars}, had ${commentText.length})`);
            }

            if (reason.length > 0) {
              console.log(`Comment by ${username} rejected: ${reason.join(', ')}`);
            } else {
              const commentData = {
                avatar: commentSnippet.authorProfileImageUrl,
                username: username,
                datePosted: commentSnippet.publishedAt,
                likeCount: likeCount,
                content: commentSnippet.textDisplay
              };

              await generateCommentImage(commentData, theme);
              console.log(`Saved image for comment by ${username}: ${commentSnippet.textDisplay}`);
              totalCommentsFetched++;
            }
          }
        }

        nextPageToken = response.data.nextPageToken;
      } while (nextPageToken && totalCommentsFetched < maxLimit);

      if (totalCommentsFetched >= maxLimit) {
        break;
      }
    }
  } catch (err) {
    console.error('Error: ', err);
  }
}

function generateCommentHTML(commentData, theme) {
  let parsedDate;
  try {
    console.log(commentData.datePosted);
    parsedDate = isValid(parseISO(commentData.datePosted)) ? parseISO(commentData.datePosted) : new Date(commentData.datePosted);
  } catch (error) {
    console.log("Error parsing date: ", error);
    parsedDate = parseISO(new Date(commentData.datePosted));
  }
  const relativeDate = formatDistanceToNow(parsedDate, { addSuffix: true });
  const isDarkTheme = theme === 'dark';

  return `
    <div class="comment-container">
      <div class="author-thumbnail">
        <img src="${commentData.avatar}" alt="${commentData.username}">
      </div>
      <div class="comment-main">
        <div class="comment-header">
          <span class="author-name">${commentData.username}</span>
          <span class="comment-date">${relativeDate}</span>
        </div>
        <div class="comment-content">
          ${commentData.content}
        </div>
        <div class="comment-actions">
          <div class="like-button">
            <img src="${isDarkTheme ? 'https://i.imgur.com/ITOVhGt.png' : 'https://i.imgur.com/40GC02j.png'}" alt="Like">
            <span>${commentData.likeCount}</span>
          </div>
          <div class="dislike-button">
            <img src="${isDarkTheme ? 'https://i.imgur.com/1c1PwkS.png' : 'https://i.imgur.com/mc7Yg5z.png'}" alt="Dislike">
          </div>
        </div>
      </div>
    </div>
  `;
}

async function generateCommentImage(commentData, theme) {
  const commentHTML = generateCommentHTML(commentData, theme);
  const isDarkTheme = theme === 'dark';

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(`
    <html>
    <head>
      <style>
        body { background-color: ${isDarkTheme ? '#181818' : '#fff'}; color: ${isDarkTheme ? '#fff' : '#000'}; font-family: Roboto, Arial, sans-serif; }
        .comment-container { display: flex; align-items: flex-start; padding: 10px; border-bottom: 1px solid ${isDarkTheme ? '#333' : '#ccc'}; width: 500px; }
        .author-thumbnail { margin-right: 10px; }
        .author-thumbnail img { border-radius: 50%; width: 40px; height: 40px; }
        .comment-main { flex-grow: 1; }
        .comment-header { display: flex; align-items: center; margin-bottom: 5px; }
        .author-name { font-weight: bold; color: ${isDarkTheme ? '#aaa' : '#000'}; margin-right: 10px; }
        .comment-date { color: ${isDarkTheme ? '#aaa' : '#888'}; font-size: 12px; }
        .comment-content { margin-bottom: 10px; }
        .comment-actions { display: flex; align-items: center; }
        .like-button, .dislike-button { display: flex; align-items: center; margin-right: 20px; }
        .like-button img, .dislike-button img { width: 18px; height: 18px; margin-right: 5px; }
        .reply-button { color: ${isDarkTheme ? '#aaa' : '#888'}; cursor: pointer; }
      </style>
    </head>
    <body>
      ${commentHTML}
    </body>
    </html>
  `);

  const commentContainer = await page.$('.comment-container');
  const boundingBox = await commentContainer.boundingBox();

  if (!fs.existsSync('comment-images')) {
    fs.mkdirSync('comment-images');
  }

  const filePath = path.join('comment-images', `${commentData.username.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`);
  await page.screenshot({ path: filePath, clip: boundingBox });

  await browser.close();
}

function loadConfig(configPath) {
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    fs.writeFileSync(configPath, JSON.stringify({
      videoIds: [],
      searchTerms: [],
      maxLimit: 10,
      minLikes: 0,
      minReplies: 0,
      filteredWords: [],
      maxChars: 200,
      theme: 'dark'
    }, null, 2));
    console.warn('No config file found. A new config file has been generated. Please fill out the config file or provide command-line arguments.');
    process.exit(1);
  }
}

function loadCustomComments(customPath) {
  if (fs.existsSync(customPath)) {
    return JSON.parse(fs.readFileSync(customPath, 'utf8'));
  } else {
    console.error(`Custom comments file not found at ${customPath}`);
    process.exit(1);
  }
}

async function generateCustomComments(params) {
  const { comments, theme } = params;
  for (const comment of comments) {
    await generateCommentImage(comment, theme);
    console.log(`Saved image for custom comment by ${comment.username}`);
  }
}

function main() {
  if (argv.custom) {
    const customComments = loadCustomComments(argv.custom);
    const theme = argv.theme || 'dark';
    generateCustomComments({ comments: customComments, theme });
  } else {
    let params = {};
    if (argv.config) {
      params = loadConfig(argv.config);
    } else {
      params = {
        videoIds: argv.videoIds ? argv.videoIds.split(',') : [],
        searchTerms: argv.searchTerms ? argv.searchTerms.split(',') : [],
        maxLimit: argv.maxLimit || 10,
        minLikes: argv.minLikes || 0,
        minReplies: argv.minReplies || 0,
        filteredWords: argv.filteredWords ? argv.filteredWords.split(',') : [],
        maxChars: argv.maxChars || Infinity,
        theme: argv.theme || 'dark'
      };
    }

    if (!params.videoIds.length || !params.searchTerms.length) {
      console.warn('Both videoIds and searchTerms are required. Please provide them in the config file or as command-line arguments.');
      process.exit(1);
    }

    getComments(params);
  }
}

main();
