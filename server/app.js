require("dotenv").config();

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { exec } = require("child_process");
const { GoogleGenAI } = require("@google/genai");
const FormData = require("form-data");



const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;
const classLabels = ["pituitary", "glioma", "notumor", "meningioma"];

const ai = new GoogleGenAI({ apiKey: API_KEY });


// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}${path.extname(file.originalname)}`),
  }),
});

// Helper: Run Python script and return prediction index
async function predictFromH5(imagePath) {
  const formData = new FormData();
  formData.append("image", fs.createReadStream(imagePath));
  // console.log(formData)
  const response = await axios.post("http://127.0.0.1:5000/predict", formData, {
    headers: formData.getHeaders(),
  });

  return response.data;
}

// Route: Upload image and get AI response
app.post("/upload-image", upload.single("imageFile"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const imagePath = path.join(__dirname, "uploads", req.file.filename);
  const userInput = req.body.userInput || "";

  try {
    // Step 1: Run ML prediction
    const rawOutput = await predictFromH5(imagePath);
const predictionLabel = rawOutput.classification.tumor_type;
const tumorRatio = rawOutput.tumor_area_ratio;
const overlayUrl = rawOutput.segmentation.overlay_image_url;

console.log("Prediction:", predictionLabel);
console.log(rawOutput)


    // Step 3: Get advice from Gemini (skip if "notumor")
    let advice = "No advice needed for a healthy brain.";
    if (predictionLabel !== "notumor") {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents:  `Give step-by-step advice on how to manage or reduce the impact of this brain tumor type: ${predictionLabel}.`,
      });
      // console.log(response.text);
      advice = response.text;
    }

    // Step 4: Cleanup and respond
    fs.unlink(imagePath, (err) =>
      err ? console.error("File deletion error:", err) : null
    );

    res.json({
      success: true,
      modelResult: predictionLabel,
      advice,
      overlayUrl
    });
  } catch (err) {
    console.error("Error during processing:", err);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
});

// Serve uploads statically
app.use("/uploads", express.static("uploads"));

// Start server
app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
