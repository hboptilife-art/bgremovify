export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const { image } = JSON.parse(event.body);

    if (!image) {
      return { statusCode: 400, body: JSON.stringify({ error: "Image data is required" }) };
    }

    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      return { statusCode: 500, body: JSON.stringify({ error: "REPLICATE_API_TOKEN is not configured in Netlify" }) };
    }

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        "Prefer": "wait"
      },
      body: JSON.stringify({
        version: "fb8af171cfa1616ddcf1242c0f3f9f461ada5b3672d911ef5b6538d65f847ac1",
        input: { image: image }
      })
    });

    const prediction = await response.json();

    if (!response.ok) {
      throw new Error(prediction.detail || "Replicate API hatası");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ output: prediction.output }),
    };
  } catch (error) {
    console.error("Replicate Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }, null, 2),
    };
  }
}