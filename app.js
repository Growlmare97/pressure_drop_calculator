const form = document.getElementById('calculator-form');
const componentForm = document.getElementById('component-form');
const npsSelect = document.getElementById('nps');
const scheduleSelect = document.getElementById('schedule');
const componentUnitSelect = document.getElementById('componentUnit');
const componentTypeSelect = document.getElementById('componentType');
const componentTableBody = document.getElementById('componentTableBody');

const pipeDatabase = [
  { nps: '1"', odMm: 33.4, schedules: { '40': 3.38, '80': 4.55 } },
  { nps: '1.5"', odMm: 48.3, schedules: { '40': 3.68, '80': 5.08 } },
  { nps: '2"', odMm: 60.3, schedules: { '40': 3.91, '80': 5.54 } },
  { nps: '3"', odMm: 88.9, schedules: { '40': 5.49, '80': 7.62 } },
  { nps: '4"', odMm: 114.3, schedules: { '10': 3.05, '40': 6.02, '80': 8.56 } },
  { nps: '6"', odMm: 168.3, schedules: { '10': 3.4, '40': 7.11, '80': 10.97 } }
];

const unitOptions = {
  pump: ['bar', 'kPa', 'm'],
  vessel: ['bar', 'kPa', 'm'],
  valve: ['bar', 'kPa', 'm'],
  pressure: ['bar', 'kPa'],
  static: ['m', 'bar', 'kPa']
};

const components = [];

const format = (value, unit, digits = 3) => `${Number(value).toLocaleString(undefined, { maximumFractionDigits: digits })} ${unit}`;

function populatePipeSelectors() {
  pipeDatabase.forEach((pipe) => {
    const option = document.createElement('option');
    option.value = pipe.nps;
    option.textContent = pipe.nps;
    npsSelect.append(option);
  });

  npsSelect.value = '2"';
  populateSchedules();
}

function populateSchedules() {
  const pipe = pipeDatabase.find((item) => item.nps === npsSelect.value);
  scheduleSelect.innerHTML = '';

  Object.keys(pipe.schedules).forEach((schedule) => {
    const option = document.createElement('option');
    option.value = schedule;
    option.textContent = `Sch ${schedule}`;
    scheduleSelect.append(option);
  });

  if (pipe.schedules['40']) {
    scheduleSelect.value = '40';
  }
}

function populateComponentUnits() {
  const options = unitOptions[componentTypeSelect.value] || ['bar'];
  componentUnitSelect.innerHTML = '';

  options.forEach((unit) => {
    const option = document.createElement('option');
    option.value = unit;
    option.textContent = unit;
    componentUnitSelect.append(option);
  });

  componentUnitSelect.value = options[0];
  document.getElementById('componentName').value =
    componentTypeSelect.value === 'pump' ? 'Booster Pump' : 'Boundary Condition';
}

function getInnerDiameterMm(nps, schedule) {
  const selected = pipeDatabase.find((item) => item.nps === nps);
  if (!selected || !selected.schedules[schedule]) {
    return NaN;
  }

  return selected.odMm - 2 * selected.schedules[schedule];
}

function calculateFrictionFactor(reynolds, relativeRoughness) {
  if (reynolds < 2300) {
    return 64 / reynolds;
  }

  return 0.25 / Math.pow(Math.log10(relativeRoughness / 3.7 + 5.74 / Math.pow(reynolds, 0.9)), 2);
}

function toBar(value, unit, density) {
  if (unit === 'bar') {
    return value;
  }

  if (unit === 'kPa') {
    return value / 100;
  }

  // Treat meters as pressure head for liquid service
  return (density * 9.80665 * value) / 100000;
}

function calculatePressureDrop({ length, diameterMm, flowRateM3h, density, viscosity, roughnessMm, upstreamPressureBar }) {
  const diameter = diameterMm / 1000;
  const roughness = roughnessMm / 1000;
  const area = Math.PI * Math.pow(diameter, 2) / 4;
  const flowRate = flowRateM3h / 3600;
  const velocity = flowRate / area;
  const reynolds = (density * velocity * diameter) / viscosity;
  const relativeRoughness = roughness / diameter;
  const frictionFactor = calculateFrictionFactor(reynolds, relativeRoughness);
  const pressureDropPa = frictionFactor * (length / diameter) * (density * Math.pow(velocity, 2) / 2);

  const componentImpactBar = components.reduce((sum, component) => sum + toBar(component.value, component.unit, density), 0);
  const frictionDropBar = pressureDropPa / 100000;
  const netDropBar = frictionDropBar - componentImpactBar;
  const downstreamPressureBar = upstreamPressureBar - netDropBar;

  return { velocity, reynolds, frictionFactor, pressureDropPa, componentImpactBar, netDropBar, downstreamPressureBar };
}

function renderComponentTable(density) {
  componentTableBody.innerHTML = '';

  if (!components.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="4">No boundary conditions added yet.</td>';
    componentTableBody.append(row);
    return;
  }

  components.forEach((component, index) => {
    const impactBar = toBar(component.value, component.unit, density);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${component.type}</td>
      <td>${component.name}</td>
      <td>${impactBar >= 0 ? '+' : ''}${impactBar.toFixed(3)} bar</td>
      <td><button type="button" class="danger" data-index="${index}">Remove</button></td>
    `;
    componentTableBody.append(row);
  });
}

function renderFlowsheet(result, upstreamPressureBar) {
  const flowsheet = document.getElementById('flowsheet');
  const pressureBeforePipe = upstreamPressureBar + result.componentImpactBar;
  const pressureAfterPipe = result.downstreamPressureBar;

  const componentNodes = components
    .map((component, index) => `<div class="node equipment">${index + 1}. ${component.name}<span>${component.type} (${component.value} ${component.unit})</span></div>`)
    .join('<div class="arrow">→</div>');

  flowsheet.innerHTML = `
    <div class="node source">Upstream<br/><strong>${upstreamPressureBar.toFixed(2)} bar</strong></div>
    <div class="arrow">→</div>
    ${componentNodes || '<div class="node equipment">No added equipment</div><div class="arrow">→</div>'}
    <div class="node pipe">Pipe friction<br/><strong>-${(result.pressureDropPa / 100000).toFixed(2)} bar</strong><span>${document.getElementById('length').value} m, ${npsSelect.value} Sch ${scheduleSelect.value}</span></div>
    <div class="arrow">→</div>
    <div class="node sink">Downstream<br/><strong>${pressureAfterPipe.toFixed(2)} bar</strong><span>Before pipe: ${pressureBeforePipe.toFixed(2)} bar</span></div>
  `;
}

function renderResult(result, diameterMm, upstreamPressureBar) {
  document.getElementById('innerDiameter').textContent = format(diameterMm, 'mm', 2);
  document.getElementById('velocity').textContent = format(result.velocity, 'm/s');
  document.getElementById('reynolds').textContent = result.reynolds.toLocaleString(undefined, { maximumFractionDigits: 0 });
  document.getElementById('frictionFactor').textContent = result.frictionFactor.toFixed(5);
  document.getElementById('pressureDrop').textContent = `${result.pressureDropPa.toFixed(1)} Pa (${(result.pressureDropPa / 100000).toFixed(4)} bar)`;
  document.getElementById('componentImpact').textContent = `${result.componentImpactBar >= 0 ? '+' : ''}${result.componentImpactBar.toFixed(4)} bar`;
  document.getElementById('netDrop').textContent = `${result.netDropBar >= 0 ? '+' : ''}${result.netDropBar.toFixed(4)} bar`;
  document.getElementById('downstreamPressure').textContent = `${result.downstreamPressureBar.toFixed(4)} bar`;

  const regime = result.reynolds < 2300 ? 'laminar regime (f = 64/Re)' : 'turbulent regime (Swamee-Jain approximation)';
  document.getElementById('note').textContent = `Flow identified as ${regime}. Positive boundary impact boosts downstream pressure, negative impact reduces it.`;

  renderFlowsheet(result, upstreamPressureBar);
}

function updateModel() {
  const diameterMm = getInnerDiameterMm(npsSelect.value, scheduleSelect.value);
  const data = {
    length: Number(document.getElementById('length').value),
    diameterMm,
    flowRateM3h: Number(document.getElementById('flowRate').value),
    density: Number(document.getElementById('density').value),
    viscosity: Number(document.getElementById('viscosity').value),
    roughnessMm: Number(document.getElementById('roughness').value),
    upstreamPressureBar: 3
  };

  const hasInvalidInput = Object.values(data).some((value) => !Number.isFinite(value) || value <= 0);
  if (hasInvalidInput) {
    document.getElementById('note').textContent = 'Please enter positive numeric values for all fields and a valid pipe schedule selection.';
    return;
  }

  renderComponentTable(data.density);
  const result = calculatePressureDrop(data);
  renderResult(result, diameterMm, data.upstreamPressureBar);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  updateModel();
});

componentForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const value = Number(document.getElementById('componentValue').value);
  if (!Number.isFinite(value)) {
    return;
  }

  components.push({
    type: componentTypeSelect.value,
    name: document.getElementById('componentName').value.trim() || 'Condition',
    value,
    unit: componentUnitSelect.value
  });

  updateModel();
  componentForm.reset();
  populateComponentUnits();
});

componentTableBody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-index]');
  if (!button) {
    return;
  }

  const index = Number(button.dataset.index);
  components.splice(index, 1);
  updateModel();
});

npsSelect.addEventListener('change', () => {
  populateSchedules();
  updateModel();
});
scheduleSelect.addEventListener('change', updateModel);
componentTypeSelect.addEventListener('change', populateComponentUnits);

populatePipeSelectors();
populateComponentUnits();
updateModel();
