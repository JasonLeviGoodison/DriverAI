# Driver AI

Driver AI is a tool for automating and controlling a computer using AI. Install it and automate anything in < 1 minute. No scripting/coding required.

<img width="1512" alt="Screenshot 2025-06-26 at 1 38 09 PM" src="https://github.com/user-attachments/assets/0f49e9c5-5778-4b5d-be43-1a28aa3328e1" />

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
