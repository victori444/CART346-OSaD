/* ============================================================
   IT'S GONNA RAIN
   AUDIO ENGINE + PHASE VISUALIZER
   ============================================================ */


/* ============================================================
   BUILT-IN SOUNDS
   Edit this list to change the five archive samples.
   ============================================================ */

const SOUNDS = [

  'assets/C04-S01-sneeze_FAV.wav',
  'assets/C04-S02-birds.wav',
  'assets/C04-S03-animal.wav',
  'assets/C04-S04-footsteps.wav',
  'assets/C04-S05-brr.wav'

];


/* ============================================================
   OPTIONAL UI SOUND EFFECTS
   These are separate from the musical samples.
   They can be added later without changing the audio system.
   ============================================================ */

const UI_SOUNDS = {

  hover: null,
  click: null,
  start: null,
  phase: null,
  reset: null

};


/* ============================================================
   THEME
   ============================================================ */

function themeColor(name) {

  return getComputedStyle(
    document.documentElement
  )
  .getPropertyValue(name)
  .trim();

}


function toggleTheme() {

  const dark =
    document.documentElement.dataset.theme !== 'dark';

  if (dark) {

    document.documentElement.dataset.theme = 'dark';

  } else {

    delete document.documentElement.dataset.theme;

  }

  try {

    localStorage.setItem(
      'theme',
      dark ? 'dark' : 'light'
    );

  } catch (e) {}

  updateThemeBtn();

  drawSampleThumb();

  drawCircle();

}


function updateThemeBtn() {

  const dark =
    document.documentElement.dataset.theme === 'dark';

  document.getElementById('themeBtn').textContent =
    dark ? '◐   ARCHIVE' : '◐   NIGHT';

}


/* ============================================================
   AUDIO ENGINE STATE
   ============================================================ */

let audioCtx = null;

let masterGain = null;

const panners = [
  null,
  null
];


/*
   NEW:
   The analyser listens to the final audio signal.
   We use it only for visual behaviour.
*/

let analyser = null;

let analyserData = null;

let audioLevel = 0;

let smoothedAudioLevel = 0;


/* ============================================================
   TRANSPORT STATE
   ============================================================ */

let isPlaying = false;

let phasingPaused = false;

let animFrame = null;

let startTime = 0;


/* ============================================================
   PHASE STATE
   ============================================================ */

let speedRatio = 1.002;


/* ============================================================
   SAMPLE STATE
   ============================================================ */

let sampleBuffer = null;

let sampleSources = [
  null,
  null
];

let playheadPos = [
  0,
  0
];


/*
   Voice II's position is integrated across rate changes.
*/

let v2Base = 0;

let v2BaseTime = 0;

let v2Rate = 1;


/* ============================================================
   AUDIO REACTIVE STATE
   ============================================================ */

let lastGlitchTime = 0;

let glitchCooldown = 80;


/* ============================================================
   AUDIO INITIALIZATION
   ============================================================ */

function initAudio() {

  audioCtx =
    new (
      window.AudioContext ||
      window.webkitAudioContext
    )();


  masterGain =
    audioCtx.createGain();


  masterGain.gain.value =
    +document.getElementById('volCtrl').value;


  /*
     The analyser sits between the master gain
     and the speakers.
  */

  analyser =
    audioCtx.createAnalyser();


  analyser.fftSize = 256;

  analyser.smoothingTimeConstant = 0.78;


  analyserData =
    new Uint8Array(
      analyser.frequencyBinCount
    );


  masterGain.connect(analyser);

  analyser.connect(
    audioCtx.destination
  );


  /*
     Stereo panning remains exactly as before.
  */

  panners[0] =
    audioCtx.createStereoPanner();

  panners[1] =
    audioCtx.createStereoPanner();


  panners[0].pan.value = -1;

  panners[1].pan.value = 1;


  panners[0].connect(masterGain);

  panners[1].connect(masterGain);

}


/* ============================================================
   UI SOUND EFFECT ENGINE
   ============================================================ */

const uiAudio = {};


function loadUISound(name, path) {

  if (!path || !audioCtx) return;

  if (uiAudio[name]) return;

  fetch(path)
    .then(res => res.arrayBuffer())
    .then(data =>
      audioCtx.decodeAudioData(data)
    )
    .then(buffer => {

      uiAudio[name] = buffer;

    })
    .catch(() => {});

}


function playUISound(name, volume = 0.18) {

  if (!audioCtx) return;

  const buffer = uiAudio[name];

  if (!buffer) return;

  const source =
    audioCtx.createBufferSource();

  const gain =
    audioCtx.createGain();

  source.buffer = buffer;

  gain.gain.value = volume;

  source.connect(gain);

  gain.connect(audioCtx.destination);

  source.start();

}


/*
   If you eventually add UI sound files,
   put them here.

   Example:

   UI_SOUNDS.click = 'assets/ui-click.wav';

   Then:

   loadUISound('click', UI_SOUNDS.click);
*/


/* ============================================================
   DRAG & DROP
   ============================================================ */

const dropZone =
  document.getElementById('dropZone');


dropZone.addEventListener(
  'dragover',
  e => {

    e.preventDefault();

    dropZone.classList.add(
      'dragover'
    );

  }
);


dropZone.addEventListener(
  'dragleave',
  () => {

    dropZone.classList.remove(
      'dragover'
    );

  }
);


dropZone.addEventListener(
  'drop',
  e => {

    e.preventDefault();

    dropZone.classList.remove(
      'dragover'
    );

    const f =
      e.dataTransfer.files[0];

    if (f) {

      loadFile(f);

    }

  }
);


/* ============================================================
   FILE LOADING
   ============================================================ */

let loadId = 0;


function loadFile(file) {

  if (!file) return;


  if (isPlaying) {

    togglePlay();

  }


  setActiveSound(null);


  const id =
    ++loadId;


  document.getElementById(
    'sampleName'
  ).textContent =
    file.name;


  document.getElementById(
    'sampleInfo'
  ).classList.add(
    'visible'
  );


  const reader =
    new FileReader();


  reader.onload =
    e =>
      decodeSample(
        e.target.result,
        id
      );


  reader.readAsArrayBuffer(file);

}


/* ============================================================
   BUILT-IN SOUNDS
   ============================================================ */

async function loadSound(n) {

  if (isPlaying) {

    togglePlay();

  }


  setActiveSound(n);


  const id =
    ++loadId;


  const file =
    SOUNDS[n - 1];


  document.getElementById(
    'sampleName'
  ).textContent =
    file.split('/').pop();


  document.getElementById(
    'sampleInfo'
  ).classList.add(
    'visible'
  );


  try {

    const res =
      await fetch(
        encodeURI(file)
      );


    if (!res.ok) {

      throw new Error(
        `HTTP ${res.status}`
      );

    }


    decodeSample(
      await res.arrayBuffer(),
      id
    );


  } catch (err) {

    if (id !== loadId) return;


    setActiveSound(null);


    alert(
      `Could not load sound ${n}: ${err.message}` +
      (
        location.protocol === 'file:'
          ? '\nBuilt-in sounds need the page to be served over http.'
          : ''
      )
    );

  }

}


/* ============================================================
   ACTIVE SOUND BUTTON
   ============================================================ */

function setActiveSound(n) {

  document
    .querySelectorAll('.sound-btn')
    .forEach(
      button => {

        button.classList.toggle(
          'active',
          +button.dataset.sound === n
        );

      }
    );

}


/* ============================================================
   DECODE SAMPLE
   ============================================================ */

async function decodeSample(
  data,
  id
) {

  if (!audioCtx) {

    initAudio();

  }


  try {

    /*
       AIFF needs custom decoding because
       browser support is inconsistent.
    */

    const buffer =
      isAiff(data)

        ? decodeAiff(data)

        : await audioCtx.decodeAudioData(
            data.slice(0)
          );


    if (id !== loadId) return;


    sampleBuffer =
      buffer;


    document.getElementById(
      'sampleDur'
    ).textContent =
      sampleBuffer.duration.toFixed(2) +
      's';


    drawSampleThumb();

    drawCircle();


    /*
       Give the interface a tiny visual response
       when a new document finishes loading.
    */

    document.body.classList.add(
      'audio-hit'
    );


    setTimeout(
      () =>
        document.body.classList.remove(
          'audio-hit'
        ),
      180
    );


  } catch (err) {

    if (id !== loadId) return;


    alert(
      'Could not decode audio file: ' +
      err.message
    );

  }

}


/* ============================================================
   AIFF / AIFF-C
   ============================================================ */

function isAiff(buf) {

  if (buf.byteLength < 12) {

    return false;

  }


  const tag =
    o =>
      String.fromCharCode(
        ...new Uint8Array(
          buf,
          o,
          4
        )
      );


  return (
    tag(0) === 'FORM' &&
    (
      tag(8) === 'AIFF' ||
      tag(8) === 'AIFC'
    )
  );

}


/* ============================================================
   80-BIT IEEE FLOAT
   ============================================================ */

function readExtended(dv, o) {

  const exp =
    dv.getUint16(o) &
    0x7fff;


  const hi =
    dv.getUint32(o + 2);


  const lo =
    dv.getUint32(o + 6);


  if (
    exp === 0 &&
    hi === 0 &&
    lo === 0
  ) {

    return 0;

  }


  return (
    hi * 2 ** -31 +
    lo * 2 ** -63
  ) *
  2 ** (
    exp - 16383
  );

}


/* ============================================================
   AIFF DECODER
   ============================================================ */

function decodeAiff(buf) {

  const dv =
    new DataView(buf);


  const tag =
    o =>
      String.fromCharCode(
        dv.getUint8(o),
        dv.getUint8(o + 1),
        dv.getUint8(o + 2),
        dv.getUint8(o + 3)
      );


  const aifc =
    tag(8) === 'AIFC';


  let channels;

  let frames;

  let bits;

  let rate;

  let comp = 'NONE';

  let ssnd = -1;


  for (
    let o = 12;
    o + 8 <= buf.byteLength;
  ) {

    const id =
      tag(o);


    const size =
      dv.getUint32(o + 4);


    const body =
      o + 8;


    if (id === 'COMM') {

      channels =
        dv.getInt16(body);


      frames =
        dv.getUint32(
          body + 2
        );


      bits =
        dv.getInt16(
          body + 6
        );


      rate =
        readExtended(
          dv,
          body + 8
        );


      if (aifc) {

        comp =
          tag(body + 18);

      }

    } else if (
      id === 'SSND'
    ) {

      ssnd =
        body +
        8 +
        dv.getUint32(body);

    }


    o =
      body +
      size +
      (size & 1);

  }


  if (
    !channels ||
    ssnd < 0
  ) {

    throw new Error(
      'Invalid AIFF file'
    );

  }


  const little =
    comp === 'sowt';


  const float =
    comp === 'fl32' ||
    comp === 'FL32' ||
    comp === 'fl64' ||
    comp === 'FL64';


  if (
    ![
      'NONE',
      'sowt',
      'fl32',
      'FL32',
      'fl64',
      'FL64'
    ].includes(comp)
  ) {

    throw new Error(
      `Unsupported AIFF-C compression "${comp}"`
    );

  }


  if (
    comp.toLowerCase() === 'fl64'
  ) {

    bits = 64;

  } else if (float) {

    bits = 32;

  }


  const bytes =
    Math.ceil(
      bits / 8
    );


  frames =
    Math.min(
      frames,
      Math.floor(
        (
          buf.byteLength -
          ssnd
        ) /
        (
          bytes *
          channels
        )
      )
    );


  const out =
    audioCtx.createBuffer(
      channels,
      frames,
      rate
    );


  const chs =
    Array.from(
      {
        length: channels
      },
      (_, c) =>
        out.getChannelData(c)
    );


  const norm =
    2 ** (
      bytes * 8 - 1
    );


  let p = ssnd;


  for (
    let i = 0;
    i < frames;
    i++
  ) {

    for (
      let c = 0;
      c < channels;
      c++,
      p += bytes
    ) {

      let v;


      if (float) {

        v =
          bytes === 8

            ? dv.getFloat64(
                p,
                little
              )

            : dv.getFloat32(
                p,
                little
              );


      } else if (
        bytes === 1
      ) {

        v =
          dv.getInt8(p) /
          norm;


      } else if (
        bytes === 2
      ) {

        v =
          dv.getInt16(
            p,
            little
          ) /
          norm;


      } else if (
        bytes === 4
      ) {

        v =
          dv.getInt32(
            p,
            little
          ) /
          norm;


      } else {

        const b0 =
          dv.getUint8(p);


        const b1 =
          dv.getUint8(p + 1);


        const b2 =
          dv.getUint8(p + 2);


        let n =
          little

            ? (
                (b2 << 16) |
                (b1 << 8) |
                b0
              )

            : (
                (b0 << 16) |
                (b1 << 8) |
                b2
              );


        if (
          n & 0x800000
        ) {

          n -=
            0x1000000;

        }


        v =
          n /
          norm;

      }


      chs[c][i] =
        v;

    }

  }


  return out;

}


/* ============================================================
   WAVEFORM THUMBNAIL
   ============================================================ */

function drawSampleThumb() {

  if (!sampleBuffer) return;


  const canvas =
    document.getElementById(
      'sampleWaveThumb'
    );


  const dpr =
    window.devicePixelRatio ||
    1;


  const r =
    canvas.getBoundingClientRect();


  canvas.width =
    r.width * dpr;


  canvas.height =
    r.height * dpr;


  const ctx =
    canvas.getContext('2d');


  const W =
    canvas.width;


  const H =
    canvas.height;


  const data =
    sampleBuffer.getChannelData(0);


  const step =
    Math.ceil(
      data.length / W
    );


  ctx.clearRect(
    0,
    0,
    W,
    H
  );


  ctx.strokeStyle =
    themeColor('--c1');


  ctx.globalAlpha =
    0.65;


  ctx.lineWidth = 1;


  ctx.beginPath();


  for (
    let x = 0;
    x < W;
    x++
  ) {

    let max = 0;


    for (
      let j = 0;
      j < step;
      j++
    ) {

      const v =
        Math.abs(
          data[
            x * step + j
          ] || 0
        );


      if (
        v > max
      ) {

        max = v;

      }

    }


    const h =
      max *
      H *
      0.9;


    ctx.moveTo(
      x,
      H / 2 - h / 2
    );


    ctx.lineTo(
      x,
      H / 2 + h / 2
    );

  }


  ctx.stroke();

  ctx.globalAlpha = 1;

}


/* ============================================================
   START SAMPLE
   ============================================================ */

function startSample() {

  if (!sampleBuffer) return;


  const t =
    audioCtx.currentTime +
    0.05;


  startTime =
    t;


  v2Base = 0;

  v2BaseTime =
    t;

  v2Rate =
    speedRatio;


  sampleSources.forEach(
    source => {

      if (source) {

        try {
          source.stop();
        } catch (e) {}

      }

    }
  );


  for (
    let v = 0;
    v < 2;
    v++
  ) {

    const src =
      audioCtx.createBufferSource();


    src.buffer =
      sampleBuffer;


    src.loop =
      true;


    src.playbackRate.value =
      v === 0
        ? 1.0
        : speedRatio;


    src.connect(
      panners[v]
    );


    src.start(t);


    sampleSources[v] =
      src;

  }

}


/* ============================================================
   STOP SAMPLE
   ============================================================ */

function stopSample() {

  sampleSources.forEach(
    (source, i) => {

      if (source) {

        try {
          source.stop();
        } catch (e) {}

        sampleSources[i] =
          null;

      }

    }
  );

}


/* ============================================================
   APPLY VOICE II RATE
   ============================================================ */

function applySampleRate() {

  if (!sampleSources[1]) return;

  setVoice2Rate(
    phasingPaused
      ? 1.0
      : speedRatio
  );

}


/* ============================================================
   SET VOICE II RATE
   ============================================================ */

function setVoice2Rate(rate) {

  const now =
    audioCtx.currentTime;


  v2Base =
    v2Base +
    Math.max(
      0,
      now - v2BaseTime
    ) *
    v2Rate;


  v2BaseTime =
    Math.max(
      now,
      v2BaseTime
    );


  v2Rate =
    rate;


  sampleSources[1]
    .playbackRate.value =
    rate;

}


/* ============================================================
   PLAYHEADS
   ============================================================ */

function updatePlayheads() {

  if (
    !sampleBuffer ||
    !audioCtx
  ) return;


  const elapsed =
    audioCtx.currentTime -
    startTime;


  const bufDur =
    sampleBuffer.duration;


  const now =
    audioCtx.currentTime;


  const v2Time =
    v2Base +
    Math.max(
      0,
      now - v2BaseTime
    ) *
    v2Rate;


  playheadPos = [

    (
      Math.max(
        0,
        elapsed
      ) %
      bufDur
    ) /
    bufDur,

    (
      v2Time %
      bufDur
    ) /
    bufDur

  ];


  updatePositionReadout();

  drawCircle();

}


/* ============================================================
   POSITION READOUT
   ============================================================ */

function updatePositionReadout() {

  const one =
    document.getElementById(
      'positionOne'
    );


  const two =
    document.getElementById(
      'positionTwo'
    );


  if (one) {

    one.textContent =
      playheadPos[0]
        .toFixed(3);

  }


  if (two) {

    two.textContent =
      playheadPos[1]
        .toFixed(3);

  }


  const offset =
    (
      (
        playheadPos[1] -
        playheadPos[0]
      ) %
      1 +
      1
    ) % 1;


  const readout =
    document.getElementById(
      'phaseReadout'
    );


  if (readout) {

    if (
      offset <
      0.001
    ) {

      readout.textContent =
        'SYNC';

    } else {

      readout.textContent =
        Math.round(
          offset * 360
        ) +
        '°';

    }

  }

}


/* ============================================================
   CIRCULAR PLAYHEAD
   ============================================================ */

function drawCircle() {

  const canvas =
    document.getElementById(
      'playheadCircle'
    );


  const dpr =
    window.devicePixelRatio ||
    1;


  const r0 =
    canvas.getBoundingClientRect();


  if (!r0.width) return;


  if (
    canvas.width !==
      Math.round(
        r0.width * dpr
      ) ||

    canvas.height !==
      Math.round(
        r0.height * dpr
      )
  ) {

    canvas.width =
      Math.round(
        r0.width * dpr
      );


    canvas.height =
      Math.round(
        r0.height * dpr
      );

  }


  const c =
    canvas.getContext('2d');


  const W =
    canvas.width;


  const H =
    canvas.height;


  const cx =
    W / 2;


  const cy =
    H / 2;


  const R =
    Math.min(
      W,
      H
    ) /
    2 -
    12 * dpr;


  const ang =
    p =>
      -Math.PI / 2 +
      p *
      Math.PI *
      2;


  c.clearRect(
    0,
    0,
    W,
    H
  );


  /*
     Outer ring.
  */

  c.strokeStyle =
    themeColor('--dim');


  c.lineWidth =
    1.2 * dpr;


  c.beginPath();


  c.arc(
    cx,
    cy,
    R,
    0,
    Math.PI * 2
  );


  c.stroke();


  /*
     Inner technical ring.
  */

  c.strokeStyle =
    themeColor('--faint');


  c.globalAlpha =
    .25;


  c.lineWidth =
    .6 * dpr;


  c.beginPath();


  c.arc(
    cx,
    cy,
    R * .72,
    0,
    Math.PI * 2
  );


  c.stroke();


  c.globalAlpha =
    1;


  /*
     Phase offset.
  */

  const [
    p1,
    p2
  ] =
    playheadPos;


  const offset =
    (
      (
        p2 -
        p1
      ) %
      1 +
      1
    ) % 1;


  if (
    offset >
    0.0005
  ) {

    c.strokeStyle =
      themeColor('--cp');


    c.lineWidth =
      4 * dpr;


    c.globalAlpha =
      .72;


    c.beginPath();


    c.arc(
      cx,
      cy,
      R,
      ang(p1),
      ang(p1) +
        offset *
        Math.PI *
        2
    );


    c.stroke();


    c.globalAlpha =
      1;

  }


  /*
     Hands.
     Voice II is drawn first so
     Voice I remains visible.
  */

  [
    [p2, '--c2'],
    [p1, '--c1']

  ].forEach(
    ([p, col]) => {

      const a =
        ang(p);


      const color =
        themeColor(col);


      const x =
        cx +
        Math.cos(a) *
        R;


      const y =
        cy +
        Math.sin(a) *
        R;


      c.strokeStyle =
        color;


      c.lineWidth =
        1.8 * dpr;


      c.beginPath();


      c.moveTo(
        cx,
        cy
      );


      c.lineTo(
        x,
        y
      );


      c.stroke();


      c.fillStyle =
        color;


      c.beginPath();


      c.arc(
        x,
        y,
        5 * dpr,
        0,
        Math.PI * 2
      );


      c.fill();

    }
  );


  /*
     Centre hub.
  */

  c.fillStyle =
    themeColor('--fg');


  c.beginPath();


  c.arc(
    cx,
    cy,
    3 * dpr,
    0,
    Math.PI * 2
  );


  c.fill();


  /*
     Small tick marks around the circle.
  */

  c.strokeStyle =
    themeColor('--dim');


  c.lineWidth =
    1 * dpr;


  for (
    let i = 0;
    i < 24;
    i++
  ) {

    const a =
      (
        i / 24
      ) *
      Math.PI *
      2;


    const inner =
      R + 5 * dpr;


    const outer =
      R +
      (
        i % 6 === 0
          ? 10
          : 7
      ) *
      dpr;


    c.beginPath();


    c.moveTo(
      cx +
        Math.cos(a) *
        inner,

      cy +
        Math.sin(a) *
        inner
    );


    c.lineTo(
      cx +
        Math.cos(a) *
        outer,

      cy +
        Math.sin(a) *
        outer
    );


    c.stroke();

  }

}


/* ============================================================
   TRANSPORT
   ============================================================ */

function togglePlay() {

  if (!audioCtx) {

    initAudio();

  }


  if (
    audioCtx.state ===
    'suspended'
  ) {

    audioCtx.resume();

  }


  if (!sampleBuffer) {

    alert(
      'Load an audio file first.'
    );

    return;

  }


  isPlaying =
    !isPlaying;


  const btn =
    document.getElementById(
      'btnPlay'
    );


  if (isPlaying) {

    startSample();


    btn.classList.add('on');


    btn.innerHTML =
      '<span class="btn-symbol">■</span><span>STOP</span>';


    document.getElementById(
      'statusTxt'
    ).textContent =
      'RUNNING';


    document.getElementById(
      'btnPhase'
    ).disabled =
      false;


    startRender();


  } else {

    stopSample();


    btn.classList.remove('on');


    btn.innerHTML =
      '<span class="btn-symbol">▶</span><span>START</span>';


    document.getElementById(
      'statusTxt'
    ).textContent =
      'STOPPED';


    phasingPaused =
      false;


    const ph =
      document.getElementById(
        'btnPhase'
      );


    ph.disabled =
      true;


    ph.classList.remove(
      'paused'
    );


    ph.innerHTML =
      '<span class="btn-symbol">Ⅱ</span><span>PAUSE PHASING</span>';


    stopRender();

  }

}


/* ============================================================
   RESET PHASE
   ============================================================ */

function resetPhase() {

  if (!isPlaying) return;


  phasingPaused =
    false;


  const ph =
    document.getElementById(
      'btnPhase'
    );


  ph.classList.remove(
    'paused'
  );


  ph.innerHTML =
    '<span class="btn-symbol">Ⅱ</span><span>PAUSE PHASING</span>';


  stopSample();

  startSample();


  document.getElementById(
    'statusTxt'
  ).textContent =
    'RUNNING';


  /*
     Tiny visual reset flash.
  */

  document.body.classList.add(
    'audio-hit'
  );


  setTimeout(
    () =>
      document.body.classList.remove(
        'audio-hit'
      ),
    100
  );

}


/* ============================================================
   TOGGLE PHASING
   ============================================================ */

function togglePhasing() {

  phasingPaused =
    !phasingPaused;


  const btn =
    document.getElementById(
      'btnPhase'
    );


  if (phasingPaused) {

    applySampleRate();


    btn.innerHTML =
      '<span class="btn-symbol">▶</span><span>RESUME PHASING</span>';


    btn.classList.add(
      'paused'
    );


    document.getElementById(
      'statusTxt'
    ).textContent =
      'PHASE FROZEN';


  } else {

    applySampleRate();


    btn.innerHTML =
      '<span class="btn-symbol">Ⅱ</span><span>PAUSE PHASING</span>';


    btn.classList.remove(
      'paused'
    );


    document.getElementById(
      'statusTxt'
    ).textContent =
      'RUNNING';

  }

}


/* ============================================================
   RATIO
   ============================================================ */

function updateRatio() {

  speedRatio =
    +document.getElementById(
      'ratioCtrl'
    ).value;


  document.getElementById(
    'ratioVal'
  ).textContent =
    speedRatio.toFixed(4);


  if (
    isPlaying &&
    !phasingPaused &&
    sampleSources[1]
  ) {

    setVoice2Rate(
      speedRatio
    );

  }

}


/* ============================================================
   MASTER VOLUME
   ============================================================ */

function updateVol() {

  const v =
    +document.getElementById(
      'volCtrl'
    ).value;


  document.getElementById(
    'volVal'
  ).textContent =
    v.toFixed(2);


  if (masterGain) {

    masterGain.gain.value =
      v;

  }

}


/* ============================================================
   AUDIO ANALYSIS
   ============================================================ */

function analyzeAudio() {

  if (
    !analyser ||
    !analyserData ||
    !isPlaying
  ) {

    audioLevel *= .92;

    return;

  }


  analyser.getByteFrequencyData(
    analyserData
  );


  let total = 0;


  for (
    let i = 0;
    i < analyserData.length;
    i++
  ) {

    total +=
      analyserData[i];

  }


  const average =
    total /
    analyserData.length /
    255;


  /*
     Smooth the audio so the page
     doesn't flicker constantly.
  */

  smoothedAudioLevel +=
    (
      average -
      smoothedAudioLevel
    ) *
    .18;


  audioLevel =
    smoothedAudioLevel;


  updateAudioVisuals(
    audioLevel
  );

}


/* ============================================================
   AUDIO-REACTIVE VISUALS
   ============================================================ */

function updateAudioVisuals(level) {

  const now =
    performance.now();


  /*
     Very quiet.
  */

  if (level < .035) {

    document.body.classList.remove(
      'audio-hit'
    );

    return;

  }


  /*
     CSS custom properties.
     These control the intensity of
     the animations.
  */

  const scale =
    1 +
    level *
    .08;


  const rotation =
    level *
    25;


  const shake =
    level *
    3;


  const shakeY =
    level *
    1.5;


  const glow =
    12 +
    level *
    70;


  const skew =
    (
      Math.random() -
      .5
    ) *
    level *
    5;


  document.documentElement.style.setProperty(
    '--audio-scale',
    scale
  );


  document.documentElement.style.setProperty(
    '--audio-rotation',
    `${rotation}deg`
  );


  document.documentElement.style.setProperty(
    '--audio-shake',
    `${shake}px`
  );


  document.documentElement.style.setProperty(
    '--audio-shake-y',
    `${shakeY}px`
  );


  document.documentElement.style.setProperty(
    '--audio-glow',
    `${glow}px`
  );


  document.documentElement.style.setProperty(
    '--glitch-skew',
    `${skew}deg`
  );


  /*
     Only trigger the actual glitch class
     occasionally. Otherwise the interface
     would be permanently glitching.
  */

  if (
    level > .13 &&
    now - lastGlitchTime >
      glitchCooldown
  ) {

    lastGlitchTime =
      now;


    document.documentElement.style.setProperty(
      '--glitch-x',
      `${(
        Math.random() * 10 -
        5
      ).toFixed(1)}px`
    );


    document.documentElement.style.setProperty(
      '--glitch-y',
      `${(
        Math.random() * 3 -
        1.5
      ).toFixed(1)}px`
    );


    document.documentElement.style.setProperty(
      '--glitch-x2',
      `${(
        Math.random() * -10 +
        5
      ).toFixed(1)}px`
    );


    document.documentElement.style.setProperty(
      '--glitch-y2',
      `${(
        Math.random() * 3 -
        1.5
      ).toFixed(1)}px`
    );


    document.body.classList.add(
      'audio-hit'
    );


    setTimeout(
      () => {

        /*
           Don't remove the class if the
           audio is still very loud.
        */

        if (
          audioLevel < .11
        ) {

          document.body.classList.remove(
            'audio-hit'
          );

        }

      },
      80 +
      Math.random() * 100
    );

  }

}


/* ============================================================
   RENDER LOOP
   ============================================================ */

function renderLoop() {

  if (!isPlaying) return;


  analyzeAudio();

  updatePlayheads();


  animFrame =
    requestAnimationFrame(
      renderLoop
    );

}


function startRender() {

  if (animFrame) {

    cancelAnimationFrame(
      animFrame
    );

  }


  animFrame =
    requestAnimationFrame(
      renderLoop
    );

}


function stopRender() {

  if (animFrame) {

    cancelAnimationFrame(
      animFrame
    );

  }


  animFrame =
    null;


  audioLevel = 0;

  smoothedAudioLevel = 0;


  document.body.classList.remove(
    'audio-hit'
  );


  playheadPos = [
    0,
    0
  ];


  updatePositionReadout();

  drawCircle();

}


/* ============================================================
   CURSOR EFFECT
   ============================================================ */

const cursorGlow =
  document.getElementById(
    'cursorGlow'
  );


document.addEventListener(
  'pointermove',
  event => {

    cursorGlow.style.left =
      `${event.clientX}px`;


    cursorGlow.style.top =
      `${event.clientY}px`;

  }
);


/* ============================================================
   BUTTON MICRO-INTERACTIONS
   ============================================================ */

document
  .querySelectorAll('button')
  .forEach(button => {

    button.addEventListener(
      'pointerenter',
      () => {

        /*
           Optional UI sound can be enabled
           later by loading a hover sample.
        */

        if (
          UI_SOUNDS.hover
        ) {

          playUISound(
            'hover',
            .06
          );

        }

      }
    );

  });


/* ============================================================
   WINDOW RESIZE
   ============================================================ */

window.addEventListener(
  'resize',
  () => {

    drawCircle();

    drawSampleThumb();

  }
);


/* ============================================================
   BOOT
   ============================================================ */

updateThemeBtn();

updateRatio();

updateVol();

updatePositionReadout();


setTimeout(
  () => {

    drawCircle();

  },
  100
);