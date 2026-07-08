/**
 * Cloudflare Worker für OpenRouter AI Proxy
 * Schützt den API-Key und leitet Anfragen weiter
 */
export default {
  async fetch(request, env) {
    // CORS headers
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      // Umgebungsvariable lesen (muss in wrangler.toml oder Cloudflare Dashboard konfiguriert sein)
      const apiKey = env.OPENROUTER_API_KEY;

      if (!apiKey) {
        console.error('OPENROUTER_API_KEY ist nicht konfiguriert');
        return new Response(
          JSON.stringify({ error: 'API Key nicht konfiguriert' }),
          { 
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }

      // Request-Body auslesen
      const body = await request.json();

      // Anfrage an OpenRouter weiterleiten
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://leanderott.github.io',
          'X-Title': 'Duco-Vision',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      // Erfolgreiche Antwort
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      console.error('Worker Error:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Internal Server Error' }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }
  },
};
