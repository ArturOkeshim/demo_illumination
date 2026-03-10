// Vercel serverless function for /api/theme

const THEME_SYSTEM_PROMPT = `
You are a lighting and experience designer for a theme park.

Your task:
Given a short natural-language description of the desired park theme
(e.g. "make the park feel like calm ocean at night", "fiery volcano festival",
"winter forest with aurora", "retro neon city", "minimalistic zen garden"),
you MUST respond with a single JSON object that
defines a beautiful, modern, cohesive visual theme for a web page
representing the park.

The JSON MUST strictly follow this TypeScript type:

type Theme = {
  name: string;
  colors: {
    background: string;
    primary: string;
    accent: string;
    textOnBackground: string;
    cardBackground: string;
  };
  background: {
    type: "gradient" | "solid";
    css: string;
  };
  image: {
    url: string;
    position?: string;
    size?: string;
  };
  typography: {
    fontFamily: "system" | "serif" | "tech" | "playful";
    roundness: "square" | "medium" | "rounded";
  };
  effects: {
    hover: {
      type: "glow" | "pulse" | "none";
      intensity: "soft" | "medium" | "strong";
    };
    animation: {
      type: "wave" | "flicker" | "breathing" | "none";
      target: "hero" | "cards" | "page";
      speed: "slow" | "normal" | "fast";
    };
  };
};

Rules:
- All color fields must be valid CSS color strings (prefer hex, e.g. "#00bcd4", or rgba()).
- Pick harmonious, high-contrast colors that are readable on screen.
- Use modern cinematic gradients for background.css (e.g. "radial-gradient(circle at top, #00bcd4 0%, #001a33 60%, #000814 100%)").
- image.url must be a direct HTTPS URL to a royalty-free stock image (e.g. from https://images.pexels.com/ or https://images.unsplash.com/)
  that matches the requested theme.
- typography.fontFamily should match the emotional tone (e.g. "tech" for sci‑fi / cyberpunk, "serif" for historical / classical,
  "playful" for children / fairytale, "system" for neutral / minimal).
- typography.roundness should reflect how soft or sharp the shapes feel.
- effects.hover should be used for local interaction, like brighter glow or gentle pulse on hover.
- effects.animation should create global atmosphere:
  - "wave" for sea / water / wind / calm movement,
  - "flicker" for fire / lava / electricity / unstable light,
  - "breathing" for calm, meditative or magical moods.
- Do NOT include any text outside the JSON. No explanations, no prose.
`;

const THEME_JSON_SCHEMA = {
  name: 'theme',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      colors: {
        type: 'object',
        properties: {
          background: { type: 'string' },
          primary: { type: 'string' },
          accent: { type: 'string' },
          textOnBackground: { type: 'string' },
          cardBackground: { type: 'string' }
        },
        required: [
          'background',
          'primary',
          'accent',
          'textOnBackground',
          'cardBackground'
        ],
        additionalProperties: false
      },
      background: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['gradient', 'solid'] },
          css: { type: 'string' }
        },
        required: ['type', 'css'],
        additionalProperties: false
      },
      image: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          position: { type: 'string' },
          size: { type: 'string' }
        },
        required: ['url'],
        additionalProperties: false
      },
      typography: {
        type: 'object',
        properties: {
          fontFamily: {
            type: 'string',
            enum: ['system', 'serif', 'tech', 'playful']
          },
          roundness: {
            type: 'string',
            enum: ['square', 'medium', 'rounded']
          }
        },
        required: ['fontFamily', 'roundness'],
        additionalProperties: false
      },
      effects: {
        type: 'object',
        properties: {
          hover: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['glow', 'pulse', 'none']
              },
              intensity: {
                type: 'string',
                enum: ['soft', 'medium', 'strong']
              }
            },
            required: ['type', 'intensity'],
            additionalProperties: false
          },
          animation: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['wave', 'flicker', 'breathing', 'none']
              },
              target: {
                type: 'string',
                enum: ['hero', 'cards', 'page']
              },
              speed: {
                type: 'string',
                enum: ['slow', 'normal', 'fast']
              }
            },
            required: ['type', 'target', 'speed'],
            additionalProperties: false
          }
        },
        required: ['hover', 'animation'],
        additionalProperties: false
      }
    },
    required: ['name', 'colors', 'background', 'image', 'typography', 'effects'],
    additionalProperties: false
  },
  strict: true
};

async function generateThemeFromLLM(prompt) {
  const apiKey = process.env.VSEGPT_API_KEY;

  if (!apiKey) {
    throw new Error(
      'VSEGPT_API_KEY is not set. Configure it in Vercel project settings as an environment variable.'
    );
  }

  const body = {
    model: 'x-ai/grok-4.1-fast',
    messages: [
      { role: 'system', content: THEME_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Director theme description: "${prompt}"`
      }
    ],
    temperature: 0.3,
    max_tokens: 800,
    response_format: {
      type: 'json_schema',
      json_schema: THEME_JSON_SCHEMA
    }
  };

  const response = await fetch('https://api.vsegpt.ru/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'Park Theme Designer Demo'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`VseGPT API error: ${response.status} ${text}`);
  }

  const data = await response.json();

  if (
    !data ||
    !data.choices ||
    !data.choices[0] ||
    !data.choices[0].message ||
    !data.choices[0].message.content
  ) {
    throw new Error('Unexpected VseGPT response format');
  }

  const content = data.choices[0].message.content;

  let theme;
  try {
    theme = JSON.parse(content);
  } catch (err) {
    throw new Error('LLM did not return valid JSON: ' + err.message);
  }

  return theme;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing "prompt" string in body.' });
    }

    const theme = await generateThemeFromLLM(prompt);
    return res.status(200).json(theme);
  } catch (err) {
    console.error('Error generating theme (Vercel api/theme):', err);
    return res.status(500).json({ error: 'Failed to generate theme' });
  }
};

