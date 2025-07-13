# 📰 PulsePoint-v2

> *Turn lengthy articles into bite-sized insights with AI-powered summarization*

Welcome to PulsePoint-v2, whether you're a busy professional, student, or just someone who loves staying informed without the information overload, this tool has got your back!


## 🚀 Quick Start


### 1. Clone & Install

```bash
git clone https://github.com/yassnemo/PulsePoint.v2
cd PulsePoint-v2
npm install
```

### 2. Environment Setup

Create your `.env` file:

```bash

cp .env.example .env

```

Then edit `.env` and add your Gemini API key:

```bash

# Get this from https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_actual_api_key_here

# Optional customizations
GEMINI_MODEL=gemini-1.5-flash

MAX_CONTENT_LENGTH=30000

NODE_ENV=development

```

### 3. Fire It Up!

```bash

# Development mode (with hot reloading)
npm run dev

# Production build
npm run build

npm start

```

Visit `http://127.0.0.1:5000` and start summarizing! 🎉

## 🌐 Deployment

### Vercel (Recommended)

This app is built for Vercel and deploys effortlessly:

1. **Connect your repo** to Vercel

2. **Add environment variables** in the Vercel dashboard:

   - `GEMINI_API_KEY`: Your Google AI API key
   - `GEMINI_MODEL`: `gemini-1.5-flash` (or your preferred model)
   - `MAX_CONTENT_LENGTH`: `30000` (optional)

3. **Deploy**: Vercel handles the rest automagically! ✨


## 🎮 How to Use

### Basic Summarization

1. **Paste an article URL** into the input field
   
> **Need articles to try?** Here are some great sources for testing:
>
> - [BBC News](https://www.bbc.com/news)
> - [The Verge](https://www.theverge.com/)
> - [National Geographic](https://www.nationalgeographic.com/latest-stories)
> - [Reuters](https://www.reuters.com/)
> - [Ars Technica](https://arstechnica.com/)
> - [Smithsonian Magazine](https://www.smithsonianmag.com/)
> - [NPR](https://www.npr.org/sections/news/)
> - [Medium](https://medium.com/)
> - [Scientific American](https://www.scientificamerican.com/)
> - [The Guardian](https://www.theguardian.com/international)
>
> Just copy any article link from these sites and paste it above!

2. **Hit that "Summarize" button** (or press Enter like a pro)

3. **Watch the magic happen** - you'll get:

   - 📝 A concise summary (2-3 sentences)
   - 🎯 Key bullet points with the most important details
   - 📊 Compression stats (how much content we saved you!)
   - 🖼️ Article image (when available)


## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GEMINI_API_KEY` | Your Google AI API key | - | ✅ Yes |
| `GEMINI_MODEL` | AI model to use | `gemini-1.5-flash` | ❌ No |
| `MAX_CONTENT_LENGTH` | Max characters to process | `30000` | ❌ No |
| `NODE_ENV` | Environment mode | `development` | ❌ No |


### Customization

Want to tweak the AI behavior? Check out the prompt in `api/summarize.ts` - it's designed to be easily customizable for different use cases.


## 🤝 Contributing

I'd love your help making this even better! Here's how:

### Development Setup

```bash

git clone https://github.com/yassnemo/PulsePoint.v2
cd PulsePoint-v2
git checkout -b my-feature
# Make your changes
git add .
git commit -m "Describe your change"
git push origin my-feature
# Then open a pull request on GitHub (I'll review it as soon as possible)

```

### What I'm Looking For

- 🐛 **Bug fixes** (especially edge cases in web scraping)
- ✨ **New features** (language support, export options, etc.)
- 🎨 **UI improvements** (animations, accessibility, mobile experience)
- 📚 **Documentation** (code comments, examples, tutorials)
- 🚀 **Performance optimizations** (bundle size, loading speed)


## 🚨 Troubleshooting

### Common Issues

**❌ "Invalid URL format"**
- Make sure your URL includes `http://` or `https://`
- Check for typos or special characters

**❌ "Failed to scrape article"**
- Some sites block automated access (looking at you, paywalls!)
- Try a different article or check if the URL is accessible

**❌ "AI summarization failed"**
- Check your Gemini API key and quota
- The app will fall back to basic summarization automatically

**❌ Build errors**
- Clear `node_modules` and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Make sure you're using Node.js 18+

### Getting Help

- 🐛 **Found a bug?** Open an issue with steps to reproduce
- 💡 **Have an idea?** Start a discussion - we love feedback!
- 🤔 **Need help?** Check existing issues or create a new one

## 📊 Performance

- **Bundle size**: ~26KB CSS, ~277KB JS (optimized and tree-shaken)
- **First load**: Sub-second on modern connections
- **Summarization**: Typically 2-5 seconds depending on article length
- **Memory usage**: Minimal footprint with smart caching


## 📄 License

MIT License – feel free to use this for whatever you'd like! 

Just remember to give credit where it's due.


Created by [Yassine Erradouani](https://yerradouani.me)
