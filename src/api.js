export async function translateText(sourceText, targetLangs, settings, imageObj) {
  const primaryLang = targetLangs[0];
  const additionalLangs = targetLangs.slice(1);
  const translationInstruction = additionalLangs.length > 0 
    ? `First, translate the following text into ${primaryLang}. Then, translate your ${primaryLang} translation into these additional languages: ${additionalLangs.join(', ')}.`
    : `Translate the following text into ${primaryLang}.`;

  const prompt = `
You are an expert technical and professional PM translator. ${translationInstruction}
First, determine the overall "mood" or tone of the original text (e.g. Urgent, Professional, Friendly, Angry, Formal, Casual).
Return purely a valid JSON object with EXACTLY this structure, nothing else:
{
  "mood": "Detected mood as a single short string",
  "translations": {
    "Language Name": "Translated text string",
    "Language Name 2": "Translated text string"
  }
}
Text to translate (if provided, otherwise translate the text in the image):
"""
${sourceText || "Please translate the text in the image."}
"""
  `;

  const [provider, modelValue] = settings.provider.split(':');

  if (provider === 'openai') {
    return await translateOpenAI(prompt, settings, modelValue, imageObj);
  } else {
    return await translateAnthropic(prompt, settings, modelValue, imageObj);
  }
}

function extractJSON(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (err) {}
    }
    const looseMatch = text.match(/\{[\s\S]*\}/);
    if (looseMatch) {
      try {
        return JSON.parse(looseMatch[0]);
      } catch (err) {}
    }
    throw new Error("Could not parse JSON from response: " + text.substring(0, 50) + "...");
  }
}

async function translateOpenAI(prompt, settings, model, imageObj) {
  const endpoint = settings.endpoint || "https://api.openai.com/v1/chat/completions";
  
  let messages;
  if (imageObj && imageObj.base64) {
    messages = [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:${imageObj.mimeType};base64,${imageObj.base64}` } }
      ]
    }];
  } else {
    messages = [{ role: "user", content: prompt }];
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: model || "gpt-5.4",
      messages: messages,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API Error: ${err}`);
  }

  const data = await response.json();
  return extractJSON(data.choices[0].message.content);
}

async function translateAnthropic(prompt, settings, model, imageObj) {
  const endpoint = settings.endpoint || "https://api.anthropic.com/v1/messages";
  const proxyEndpoint = endpoint.includes('anthropic') ? endpoint : endpoint;
  
  let messages;
  if (imageObj && imageObj.base64) {
    messages = [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: imageObj.mimeType, data: imageObj.base64 } },
        { type: "text", text: prompt }
      ]
    }];
  } else {
    messages = [{ role: "user", content: prompt }];
  }

  const response = await fetch(proxyEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: messages
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API Error: ${err}`);
  }

  const data = await response.json();
  
  // Anthropic API might return OpenAI-like wrapper depending on proxy used
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return extractJSON(data.choices[0].message.content);
  }
  
  if (data.content && data.content[0]) {
    const text = data.content[0].text;
    return extractJSON(text);
  }

  throw new Error("Could not parse response structure");
}
