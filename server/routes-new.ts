import type { Express } from "express";
import { createServer, type Server } from "http";

// Import the Vercel API functions for local development
async function loadApiHandler(modulePath: string) {
  try {
    const module = await import(modulePath);
    return module.default;
  } catch (error) {
    console.error(`Failed to load API handler from ${modulePath}:`, error);
    return null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Load the API functions
  const summarizeHandler = await loadApiHandler('../api/summarize.ts');
  const translateHandler = await loadApiHandler('../api/translate.ts');

  // Wrapper to convert Vercel API format to Express
  const createExpressHandler = (vercelHandler: any) => {
    return async (req: any, res: any) => {
      if (!vercelHandler) {
        res.status(500).json({ message: 'API handler not available' });
        return;
      }

      try {
        // Create Vercel-like request/response objects
        const vercelReq = {
          method: req.method,
          body: req.body,
          query: req.query,
          headers: req.headers,
          url: req.url
        };

        const vercelRes = {
          status: (code: number) => {
            res.status(code);
            return vercelRes;
          },
          json: (data: any) => {
            res.json(data);
            return vercelRes;
          },
          end: () => {
            res.end();
            return vercelRes;
          },
          setHeader: (name: string, value: string) => {
            res.setHeader(name, value);
            return vercelRes;
          }
        };

        await vercelHandler(vercelReq, vercelRes);
      } catch (error) {
        console.error('API handler error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    };
  };

  // Register the API routes using the same handlers as Vercel
  if (summarizeHandler) {
    app.post("/api/summarize", createExpressHandler(summarizeHandler));
    app.options("/api/summarize", createExpressHandler(summarizeHandler));
  }

  if (translateHandler) {
    app.post("/api/translate", createExpressHandler(translateHandler));
    app.options("/api/translate", createExpressHandler(translateHandler));
  }

  // Fallback routes if handlers couldn't be loaded
  if (!summarizeHandler) {
    app.post("/api/summarize", (req, res) => {
      res.status(500).json({ 
        message: 'Summarize API not available in development mode. Please check the /api/summarize.ts file.' 
      });
    });
  }

  if (!translateHandler) {
    app.post("/api/translate", (req, res) => {
      res.status(500).json({ 
        message: 'Translation API not available in development mode. Please check the /api/translate.ts file.' 
      });
    });
  }

  return createServer(app);
}
