from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array
from PIL import Image
import cv2
import io
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS configuration
origins = [
    "http://localhost",          # Your React frontend URL
    "http://localhost:3000",     # If React is running on port 3000
    "http://127.0.0.1",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
# Load the model
model = load_model('car_accident_detection_model.h5')

def preprocess_image(image):
    # Preprocess the image
    image = image.resize((150, 150))
    image = img_to_array(image)
    image = np.expand_dims(image, axis=0)
    image /= 255.0
    return image

def predict_image(image):
    # Predict the class
    prediction = model.predict(image)
    return 'Accident' if prediction[0] > 0.5 else 'Non-Accident'

@app.post("/predict/")
async def predict(file: UploadFile = File(...)):
    # Read the uploaded file
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))

    # Get the prediction
    processed_image = preprocess_image(image)
    result = predict_image(processed_image)

    return JSONResponse(content={"result": result})




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
