// ============================================================
// Netlify Function: airtable-proxy.js
// Proxy segur entre el navegador i l'API d'Airtable.
// El token mai no arriba al client — queda al servidor.
// Usa el mòdul https natiu de Node.js (sense dependències).
// ============================================================

const https = require("https");

function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = https.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  // Gestionar preflight CORS (OPTIONS)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  const TOKEN   = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID || "appC9AFAxKuIJgdFH";
  const TABLE   = "Favors";

  if (!TOKEN) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "AIRTABLE_TOKEN no configurat a les variables d'entorn de Netlify." }),
    };
  }

  const method   = event.httpMethod;
  const params   = event.queryStringParameters || {};
  const recordId = params.recordId || null;

  // Construir la URL d'Airtable
  let airtableUrl = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}`;
  if (recordId) {
    airtableUrl += `/${recordId}`;
  }
  if (method === "GET") {
    airtableUrl += `?sort[0][field]=CreatedTime&sort[0][direction]=desc`;
  }

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  };

  try {
    const body = (method === "POST" || method === "PATCH") ? event.body : null;
    if (body) {
      headers["Content-Length"] = Buffer.byteLength(body);
    }

    const result = await httpsRequest(airtableUrl, { method, headers }, body);

    return {
      statusCode: result.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(result.body),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
