# Accident Detection System 🚗💥

## Overview  
The **Accident Detection System** is a machine learning-based tool designed to classify images or videos as either depicting an **accident** or a **non-accident**. The system uses **deep learning models** to process the uploaded media and return a result indicating whether an accident is detected in the scene.

---

## Features  
- **Accident Detection**: Classifies uploaded images or videos as **Accident** or **Non-Accident**.  
- **Simple Classification**: Focuses solely on the classification task—accident detection in media files.  

---

## Dataset  
The system is trained using a dataset of accident and non-accident scenes, including:  
1. **Accident**: Images or videos showing vehicle accidents.  
2. **Non-Accident**: Images or videos depicting normal, non-accident road scenes.

---

## Objective  
The purpose of this system is to automatically detect accidents from uploaded images or videos. This can be used for real-time monitoring and quick analysis of road scenes.

---

## Workflow  

### 1. **Data Preprocessing**  
- **Input**: The system accepts either an image or video as input.  
- **Preprocessing**: The input is resized and formatted for model input, ensuring it is in the correct shape for processing.

### 2. **Model**  
- **Deep Learning Model**: A **Convolutional Neural Network (CNN)** is trained to classify scenes as either an accident or non-accident.  

### 3. **Prediction**  
- The system processes the input and outputs one of the following predictions:  
  - **Accident**: The scene depicts an accident.  
  - **Non-Accident**: The scene depicts a non-accident.

---

## Setup  

### Prerequisites  
Make sure you have Python ≥3.8 installed along with the following libraries:  
```bash  
pip install numpy opencv-python tensorflow keras  
```

### Steps to Run  
1. Clone the repository:  
   ```bash  
   git clone  https://github.com/Darshan980/Accident_Prediction.git
   cd Accident-Detection-System  
   ```  
2. Upload your dataset (images or videos) into the appropriate directory.  
3. Run the script to start the detection process and get the result (Accident or Non-Accident).

---
