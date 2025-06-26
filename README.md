# Driver AI

Driver AI is a tool for automating and controlling a macOS computer using AI.

## Getting Started

1. **Clone the repository:**

```
git clone <repo-url>
cd <repo-directory>
```

2. **Set up your environment variables:**

   - Copy `example.env.json` to `env.json`:

```
cp example.env.json env.json
```

- Open `env.json` in your editor and add your API keys for your chosen AI provider(s).

3. **Install dependencies:**

```
npm install
```

4. **Start the application:**

```
npm start
```

The app will use the API keys you provided in `env.json` to connect to your AI provider (for example, [Anthropic Console](https://console.anthropic.com/) or [OpenAI Platform](https://platform.openai.com/account/api-keys)), depending on which backend you plan to use.

That's it! Driver AI should now be running.

## Requirements

- Node.js (v18 or higher recommended)
- macOS

## Notes

- For best results, make sure you have the necessary accessibility permissions enabled on your Mac.
- See the code and comments for more details on usage and capabilities.
