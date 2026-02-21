# Pressure Drop Flowsheet Studio

Interactive browser app for single-phase liquid pressure-drop analysis with an **editable process flow diagram**.

## What is new
- Modernized UI and layout for a cleaner engineering workbench experience.
- NPS + schedule driven pipe selection with automatic inner-diameter lookup.
- Stage-based equipment insertion: add pumps, vessels, valves, pressure sources/sinks, and static head at any position in the flowsheet.
- Clickable `+ Insert ...` stage controls directly from the PFD.
- Real-time upstream/downstream pressure response while changing boundary conditions.

## Hydraulic model
- Pipe pressure loss is calculated with Darcy–Weisbach.
- Friction factor:
  - Laminar (`Re < 2300`): `f = 64/Re`
  - Turbulent (`Re >= 2300`): Swamee–Jain approximation
- Equipment impacts are converted to bar and treated as:
  - `Gain (+)` for pressure addition
  - `Loss (-)` for pressure drop

Formulation used:

`ΔP_net = ΔP_friction - Σ(equipment impacts in bar)`

`P_downstream = P_upstream - ΔP_net`

## Run
```bash
python3 -m http.server 8000
```
Open http://localhost:8000.
