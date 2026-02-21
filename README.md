# Pressure Drop Calculator

A simple browser-based calculator for estimating pressure loss in a straight pipe using the Darcy-Weisbach equation.

## Inputs
- Pipe length (m)
- Inner diameter (mm)
- Flow rate (m³/h)
- Fluid density (kg/m³)
- Dynamic viscosity (Pa·s)
- Pipe roughness (mm)

## Model details
- Velocity and Reynolds number are derived from the user input.
- Friction factor:
  - Laminar (`Re < 2300`): `f = 64 / Re`
  - Turbulent (`Re >= 2300`): Swamee-Jain explicit approximation
- Pressure drop is calculated with Darcy-Weisbach:

`ΔP = f × (L/D) × (ρv²/2)`

## Run locally
```bash
python3 -m http.server 8000
```
Open http://localhost:8000 in your browser.
