# YouTube Comment Scrape and Rebuild / Generator

This project allows you to generate images of YouTube comments based on various criteria such as search terms, like counts, reply counts, etc. You can also generate custom comments from a JSON file.

## Table of Contents

- [Setup](#setup)
- [Usage](#usage)
  - [Command-Line Arguments](#command-line-arguments)
  - [Config File](#config-file)
  - [Custom Comments](#custom-comments)
- [Examples](#examples)
- [Parameters](#parameters)
- [Example Config](#example-config)
- [Example Custom Comments JSON](#example-custom-comments-json)

## Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/your-repo-name.git
   cd your-repo-name
   ```
2. **Install dependancies**
   ```bash
   npm install
   ```
3. **Set up your YouTube API key:**
- Go to the [Google Developers Console.](https://console.cloud.google.com/)
- Create a new project.
- Enable the YouTube Data API v3 for your project.
- Create an API key.
- Create a .env file in the root of your project and add your API key:
    ```env
    YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY
    ```

## Usage

### Command-Line Arguments

You can run the script with various command-line arguments to customize its behavior.
```
node script.js [options]
```


#### Options:

- `--config, -c`: Path to JSON config file.
- `--videoIds, -v`: Comma-separated list of YouTube video IDs.
- `--searchTerms, -s`: Comma-separated list of search terms.
- `--maxLimit, -m`: Maximum number of comments to capture (default: 10).
- `--minLikes, -l`: Minimum like count required for a comment (default: 0).
- `--minReplies, -r`: Minimum reply count required for a comment (default: 0).
- `--filteredWords, -f`: Comma-separated list of words to filter out.
- `--maxChars, -x`: Maximum number of characters in a comment.
- `--theme, -t`: Theme for the output images ("dark" or "light").
- `--custom, -u`: Path to custom comments JSON file.

### Config File

You can use a config file to provide the parameters. If no command-line arguments are passed, the script will attempt to use the config file.

### Custom Comments

To generate images from custom comments, provide a JSON file with an array of comments.

## Examples

### Running with Config File

```
node script.js --config config.json
```

### Running with Command-Line Arguments
```
node script.js --videoIds 'VIDEO_ID_1,VIDEO_ID_2' --searchTerms 'term1,term2' --maxLimit 10 --minLikes 5 --minReplies 2 --filteredWords 'badword1,badword2' --maxChars 200 --theme 'light'
```

### Running with Custom Comments
```
node script.js --custom custom_comments.json --theme 'light'
```

## Example Config

Create a `config.json` file in the root of your project with the following content:

```
{
"videoIds": ["VIDEO_ID_1", "VIDEO_ID_2"],
"searchTerms": ["term1", "term2"],
"maxLimit": 10,
"minLikes": 5,
"minReplies": 2,
"filteredWords": ["badword1", "badword2"],
"maxChars": 200,
"theme": "dark"
}
```

## Example Custom Comments JSON

Create a `custom_comments.json` file in the root of your project with the following content:
```
[
    {
      "avatar": "https://i.imgur.com/umjyrKZ.png",
      "username": "GigaDemon",
      "datePosted": "2023-07-01T14:48:00.000Z",
      "likeCount": 5,
      "content": "I CANT STOP EATING FLESH."
    },
    {
      "avatar": "https://i.imgur.com/cYX8pg3.png",
      "username": "TechGoblin",
      "datePosted": "2023-06-15T14:48:00.000Z",
      "likeCount": 10,
      "content": "Have you tried eating it?"
    },
    {
      "avatar": "https://i.imgur.com/cygNEPo.png",
      "username": "ConcernedKirsten",
      "datePosted": "2023-05-21T14:48:00.000Z",
      "likeCount": 3,
      "content": "Oh no....."
    }
  ]
  ```

## License

Not sure yet lol