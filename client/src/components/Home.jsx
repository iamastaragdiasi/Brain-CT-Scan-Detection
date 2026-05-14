import React, { useCallback, useState } from "react";
import { startSpeechRecognition } from "../utils/speechRecognition";
import { marked } from "marked";
import './style.css';

import { MdOutlineFileUpload } from "react-icons/md";
import { MdOutlineKeyboardVoice } from "react-icons/md";
import { BsSend } from "react-icons/bs";

const Home = () => {
  const [response, setResponse] = useState("");
  const [advice, setAdvice] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [userInput, setUserInput] = useState("");
  const [overlayUrl, setOverlayUrl] = useState("");

  const handleTextChange = (e) => setUserInput(e.target.value);

  const startListening = useCallback(async () => {
    try {
      setIsListening(true);
      const input = await startSpeechRecognition();
      if (input) setUserInput(input);
    } catch (error) {
      console.error("Speech error:", error);
    } finally {
      setIsListening(false);
    }
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus(`Selected file: ${file.name}`);
    }
  };

  const handleUpload = async () => {
    console.log("clicked");
    if (!selectedFile && !userInput) {
      setUploadStatus("Please select a file or provide an input first.");
      return;
    }

    const formData = new FormData();
    if (selectedFile) formData.append("imageFile", selectedFile);
    if (userInput) formData.append("userInput", userInput);

    try {
      const res = await fetch("http://localhost:3000/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const result = await res.json();
      setUploadStatus("Upload Successful");
      setResponse("🧠 Diagnosis: " + result.modelResult);
      setAdvice(result.advice);
      console.log(result.overlayUrl)
      setOverlayUrl(result.overlayUrl);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("Upload failed. Try again.");
    }
  };

  return (
    <div className="home-container">
      <div className="chatbox-container">
        {/* Header */}
        <header className="chatbox-header">
          <h2 className="chatbox-title">🤖 BrainScanBot</h2>
          <span className="chatbox-close">✖️</span>
        </header>

        {/* Chat Area */}
        <div className="chat-area">
          {uploadStatus && (
            <div className="status-message">
              <strong>Status:</strong> {uploadStatus}
              {selectedFile && (
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Preview"
                  className="status-image"
                />
              )}
            </div>
          )}

          {response && (
            <>
            <img src={overlayUrl} alt="Masked Image" style={{ width: "50%", height: "80%" }} />
            <div className="bot-response">{response}</div>
            </>
          )}

          {advice && (
            <div
              className="bot-advice"
              dangerouslySetInnerHTML={{ __html: marked(advice) }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="chatbox-footer">
          <label htmlFor="file-upload" className="upload-icon">
            <MdOutlineFileUpload />
          </label>
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden-input"
          />

          <input
            value={userInput}
            onChange={handleTextChange}
            placeholder="Type your message or upload an image..."
            className="text-input"
          />

          <button
            onClick={startListening}
            className={`mic-button ${isListening ? "listening" : ""}`}
            title="Start Voice Input"
          >
            <MdOutlineKeyboardVoice />
          </button>

          <button
            onClick={handleUpload}
            className="send-button"
          >
            <BsSend />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
