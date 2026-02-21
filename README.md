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

## Run locally
```bash
python3 -m http.server 8000
```
Open http://localhost:8000 in your browser.
