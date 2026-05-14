export function startSpeechRecognition() {
    return new Promise((resolve, reject) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
  
      recognition.onstart = () => console.log("Speech recognition started...");
      recognition.onspeechend = () => recognition.stop();
      recognition.onerror = (e) => reject(e);
  
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };
  
      recognition.start();
    });
  }
  