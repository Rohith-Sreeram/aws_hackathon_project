"""
Dataset Generation Module for Building Energy Management System (BEMS).
Generates realistic building telemetry datasets with:
- 9 Input Features: Zone Type, Occupancy, Temperature, Humidity, Weekend, Day/Night, HVAC Status, Fan Status, Lighting Status.
- Target: 1-Hour Energy Consumption (kWh) based on thermodynamic & electrical physics.
"""
import os
import numpy as np
import pandas as pd
from sklearn.preprocessing import OneHotEncoder

def generate_energy_dataset(n_samples: int = 2000, output_path: str = None) -> pd.DataFrame:
    np.random.seed(42)

    # 1. Generate Categorical Features
    zone_type = np.random.choice(["Office", "Meeting Hall", "Corridor", "Floor"], size=n_samples)
    weekend = np.random.choice(["Yes", "No"], size=n_samples, p=[0.28, 0.72])
    day_night = np.random.choice(["Day", "Night"], size=n_samples, p=[0.70, 0.30])
    hvac_status = np.random.choice(["ON", "OFF"], size=n_samples, p=[0.65, 0.35])
    fan_status = np.random.choice(["ON", "OFF"], size=n_samples, p=[0.60, 0.40])
    lighting_status = np.random.choice(["ON", "OFF"], size=n_samples, p=[0.65, 0.35])

    # 2. Generate Numerical Features
    occupancy = np.random.randint(0, 101, size=n_samples)
    temperature = np.round(np.random.uniform(18, 35, size=n_samples), 2)
    humidity = np.round(np.random.uniform(30, 80, size=n_samples), 2)

    # 3. Create DataFrame
    df = pd.DataFrame({
        "Zone Type": zone_type,
        "Occupancy": occupancy,
        "Temperature": temperature,
        "Humidity": humidity,
        "Weekend": weekend,
        "Day/Night": day_night,
        "HVAC Status": hvac_status,
        "Fan Status": fan_status,
        "Lighting Status": lighting_status
    })

    # 4. Thermodynamic & Electrical Physics Target Function
    base_load = 20.0
    hvac_load = np.where(df["HVAC Status"] == "ON", 18.0, 1.5)
    light_load = np.where(df["Lighting Status"] == "ON", 6.0, 0.5)
    fan_load = np.where(df["Fan Status"] == "ON", 3.5, 0.3)
    occ_load = df["Occupancy"] * 0.22
    temp_delta = np.maximum(0, df["Temperature"] - 22.0) * 0.9
    time_load = np.where(df["Day/Night"] == "Day", 8.0, 0.0)
    weekend_factor = np.where(df["Weekend"] == "Yes", -4.0, 2.0)
    noise = np.random.normal(0, 2.5, size=n_samples)

    total_energy = base_load + hvac_load + light_load + fan_load + occ_load + temp_delta + time_load + weekend_factor + noise
    df["Energy Consumption"] = np.round(np.clip(total_energy, 5.0, 120.0), 2)

    if output_path:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        df.to_csv(output_path, index=False)
        print(f"Generated {n_samples} samples saved to: {output_path}")

    return df

if __name__ == "__main__":
    out_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "energy_consumption_dataset.csv")
    generate_energy_dataset(2000, out_file)
