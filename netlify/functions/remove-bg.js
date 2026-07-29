export async function handler(event, context) {
  try {
    const apiToken = process.env.REPLICATE_API_TOKEN;
    
    let image;
    try {
      const body = JSON.parse(event.body || "{}");
      image = body.image;
    } catch (e) {
      image = null;
    }

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        "Prefer": "wait"
      },
      body: JSON.stringify({
        version: "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc",
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