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
# Pressure Drop Flowsheet Playground

A browser-based pressure drop app for single-phase liquid systems that combines:
- Darcy-Weisbach pipe friction calculation
- Pipe selection by nominal size (NPS) and schedule
- Interactive upstream/downstream flowsheet with editable boundary condition elements

## Key capabilities
- Select NPS and schedule to derive inner diameter automatically.
- Add process effects that alter pressure profile between nodes:
  - Pump pressure/head additions
  - Vessel and valve losses
  - Pressure setpoints
  - Static head effects
- Visualize upstream and downstream nodes in a live process flow diagram.
- Recalculate net pressure drop and downstream pressure instantly as you "play" with conditions.

## Model details
- Velocity and Reynolds number are calculated from flow and geometry.
- Friction factor:
  - Laminar (`Re < 2300`): `f = 64 / Re`
  - Turbulent (`Re >= 2300`): Swamee-Jain explicit approximation
- Pipe friction drop:

`ΔP_friction = f × (L/D) × (ρv²/2)`

- Net pressure relation in the app:

`ΔP_net = ΔP_friction - Σ(components in bar)`

`P_downstream = P_upstream - ΔP_net`

`ΔP_net = ΔP_friction - Σ(equipment impacts in bar)`

`P_downstream = P_upstream - ΔP_net`

## Run
```bash
python3 -m http.server 8000
```
Open http://localhost:8000.
