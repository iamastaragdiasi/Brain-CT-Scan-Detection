import os
import numpy as np
from flask import Flask, request, jsonify
from tensorflow.keras.models import load_model
from PIL import Image
import tensorflow as tf

app = Flask(__name__)

# ===== Load Models =====
SEG_MODEL_PATH = os.path.join(os.path.dirname(__file__), "unet_brain_tumor_segmentation.h5")
CLASS_MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.h5")

if not os.path.exists(SEG_MODEL_PATH):
    raise FileNotFoundError("Error: unet_brain_tumor_segmentation.h5 not found.")
if not os.path.exists(CLASS_MODEL_PATH):
    raise FileNotFoundError("Error: model.h5 not found.")

seg_model = load_model(SEG_MODEL_PATH)
class_model = tf.keras.models.load_model(CLASS_MODEL_PATH)

# Tumor classes for the classification model
class_labels = ["pituitary", "glioma", "notumor", "meningioma"]

# ===== Image Preprocessing =====
def preprocess_seg(image, target_size=(256, 256)):
    if image.mode != "RGB":
        image = image.convert("RGB")
    image = image.resize(target_size)
    img_array = np.array(image) / 255.0
    return np.expand_dims(img_array, axis=0)

def preprocess_class(image, target_size=(128, 128)):
    img = image.resize(target_size)
    img_array = np.array(img) / 255.0
    return np.expand_dims(img_array, axis=0)

# ===== Routes =====
@app.route("/", methods=["GET"])
def index():
    return jsonify({"message": "Brain Tumor Segmentation & Classification API is running."})

@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No image file found in request."}), 400

    file = request.files["image"]

    try:
        image = Image.open(file.stream)

        # --- Segmentation ---
        seg_input = preprocess_seg(image)
        seg_pred = seg_model.predict(seg_input)[0]
        mask = (seg_pred > 0.3).astype("float32")
        tumor_area_ratio = float(np.mean(mask))
        seg_label = "Tumor Detected" if tumor_area_ratio > 0.01 else "No Tumor Detected"

        # Overlay
        orig = np.array(image.resize((256, 256))) / 255.0
        overlay = orig.copy()
        overlay[mask.squeeze() > 0.5] = [1, 0, 0]  # red highlight
        overlay_dir = os.path.join(os.path.dirname(__file__), "static")
        os.makedirs(overlay_dir, exist_ok=True)
        overlay_path = os.path.join(overlay_dir, "overlay.png")
        Image.fromarray((overlay * 255).astype(np.uint8)).save(overlay_path)
        overlay_url = request.host_url + "static/overlay.png"

        # --- Classification ---
        class_input = preprocess_class(image)
        class_pred = class_model.predict(class_input)
        if class_pred.shape[-1] == 1:
            class_label = "Condition Detected" if class_pred[0][0] >= 0.5 else "No Condition Detected"
        else:
            class_idx = int(np.argmax(class_pred))
            class_label = class_labels[class_idx]

        return jsonify({
            "segmentation": {
                "prediction": seg_label,
                "tumor_area_ratio": tumor_area_ratio,
                "overlay_image_url": overlay_url
            },
            "classification": {
                "tumor_type": class_label
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
