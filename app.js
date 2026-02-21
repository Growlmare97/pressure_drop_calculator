const form = document.getElementById('calculator-form');
const componentForm = document.getElementById('component-form');
const npsSelect = document.getElementById('nps');
const scheduleSelect = document.getElementById('schedule');
const componentTypeSelect = document.getElementById('componentType');
const componentEffectSelect = document.getElementById('componentEffect');
const componentUnitSelect = document.getElementById('componentUnit');
const insertStageSelect = document.getElementById('insertStage');
const componentTableBody = document.getElementById('componentTableBody');
const flowsheet = document.getElementById('flowsheet');
const resetScenarioButton = document.getElementById('resetScenario');

const STORAGE_KEY = 'pdc-scenario-v2';

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

const defaultEffectByType = {
  pump: 'gain',
  vessel: 'loss',
  valve: 'loss',
  pressure: 'gain',
  static: 'loss'
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
  if (!pipe) {
    return;
  }

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

function convertToBar(value, unit, density) {
  if (unit === 'bar') {
    return value;
  }

  if (unit === 'kPa') {
    return value / 100;
  }

  return (density * 9.80665 * value) / 100000;
}

function resolveComponentImpactBar(component, density) {
  const magnitudeBar = convertToBar(Math.abs(component.value), component.unit, density);
  return component.effect === 'gain' ? magnitudeBar : -magnitudeBar;
}

function updateInsertStages() {
  const selected = Number(insertStageSelect.value);
  insertStageSelect.innerHTML = '';

  for (let stage = 0; stage <= components.length; stage += 1) {
    const option = document.createElement('option');
    option.value = String(stage);
    option.textContent = stage === 0 ? 'Before Stage 1 (after Upstream)' : `After Stage ${stage}`;
    insertStageSelect.append(option);
  }

  if (Number.isInteger(selected) && selected >= 0 && selected <= components.length) {
    insertStageSelect.value = String(selected);
  } else {
    insertStageSelect.value = String(components.length);
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
  componentEffectSelect.value = defaultEffectByType[componentTypeSelect.value] || 'gain';
  document.getElementById('componentName').value = componentTypeSelect.value === 'pump' ? 'Booster Pump' : 'Boundary Condition';
}

function getModelInput() {
  return {
    upstreamPressureBar: Number(document.getElementById('upstreamPressure').value),
    downstreamTargetBar: Number(document.getElementById('downstreamTarget').value),
    length: Number(document.getElementById('length').value),
    diameterMm: getInnerDiameterMm(npsSelect.value, scheduleSelect.value),
    flowRateM3h: Number(document.getElementById('flowRate').value),
    density: Number(document.getElementById('density').value),
    viscosity: Number(document.getElementById('viscosity').value),
    roughnessMm: Number(document.getElementById('roughness').value)
  };
}

function calculateHydraulics({ length, diameterMm, flowRateM3h, density, viscosity, roughnessMm, upstreamPressureBar, downstreamTargetBar }) {
  const diameter = diameterMm / 1000;
  const roughness = roughnessMm / 1000;
  const area = Math.PI * diameter * diameter / 4;
  const flowRate = flowRateM3h / 3600;
  const velocity = flowRate / area;
  const reynolds = (density * velocity * diameter) / viscosity;
  const relativeRoughness = roughness / diameter;
  const frictionFactor = calculateFrictionFactor(reynolds, relativeRoughness);
  const pressureDropPa = frictionFactor * (length / diameter) * (density * velocity * velocity / 2);

  const componentImpactBar = components.reduce((sum, component) => sum + resolveComponentImpactBar(component, density), 0);
  const frictionDropBar = pressureDropPa / 100000;
  const netDropBar = frictionDropBar - componentImpactBar;
  const downstreamPressureBar = upstreamPressureBar - netDropBar;
  const marginBar = downstreamPressureBar - downstreamTargetBar;

  return { velocity, reynolds, frictionFactor, pressureDropPa, componentImpactBar, netDropBar, downstreamPressureBar, marginBar };
}

function renderComponentTable(density) {
  componentTableBody.innerHTML = '';

  if (!components.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="6">No inserted equipment yet.</td>';
    componentTableBody.append(row);
    return;
  }

  components.forEach((component, index) => {
    const impactBar = resolveComponentImpactBar(component, density);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${component.type}</td>
      <td>${component.name}</td>
      <td>${component.effect === 'gain' ? 'Gain' : 'Loss'}</td>
      <td>${impactBar >= 0 ? '+' : ''}${impactBar.toFixed(3)} bar</td>
      <td>
        <button type="button" class="compact" data-up="${index}" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="compact" data-down="${index}" ${index === components.length - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" class="danger" data-remove="${index}">Remove</button>
      </td>
    `;
    componentTableBody.append(row);
  });
}

function nodeStyleByType(type) {
  if (type === 'pump') return '#1d9bf0';
  if (type === 'vessel') return '#5d6bff';
  if (type === 'valve') return '#2cb67d';
  if (type === 'static') return '#f59e0b';
  return '#a855f7';
}

function drawPfdSvg(result, upstreamPressureBar, density) {
  const stages = ['Upstream', ...components.map((component) => component.name), 'Pipe', 'Downstream'];
  const spacing = 170;
  const width = Math.max(880, stages.length * spacing + 70);
  const height = 290;
  const centerY = 130;
  let shapes = '';

  stages.forEach((stage, index) => {
    const x = 55 + index * spacing;

    if (index > 0) {
      const px = x - spacing;
      shapes += `<line x1="${px + 62}" y1="${centerY}" x2="${x - 62}" y2="${centerY}" stroke="#7d8ca8" stroke-width="4"/>`;
      shapes += `<polygon points="${x - 62},${centerY} ${x - 74},${centerY - 8} ${x - 74},${centerY + 8}" fill="#7d8ca8"/>`;
    }

    if (index === 0 || index === stages.length - 1) {
      const fill = index === 0 ? '#d9f4df' : '#ede3ff';
      const label = index === 0 ? `${upstreamPressureBar.toFixed(2)} bar` : `${result.downstreamPressureBar.toFixed(2)} bar`;
      shapes += `<rect x="${x - 60}" y="${centerY - 42}" width="120" height="84" rx="16" fill="${fill}" stroke="#6b7a96"/>`;
      shapes += `<text x="${x}" y="${centerY - 8}" text-anchor="middle" class="svg-title">${stage}</text>`;
      shapes += `<text x="${x}" y="${centerY + 18}" text-anchor="middle" class="svg-value">${label}</text>`;
      return;
    }

    if (stage === 'Pipe') {
      shapes += `<rect x="${x - 56}" y="${centerY - 34}" width="112" height="68" rx="14" fill="#fff4db" stroke="#6b7a96"/>`;
      shapes += `<text x="${x}" y="${centerY - 7}" text-anchor="middle" class="svg-title">Pipe</text>`;
      shapes += `<text x="${x}" y="${centerY + 17}" text-anchor="middle" class="svg-value">-${(result.pressureDropPa / 100000).toFixed(2)} bar</text>`;
      return;
    }

    const component = components[index - 1];
    const color = nodeStyleByType(component.type);
    const impactBar = resolveComponentImpactBar(component, density);
    shapes += `<rect x="${x - 56}" y="${centerY - 34}" width="112" height="68" rx="14" fill="#f9fbff" stroke="${color}" stroke-width="2"/>`;
    shapes += `<text x="${x}" y="${centerY - 8}" text-anchor="middle" class="svg-title">${component.type}</text>`;
    shapes += `<text x="${x}" y="${centerY + 16}" text-anchor="middle" class="svg-value">${impactBar >= 0 ? '+' : ''}${impactBar.toFixed(2)} bar</text>`;
  });

  return `<svg viewBox="0 0 ${width} ${height}" class="pfd-svg" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#f7faff"/>
        <stop offset="100%" stop-color="#eef3ff"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg)" rx="18"/>
    ${shapes}
    <text x="24" y="258" class="svg-caption">Net ΔP: ${result.netDropBar >= 0 ? '+' : ''}${result.netDropBar.toFixed(3)} bar | Components total: ${result.componentImpactBar >= 0 ? '+' : ''}${result.componentImpactBar.toFixed(3)} bar</text>
  </svg>`;
}

function renderFlowsheet(result, upstreamPressureBar, density) {
  const stageButtons = Array.from({ length: components.length + 1 }, (_, index) => {
    const label = index === 0 ? 'Insert after Upstream' : `Insert after Stage ${index}`;
    return `<button type="button" class="stage-insert" data-stage="${index}">+ ${label}</button>`;
  }).join('');

  flowsheet.innerHTML = `
    <div class="stage-buttons">${stageButtons}</div>
    ${drawPfdSvg(result, upstreamPressureBar, density)}
  `;
}

function renderResult(result, diameterMm, downstreamTargetBar) {
  document.getElementById('innerDiameter').textContent = format(diameterMm, 'mm', 2);
  document.getElementById('velocity').textContent = format(result.velocity, 'm/s');
  document.getElementById('reynolds').textContent = result.reynolds.toLocaleString(undefined, { maximumFractionDigits: 0 });
  document.getElementById('frictionFactor').textContent = result.frictionFactor.toFixed(5);
  document.getElementById('pressureDrop').textContent = `${result.pressureDropPa.toFixed(1)} Pa (${(result.pressureDropPa / 100000).toFixed(4)} bar)`;
  document.getElementById('componentImpact').textContent = `${result.componentImpactBar >= 0 ? '+' : ''}${result.componentImpactBar.toFixed(4)} bar`;
  document.getElementById('netDrop').textContent = `${result.netDropBar >= 0 ? '+' : ''}${result.netDropBar.toFixed(4)} bar`;
  document.getElementById('downstreamPressure').textContent = `${result.downstreamPressureBar.toFixed(4)} bar`;
  document.getElementById('targetStatus').textContent = result.marginBar >= 0
    ? `PASS (+${result.marginBar.toFixed(3)} bar over target ${downstreamTargetBar.toFixed(2)} bar)`
    : `FAIL (${result.marginBar.toFixed(3)} bar below target ${downstreamTargetBar.toFixed(2)} bar)`;

  const regime = result.reynolds < 2300 ? 'laminar regime (f = 64/Re)' : 'turbulent regime (Swamee-Jain approximation)';
  document.getElementById('note').textContent = `Flow identified as ${regime}. Scenario auto-saves in your browser.`;
}

function serializeScenario() {
  return {
    upstreamPressure: document.getElementById('upstreamPressure').value,
    downstreamTarget: document.getElementById('downstreamTarget').value,
    length: document.getElementById('length').value,
    nps: npsSelect.value,
    schedule: scheduleSelect.value,
    flowRate: document.getElementById('flowRate').value,
    density: document.getElementById('density').value,
    viscosity: document.getElementById('viscosity').value,
    roughness: document.getElementById('roughness').value,
    components
  };
}

function persistScenario() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeScenario()));
}

function restoreScenario() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const scenario = JSON.parse(raw);
    if (scenario.upstreamPressure) document.getElementById('upstreamPressure').value = scenario.upstreamPressure;
    if (scenario.downstreamTarget) document.getElementById('downstreamTarget').value = scenario.downstreamTarget;
    if (scenario.length) document.getElementById('length').value = scenario.length;
    if (scenario.flowRate) document.getElementById('flowRate').value = scenario.flowRate;
    if (scenario.density) document.getElementById('density').value = scenario.density;
    if (scenario.viscosity) document.getElementById('viscosity').value = scenario.viscosity;
    if (scenario.roughness) document.getElementById('roughness').value = scenario.roughness;
    if (scenario.nps) {
      npsSelect.value = scenario.nps;
      populateSchedules();
    }
    if (scenario.schedule) {
      scheduleSelect.value = scenario.schedule;
    }

    components.splice(0, components.length, ...((scenario.components || []).filter((item) => item && item.type && item.unit)));
  } catch (_error) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function updateModel() {
  const data = getModelInput();
  const hasInvalidInput = Object.values(data).some((value) => !Number.isFinite(value) || value <= 0);
  if (hasInvalidInput) {
    document.getElementById('note').textContent = 'Please enter positive numeric values for all fields and valid pipe schedule data.';
    return;
  }

  const result = calculateHydraulics(data);
  updateInsertStages();
  renderComponentTable(data.density);
  renderResult(result, data.diameterMm, data.downstreamTargetBar);
  renderFlowsheet(result, data.upstreamPressureBar, data.density);
  persistScenario();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  updateModel();
});

form.addEventListener('input', () => {
  updateModel();
});

componentForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const value = Number(document.getElementById('componentValue').value);
  const stage = Number(insertStageSelect.value);
  if (!Number.isFinite(value) || !Number.isInteger(stage) || stage < 0 || stage > components.length) {
    return;
  }

  const component = {
    type: componentTypeSelect.value,
    name: document.getElementById('componentName').value.trim() || 'Boundary Condition',
    effect: componentEffectSelect.value,
    value,
    unit: componentUnitSelect.value
  };

  components.splice(stage, 0, component);
  componentForm.reset();
  populateComponentUnits();
  insertStageSelect.value = String(Math.min(stage + 1, components.length));
  updateModel();
});

componentTableBody.addEventListener('click', (event) => {
  const removeButton = event.target.closest('button[data-remove]');
  if (removeButton) {
    const index = Number(removeButton.dataset.remove);
    if (Number.isInteger(index) && index >= 0 && index < components.length) {
      components.splice(index, 1);
      updateModel();
    }
    return;
  }

  const upButton = event.target.closest('button[data-up]');
  if (upButton) {
    const index = Number(upButton.dataset.up);
    if (index > 0) {
      [components[index - 1], components[index]] = [components[index], components[index - 1]];
      updateModel();
    }
    return;
  }

  const downButton = event.target.closest('button[data-down]');
  if (downButton) {
    const index = Number(downButton.dataset.down);
    if (index >= 0 && index < components.length - 1) {
      [components[index], components[index + 1]] = [components[index + 1], components[index]];
      updateModel();
    }
  }
});

flowsheet.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-stage]');
  if (!button) {
    return;
  }

  insertStageSelect.value = button.dataset.stage;
  componentTypeSelect.focus();
});

resetScenarioButton.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
});

npsSelect.addEventListener('change', () => {
  populateSchedules();
  updateModel();
});

scheduleSelect.addEventListener('change', updateModel);
componentTypeSelect.addEventListener('change', populateComponentUnits);

populatePipeSelectors();
populateComponentUnits();
restoreScenario();
updateInsertStages();
updateModel();
