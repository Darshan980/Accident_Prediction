from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array
from PIL import Image
import io
import cv2
import os

app = FastAPI()

# CORS configuration
origins = [
    "http://localhost",
    "http://localhost:3000",
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
    image = image.resize((150, 150))
    image = img_to_array(image)
    image = np.expand_dims(image, axis=0)
    image /= 255.0
    return image

def preprocess_frame(frame):
    image = Image.fromarray(frame)
    image = image.resize((150, 150))
    image = img_to_array(image)
    image = np.expand_dims(image, axis=0)
    image /= 255.0
    return image

def predict_image(image):
    prediction = model.predict(image)
    return 'Accident' if prediction[0] > 0.5 else 'Non-Accident'

def predict_frame(frame):
    processed_frame = preprocess_frame(frame)
    prediction = model.predict(processed_frame)
    return 'Accident' if prediction[0] > 0.5 else 'Non-Accident'

def process_video(video_path):
    cap = cv2.VideoCapture(video_path)
    accident_count = 0
    non_accident_count = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        prediction = predict_frame(frame)
        if prediction == 'Accident':
            accident_count += 1
        else:
            non_accident_count += 1

    cap.release()
    return 'Accident' if accident_count > non_accident_count else 'Non-Accident'

@app.post("/predict/")
async def predict(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        processed_image = preprocess_image(image)
        result = predict_image(processed_image)

        return JSONResponse(content={"result": result})

    except Exception as e:
        print(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/predict-video/")
async def predict_video(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        video_path = f"temp_{file.filename}"
        with open(video_path, 'wb') as f:
            f.write(contents)
        
        prediction = process_video(video_path)
        
        os.remove(video_path)
        
        return JSONResponse(content={"result": prediction})
    
    except Exception as e:
        print(f"Error processing video: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing video: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)