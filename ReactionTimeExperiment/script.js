(() => {
  const TOTAL_TRIALS = 10; //number of trials
  const MIN_WAIT = 2000; //min time 2seconds
  const MAX_WAIT = 5000;//max time 5 sexonds
  const RESPONSE_TIMEOUT = 3000; // user has 3 second to respond before it's assessed as no response.

  // Find HTML elements by their IDs
  const stimulus = document.getElementById('stimulus');
  const status = document.getElementById('status');
  const readout = document.getElementById('readout');
  const primaryBtn = document.getElementById('primaryBtn');
  const restartBtn = document.getElementById('restartBtn');
  const exportBtn = document.getElementById('exportBtn');
  const ticksEl = document.getElementById('ticks');
  const resultsBlock = document.getElementById('resultsBlock');
  const resultsBody = document.getElementById('resultsBody');
  const statAvg = document.getElementById('statAvg');
  const statMin = document.getElementById('statMin');
  const statMax = document.getElementById('statMax');
  const soundToggle = document.getElementById('soundToggle');
  const intro = document.getElementById('intro');

  // Current stage of the experiment:
  // idle = waiting to start
  // armed = waiting for the GO signal
  // go = user can respond
  // between = between trials
  // done = experiment finished

  let phase = 'idle'; // idle | armed | go | between | done

  
  let trialIndex = 0;
  let armTimer = null;
  let timeoutTimer = null;
  let goTime = 0;
  let falseStarts = 0;
  let results = []; // { trial, rtMs, status }
  let audioCtx = null;

  function buildTicks() {
  // Remove any existing trial indicators
    ticksEl.innerHTML = '';

  // Create 10 small indicators, one for each trial
    for (let i = 0; i < TOTAL_TRIALS; i++) {
      const d = document.createElement('div');
      d.className = 'tick';
      d.id = 'tick-' + i;
      ticksEl.appendChild(d);
    }
  }
  buildTicks();

  function setTick(i, cls) {
    const el = document.getElementById('tick-' + i);
    if (el) el.className = 'tick ' + cls;
  }


  // Play a beep sound
  function beep() {
    //if toggle is not checked, do nothing
    if (!soundToggle.checked) return;
    
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            // Resume the audio system if it is paused
      if (audioCtx.state === 'suspended') audioCtx.resume();
            // Create a sound oscillator
      const osc = audioCtx.createOscillator();
            // Create volume control
      const gain = audioCtx.createGain();
            // Use a simple sine-wave sound
      osc.type = 'sine';
            // Set the sound frequency
      osc.frequency.value = 880;
            // Increase the volume quickly
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      //reduce volume gain
      gain.gain.linearRampToValueAtTime(0.22, audioCtx.currentTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.16);
      osc.connect(gain).connect(audioCtx.destination);
      
      osc.start();       // Start the sound
      osc.stop(audioCtx.currentTime + 0.18);//stop sounds after 0.18s
    } catch (e) {
      // audio unavailable (catching error)
    }
  }

  function resetStimulusVisual() {
    stimulus.className = 'stimulus';
  }

  function startExperiment() {
    intro.style.display = 'none';
    resultsBlock.style.display = 'none';
    results = [];
    falseStarts = 0;
    trialIndex = 0; //start from trial 1
    buildTicks();
    primaryBtn.style.display = 'none';
    readout.textContent = '';
    nextTrial();
  }

  //to switch to another trial
  function nextTrial() {
    if (trialIndex >= TOTAL_TRIALS) {
      finishExperiment();
      return;
    }
    setTick(trialIndex, 'current');
    phase = 'armed';
    resetStimulusVisual();
    stimulus.classList.add('armed');
    status.textContent = 'Wait for it…';
    status.classList.remove('emph');
    readout.textContent = '';
    const wait = MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT);
    armTimer = setTimeout(fireGo, wait);
  }

  function fireGo() {
    phase = 'go';
    stimulus.classList.remove('armed');
    stimulus.classList.add('go');
    status.textContent = 'GO — press SPACE';
    status.classList.add('emph');
    beep();
    goTime = performance.now();
    timeoutTimer = setTimeout(() => registerResponse(null), RESPONSE_TIMEOUT);
  }

  //  Handle a response that is too early
  function falseStart() {
    clearTimeout(armTimer);
    falseStarts++;
    phase = 'between';
    resetStimulusVisual();
    stimulus.classList.add('bad-flash');
    status.textContent = 'Too soon — wait for the change';
    status.classList.remove('emph');
    readout.textContent = '';
    setTimeout(() => {
      resetStimulusVisual();
      phase = 'idle';
      nextTrial();
    }, 700);
  }

  // Record the user's response
  function registerResponse(rtMs) {
    clearTimeout(timeoutTimer);
    phase = 'between';
    resetStimulusVisual();

    const trialNum = trialIndex + 1;
    if (rtMs === null) {
      results.push({ trial: trialNum, rtMs: null, status: 'no response' });
      setTick(trialIndex, 'miss');
      status.textContent = 'No response recorded';
      status.classList.remove('emph');
      readout.innerHTML = '—';
    } else {
      results.push({ trial: trialNum, rtMs: Math.round(rtMs), status: 'ok' });
      const cls = rtMs < 300 ? 'good' : rtMs < 500 ? 'mid' : 'bad';
      setTick(trialIndex, cls);
      status.textContent = 'Trial ' + trialNum + ' of ' + TOTAL_TRIALS;
      status.classList.remove('emph');
      readout.innerHTML = Math.round(rtMs) + '<span class="unit">ms</span>';
    }

    trialIndex++;
    setTimeout(() => {
      phase = 'idle';
      nextTrial();
    }, 900);
  }

  
  function onTrigger() {
    if (phase === 'armed') {
      falseStart();
    } else if (phase === 'go') {
      const rt = performance.now() - goTime;
      registerResponse(rt);
    }
    // presses during 'idle', 'between', or 'done' are ignored
  }

  function finishExperiment() {
    phase = 'done';
    resetStimulusVisual();
    status.textContent = 'Experiment complete';
    status.classList.add('emph');
    readout.textContent = '';
    primaryBtn.style.display = 'none';
    renderResults();
  }

  function renderResults() {
    resultsBlock.style.display = 'block';
    resultsBody.innerHTML = '';
    results.forEach(r => {
      const tr = document.createElement('tr');
      if (r.rtMs === null) tr.classList.add('flag');
      const tdT = document.createElement('td');
      tdT.textContent = r.trial;
      const tdR = document.createElement('td');
      tdR.className = 'num';
      tdR.textContent = r.rtMs === null ? 'no response' : r.rtMs;
      tr.appendChild(tdT);
      tr.appendChild(tdR);
      resultsBody.appendChild(tr);
    });

    const valid = results.filter(r => r.rtMs !== null);
    if (valid.length) {
      const times = valid.map(r => r.rtMs);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      statAvg.textContent = Math.round(avg);
      statMin.textContent = Math.min(...times);
      statMax.textContent = Math.max(...times);
    } else {
      statAvg.textContent = statMin.textContent = statMax.textContent = '–';
    }
  }

  //building csv excel files
  function buildCsv() {
    const lines = ['trial,reaction_time_ms,status'];
    results.forEach(r => {
      lines.push(r.trial + ',' + (r.rtMs === null ? '' : r.rtMs) + ',' + r.status);
    });
    lines.push('');
    lines.push('false_starts,' + falseStarts);
    return lines.join('\n');
  }

  //exporting your data to the csv
  function exportCsv() {
    const csv = buildCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = 'reaction-test-' + stamp + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Controls
  primaryBtn.addEventListener('click', startExperiment);
  restartBtn.addEventListener('click', startExperiment);
  exportBtn.addEventListener('click', exportCsv);

  stimulus.addEventListener('click', onTrigger);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      onTrigger();
    }
  });
})();
