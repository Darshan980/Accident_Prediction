import os
import numpy as np
import matplotlib.pyplot as plt
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Input, Conv2D, MaxPooling2D, Flatten, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping

# Define paths
base_dir = 'data'
train_dir = os.path.join(base_dir, 'train')
val_dir = os.path.join(base_dir, 'val')
test_dir = os.path.join(base_dir, 'test')

# Data Augmentation for Training Data
train_datagen = ImageDataGenerator(
    rescale=1.0/255.0,              # Normalize pixel values to [0, 1]
    rotation_range=20,              # Randomly rotate images
    width_shift_range=0.2,          # Randomly translate images horizontally
    height_shift_range=0.2,         # Randomly translate images vertically
    shear_range=0.2,                # Apply random shear transformations
    zoom_range=0.2,                 # Apply random zoom transformations
    horizontal_flip=True,           # Randomly flip images horizontally
    fill_mode='nearest'             # Fill newly created pixels after transformations
)

# Data Augmentation for Validation and Test Data
val_test_datagen = ImageDataGenerator(rescale=1.0/255.0)  # Only normalize pixel values

# Create Data Generators
train_generator = train_datagen.flow_from_directory(
    train_dir,
    target_size=(150, 150),  # Resize images to 150x150
    batch_size=32,           # Number of images to yield per batch
    class_mode='binary'      # Binary classification
)

val_generator = val_test_datagen.flow_from_directory(
    val_dir,
    target_size=(150, 150),
    batch_size=32,
    class_mode='binary'
)

# Build the Model
model = Sequential([
    Input(shape=(150, 150, 3)),                                       # Define the input shape
    Conv2D(32, (3, 3), activation='relu'),                            # 32 filters, 3x3 kernel, ReLU activation
    MaxPooling2D((2, 2)),                                             # 2x2 max pooling
    Conv2D(64, (3, 3), activation='relu'),                            # 64 filters, 3x3 kernel, ReLU activation
    MaxPooling2D((2, 2)),                                             # 2x2 max pooling
    Conv2D(128, (3, 3), activation='relu'),                           # 128 filters, 3x3 kernel, ReLU activation
    MaxPooling2D((2, 2)),                                             # 2x2 max pooling
    Flatten(),                                                        # Flatten the feature maps to a 1D vector
    Dense(512, activation='relu'),                                    # Fully connected layer with 512 units and ReLU activation
    Dropout(0.5),                                                     # Dropout for regularization
    Dense(1, activation='sigmoid')                                    # Output layer with a single unit and sigmoid activation
])

# Compile the Model
model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

# Early Stopping Callback
early_stopping = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)

# Train the Model
history = model.fit(
    train_generator,
    epochs=25,                    # Number of epochs to train
    validation_data=val_generator,
    callbacks=[early_stopping]    # Use early stopping to prevent overfitting
)

# Save the Model
model.save('car_accident_detection_model.h5')

# Plot Training History
acc = history.history['accuracy']
val_acc = history.history['val_accuracy']
loss = history.history['loss']
val_loss = history.history['val_loss']

epochs = range(len(acc))

plt.plot(epochs, acc, 'b', label='Training accuracy')
plt.plot(epochs, val_acc, 'r', label='Validation accuracy')
plt.title('Training and validation accuracy')
plt.legend()
plt.figure()

plt.plot(epochs, loss, 'b', label='Training loss')
plt.plot(epochs, val_loss, 'r', label='Validation loss')
plt.title('Training and validation loss')
plt.legend()
plt.show()
# Load the Model
from tensorflow.keras.models import load_model

model = load_model('car_accident_detection_model.h5')

# Test Data Generator
test_generator = val_test_datagen.flow_from_directory(
    test_dir,
    target_size=(150, 150),
    batch_size=32,
    class_mode='binary'
)

# Evaluate the Model
test_loss, test_acc = model.evaluate(test_generator)
print(f'Test accuracy: {test_acc:.2f}')
