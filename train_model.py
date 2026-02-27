import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import time
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.metrics import accuracy_score, f1_score, recall_score, precision_score
from sklearn.preprocessing import LabelEncoder, StandardScaler

def main():
    # Feature Selection Columns
    selected_columns = [
        'DST_TOS', 'SRC_TOS', 'TCP_WIN_SCALE_OUT', 'TCP_WIN_SCALE_IN', 'TCP_FLAGS',
        'TCP_WIN_MAX_OUT', 'PROTOCOL', 'TCP_WIN_MIN_OUT', 'TCP_WIN_MIN_IN',
        'TCP_WIN_MAX_IN', 'LAST_SWITCHED', 'TCP_WIN_MSS_IN', 'TOTAL_FLOWS_EXP',
        'FIRST_SWITCHED', 'FLOW_DURATION_MILLISECONDS', 'LABEL'
    ]
    
    # Define cleaner data types to save memory (int64 -> int32, float64 -> float32)
    # Using '0.3' fractional sampling to prevent MemoryError during concatenation
    SAMPLE_FRAC = 0.3 

    print(f"Loading datasets (sampling {SAMPLE_FRAC*100}% of each)...")
    
    dfs = []
    for file_part in ["dataset-part1.csv", "dataset-part2.csv", "dataset-part3.csv", "dataset-part4.csv"]:
        try:
            print(f"Reading {file_part}...")
            df = pd.read_csv(file_part, usecols=selected_columns)
            # Sample immediately to save memory
            df = df.sample(frac=SAMPLE_FRAC, random_state=42)
            
            # Downcast numeric columns
            for col in df.select_dtypes(include=['float64']).columns:
                df[col] = df[col].astype('float32')
            for col in df.select_dtypes(include=['int64']).columns:
                df[col] = df[col].astype('int32')
                
            dfs.append(df)
            print(f"Processed {file_part}: {df.shape}")
        except FileNotFoundError:
            print(f"Warning: {file_part} not found, skipping.")
        except Exception as e:
            print(f"Error processing {file_part}: {e}")

    # Merge them vertically
    if not dfs:
        print("No data loaded.")
        return

    print("Concatenating datasets...")
    data_frame = pd.concat(dfs, axis=0, ignore_index=True)
    
    # Free memory
    del dfs

    # Shuffle the dataset
    print("Shuffling dataset...")
    data_frame = data_frame.sample(frac=1, random_state=42).reset_index(drop=True)
    print("Final Shape:", data_frame.shape)

    # Remove duplicate rows
    print("Removing duplicates...")
    print(f"Shape before: {data_frame.shape}")
    data_frame.drop_duplicates(inplace=True)
    print(f"Shape after: {data_frame.shape}")

    # Preprocessing
    print("Preprocessing...")
    
    # Identify dtypes safely
    label_encoder = LabelEncoder()
    # Explicitly identifying LABEL as target
    if 'LABEL' in data_frame.columns:
        y_raw = data_frame['LABEL']
        X_raw = data_frame.drop(columns=['LABEL'])
    else:
        print("Error: LABEL column not found")
        return

    # Encode Target
    print("Encoding target variable...")
    y_encoded = label_encoder.fit_transform(y_raw)
    
    # Process Features
    # Identify non-numeric columns (categorical)
    categorical_cols = X_raw.select_dtypes(exclude=['number']).columns
    # Identify numeric columns
    numeric_cols = X_raw.select_dtypes(include=['number']).columns
    
    print(f"Categorical columns to encode: {list(categorical_cols)}")
    print(f"Numeric columns to scale: {len(numeric_cols)}")

    # Label Encode Categorical Features
    for col in categorical_cols:
        # Convert to string to ensure consistency before encoding
        X_raw[col] = label_encoder.fit_transform(X_raw[col].astype(str))
        
    # Scale Numeric Features
    scaler = StandardScaler()
    if len(numeric_cols) > 0:
        X_raw[numeric_cols] = scaler.fit_transform(X_raw[numeric_cols])
        
    # Reassemble X
    X = X_raw
    Y = y_encoded

    # Split Data
    print("Splitting data...")
    X_train, X_test, y_train, y_test = train_test_split(X, Y, test_size=0.3, random_state=42)

    # Split Data
    print("Splitting data...")
    X = data_frame.drop(columns=['LABEL'], axis=1)
    Y = data_frame['LABEL']
    X_train, X_test, y_train, y_test = train_test_split(X, Y, test_size=0.3, random_state=42)

    # Model 1: Random Forest
    print("Training Random Forest...")
    rf_classifier = RandomForestClassifier(n_estimators=30)
    start_time = time.time()
    rf_classifier.fit(X_train, y_train)
    end_time = time.time()
    print(f"Training time (RF): {end_time - start_time:.2f}s")
    
    y_pred_rf = rf_classifier.predict(X_test)
    print("Random Forest Results:")
    print(f"Accuracy: {accuracy_score(y_test, y_pred_rf)}")
    print(f"F1 Score: {f1_score(y_test, y_pred_rf, average='weighted')}")
    print(f"Precision: {precision_score(y_test, y_pred_rf, average='weighted')}")
    print(f"Recall: {recall_score(y_test, y_pred_rf, average='weighted')}")

    # Model 2: Decision Tree
    print("\nTraining Decision Tree...")
    dt_classifier = DecisionTreeClassifier(criterion='entropy', max_depth=4)
    start_time = time.time()
    dt_classifier.fit(X_train, y_train)
    end_time = time.time()
    print(f"Training time (DT): {end_time - start_time:.2f}s")
    
    y_pred_dt = dt_classifier.predict(X_test)
    print("Decision Tree Results:")
    print(f"Accuracy: {accuracy_score(y_test, y_pred_dt)}")
    print(f"F1 Score: {f1_score(y_test, y_pred_dt, average='weighted')}")
    print(f"Precision: {precision_score(y_test, y_pred_dt, average='weighted')}")
    print(f"Recall: {recall_score(y_test, y_pred_dt, average='weighted')}")
    
    # Model 3: Gaussian Naive Bayes
    print("\nTraining Gaussian Naive Bayes...")
    nb_classifier = GaussianNB()
    start_time = time.time()
    nb_classifier.fit(X_train, y_train)
    end_time = time.time()
    print(f"Training time (NB): {end_time - start_time:.2f}s")
    
    y_pred_nb = nb_classifier.predict(X_test)
    print("Naive Bayes Results:")
    print(f"Accuracy: {accuracy_score(y_test, y_pred_nb)}")
    print(f"F1 Score: {f1_score(y_test, y_pred_nb, average='weighted')}")
    print(f"Precision: {precision_score(y_test, y_pred_nb, average='weighted')}")
    print(f"Recall: {recall_score(y_test, y_pred_nb, average='weighted')}")

if __name__ == "__main__":
    main()
