import axios from "axios";

export async function getAIResponse(userInput, topic) {
  const response = await axios.post("http://localhost:5000/api/geminiAPI", {
    userInput,
    topic,
  });
  return response.data;
}
