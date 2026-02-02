# Technical Roadmap

## Functionality (Do More)
- [ ] **Implement RAG Chat Interface**
  - Create a `ChatInterface` component that accepts `articleContent` as context.
  - Implement Gemini API call with a system prompt to answer user questions strictly based on the article context.
  - Render conversation history in a scrollable UI.

- [ ] **Add Quiz Generation Mode**
  - Update Gemini prompt to request a JSON response matching: `{ summary: string, quiz: [{ question, options, answer_index }] }`.
  - Build a `QuizCard` component to parse the JSON and render interactive questions.
  - Add visual feedback (Green/Red) for answer validation.

- [ ] **Integrate Audio Summary (TTS)**
  - Create a custom `TextToSpeech` hook using the native `window.speechSynthesis` API.
  - Expose `speak`, `pause`, and `resume` methods.
  - Add a floating playback control button to the summary view.

## Visuals & UX (More Appealing)
- [ ] **Add Sentiment Analysis Visualization**
  - Install `recharts` library.
  - Update API to request a `sentiment_score` (0-100) and label in the response.
  - Create a `SentimentGauge` component to visualize the score using a radial bar chart.

- [ ] **Implement Skeleton Loaders**
  - Create a reusable `SkeletonLoader` component using Tailwind's `animate-pulse`.
  - Update `ArticleView` to display text and image skeletons while the summary is loading.

- [ ] **Add Framer Motion Transitions**
  - Install `framer-motion`.
  - Wrap `SummaryCard` in a `<motion.div>` component.
  - Apply entrance animations (fade-in, slide-up) for smoother content delivery.

## Performance (Run Faster)
- [ ] **Enable Streaming Responses**
  - Refactor API fetch logic to use `response.body.getReader()` instead of awaiting full JSON.
  - Implement a decoder loop to append text chunks to state in real-time to improve perceived latency.

- [ ] **Implement React Query Caching**
  - Install `@tanstack/react-query`.
  - Wrap summarization logic in a `useQuery` hook using `['summary', articleUrl]` as the key.
  - Set `staleTime` to `Infinity` to enable instant loading for previously visited articles.
