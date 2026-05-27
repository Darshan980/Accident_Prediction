# 🚗 Accident Prediction System

A real-time accident detection system using deep learning and computer vision. The system analyzes live video and image input to classify accident vs. non-accident scenarios and triggers alert notifications.



**Note:** Authentication features are under active development. Core accident detection functionality is fully operational.

---

## ✨ Features

- **Real-time detection** — processes live video frames and image input
- **Deep learning classifier** — trained model distinguishes accident vs. non-accident scenarios
- **Alert notifications** — triggers alerts when an accident is detected
- **Prediction dashboard** — visual interface showing detection results
- **Model evaluation** — accuracy metrics and confusion matrix reporting

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Python |
| Computer Vision | OpenCV |
| Deep Learning | TensorFlow / Keras |
| ML Utilities | scikit-learn |
| Data Processing | NumPy, Pandas |
| Visualization | Matplotlib |
| Notebook | Jupyter Notebook |

---

## 🚀 Getting Started

### Prerequisites

```bash
Python 3.8+
pip
```

### Installation

```bash
# Clone the repository
git clone https://github.com/Darshan980/Accident_Prediction.git
cd Accident_Prediction

# Install dependencies
pip install -r requirements.txt
```

### Run

```bash
# Run on a video file
python detect.py --source path/to/video.mp4

# Run on webcam
python detect.py --source 0
```

---

## 📁 Project Structure

```
Accident_Prediction/
├── model/              # Trained model weights
├── data/               # Sample images/videos for testing
├── detect.py           # Main detection script
├── train.py            # Model training script
├── utils.py            # Helper functions (preprocessing, alerts)
├── requirements.txt
└── README.md
```
---

## 🔮 Future Improvements

- [ ] Deploy as a web app using Flask/Streamlit
- [ ] Add GPS-based location tagging on alerts
- [ ] Improve model accuracy with larger dataset
- [ ] Multi-camera support

---

This project is open source and available under the [MIT License](LICENSE).
