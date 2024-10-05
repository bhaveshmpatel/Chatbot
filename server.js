const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const dotenv = require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

const MODEL_NAME = "gemini-pro";
const API_KEY = process.env.API_KEY;

let session = { name: null, email: null }; // Stores the name and email once captured

async function runChat(userInput) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 1000,
  };

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];

  // Build the initial chat history
  let history = [];

  if (!session.name || !session.email) {
    history.push(
      {
        role: "model",
        parts: [{ text: "Hi there! Before I can assist you, could you please provide your name and email address?" }],
      }
    );
  } else {
    // If name and email are already captured, continue with the conversation
    history.push(
      {
        role: "user",
        parts: [{ text: `User's name: ${session.name}, Email: ${session.email}` }],
      },
      {
        role: "model",
        parts: [{ text: "Thank you! How can I assist you today?" }],
      },
      {
        role: "user",
        parts: [{ text: userInput }],
      }
    );
  }

  const chat = model.startChat({
    generationConfig,
    safetySettings,
    history,
  });

  const result = await chat.sendMessage(userInput);
  const response = result.response;

  // If the user's input contains both name and email, capture it in the session
  if (!session.name || !session.email) {
    if (userInput.includes('@')) { // Simple check to see if email is provided
      const [name, email] = userInput.split(' ');
      session.name = name;
      session.email = email;
      return `Thank you ${name}! We've captured your email as ${email}. How can I assist you today?`;
    } else {
      return "Please provide your name and a valid email address (e.g., 'John john@example.com')";
    }
  }

  return response.text();
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/loader.gif', (req, res) => {
  res.sendFile(__dirname + '/loader.gif');
});

app.post('/chat', async (req, res) => {
  try {
    const userInput = req.body?.userInput;
    console.log('incoming /chat req', userInput);
    if (!userInput) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const response = await runChat(userInput);
    res.json({ response });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
