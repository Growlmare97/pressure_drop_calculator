const form = document.getElementById('calculator-form');

const format = (value, unit, digits = 3) => `${Number(value).toLocaleString(undefined, { maximumFractionDigits: digits })} ${unit}`;

function calculateFrictionFactor(reynolds, relativeRoughness) {
  if (reynolds < 2300) {
    return 64 / reynolds;
  }

  // Swamee-Jain explicit approximation for turbulent flow
  return 0.25 / Math.pow(Math.log10(relativeRoughness / 3.7 + 5.74 / Math.pow(reynolds, 0.9)), 2);
}

function calculatePressureDrop({ length, diameterMm, flowRateM3h, density, viscosity, roughnessMm }) {
  const diameter = diameterMm / 1000;
  const roughness = roughnessMm / 1000;
  const area = Math.PI * Math.pow(diameter, 2) / 4;
  const flowRate = flowRateM3h / 3600;
  const velocity = flowRate / area;
  const reynolds = (density * velocity * diameter) / viscosity;
  const relativeRoughness = roughness / diameter;
  const frictionFactor = calculateFrictionFactor(reynolds, relativeRoughness);
  const pressureDropPa = frictionFactor * (length / diameter) * (density * Math.pow(velocity, 2) / 2);

  return { velocity, reynolds, frictionFactor, pressureDropPa };
}

function renderResult(result) {
  document.getElementById('velocity').textContent = format(result.velocity, 'm/s');
  document.getElementById('reynolds').textContent = result.reynolds.toLocaleString(undefined, { maximumFractionDigits: 0 });
  document.getElementById('frictionFactor').textContent = result.frictionFactor.toFixed(5);
  document.getElementById('pressureDrop').textContent = `${result.pressureDropPa.toFixed(1)} Pa (${(result.pressureDropPa / 100000).toFixed(4)} bar)`;

  const regime = result.reynolds < 2300 ? 'laminar regime (f = 64/Re)' : 'turbulent regime (Swamee-Jain approximation)';
  document.getElementById('note').textContent = `Flow identified as ${regime}.`;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const data = {
    length: Number(document.getElementById('length').value),
    diameterMm: Number(document.getElementById('diameter').value),
    flowRateM3h: Number(document.getElementById('flowRate').value),
    density: Number(document.getElementById('density').value),
    viscosity: Number(document.getElementById('viscosity').value),
    roughnessMm: Number(document.getElementById('roughness').value)
  };

  const hasInvalidInput = Object.values(data).some((value) => !Number.isFinite(value) || value <= 0);
  if (hasInvalidInput) {
    document.getElementById('note').textContent = 'Please enter positive numeric values for all fields.';
    return;
  }

  const result = calculatePressureDrop(data);
  renderResult(result);
});

form.requestSubmit();
