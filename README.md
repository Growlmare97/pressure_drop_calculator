# Pressure Drop Flowsheet Studio

Interactive browser app for single-phase liquid pressure-drop analysis with an editable process flow diagram.

## Latest improvements
- Added downstream pressure target check (`PASS/FAIL`) so boundary-condition edits can be validated against an operating objective.
- Added stage reordering controls (`↑` / `↓`) and kept insertion at any stage.
- Added scenario persistence in `localStorage` and a one-click reset action.
- Added live form recalculation while inputs are edited.
- Kept the modernized UI and interactive SVG PFD view.

## Hydraulic model
- Pipe pressure loss: Darcy–Weisbach.
- Friction factor:
  - Laminar (`Re < 2300`): `f = 64/Re`
  - Turbulent (`Re >= 2300`): Swamee–Jain approximation.
- Equipment impacts are converted to bar and applied as signed terms:
  - `Gain (+)` for pressure addition
  - `Loss (-)` for pressure loss

Used equations:

`ΔP_net = ΔP_friction - Σ(equipment impacts in bar)`

`P_downstream = P_upstream - ΔP_net`

`margin = P_downstream - P_target`

## Run
```bash
python3 -m http.server 8000
```
Open http://localhost:8000.
