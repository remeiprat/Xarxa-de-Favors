// ============================================================
// Netlify Function: airtable-proxy.js
// Proxy segur entre el navegador i l'API d'Airtable.
// El token mai no arriba al client — queda al servidor.
// ============================================================

exports.handler = async (event) => {
  const TOKEN    = process.env.AIRTABLE_TOKEN;
  const BASE_ID  = process.env.AIRTABLE_BASE_ID || "appC9AFAxKuIJgdFH";
  const TABLE    = "Favors";

  if (!TOKEN) {
    return {
      statusCode: 500,
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
    const fetchOptions = {
      method,
      headers,
    };
    if (method === "POST" || method === "PATCH") {
      fetchOptions.body = event.body;
    }

    const response = await fetch(airtableUrl, fetchOptions);
    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        "Content-Type": "application/json",
        // Permet crides des del mateix domini
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
