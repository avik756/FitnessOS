/* A deliberately small grammar. Recognition only fills a reviewable draft. */
function parseSetCommand(text) {
  const units = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
    fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  function number(value) {
    value = value.trim().replace(/-/g, ' ');
    if (/^\d+(\.\d+)?$/.test(value)) return Number(value);
    const halves = value.split(/\s+point\s+/);
    let result = 0;
    for (const token of halves[0].split(/\s+/)) {
      if (token === 'and') continue;
      if (token === 'hundred' && result) result *= 100;
      else if (Object.hasOwn(units, token)) result += units[token];
      else throw new Error('Use digits or simple number words, such as eight or forty.');
    }
    if (halves.length > 2) throw new Error('Could not read that number.');
    if (halves[1]) {
      const decimal = halves[1].split(/\s+/).map(word => units[word]);
      if (decimal.some(n => n === undefined || n > 9)) throw new Error('Use individual digits after point.');
      result += Number('0.' + decimal.join(''));
    }
    return result;
  }
  const match = text.trim().toLowerCase().replace(/[,.!?]+$/, '').match(
    /^(.+?)\s*,\s*(.+?)\s+reps?\s*,\s*(.+?)\s+(kg|kilos?|kilograms?|lb|lbs|pounds?)(?:\s+(total|per hand))?$/);
  if (!match) throw new Error('Use: exercise, reps, load and unit. Example: bench press, 8 reps, 40 kg total.');
  const reps = number(match[2]), load = number(match[3]);
  if (!Number.isInteger(reps) || reps < 1 || reps > 1000 || load < 0 || load > 10000 || match[1].length > 80) {
    throw new Error('Check the exercise, reps (1–1000), and load (0–10000).');
  }
  return { exercise: match[1], reps, load, unit: /^(kg|kilo)/.test(match[4]) ? 'kg' : 'lb',
    load_type: match[5] === 'per hand' ? 'per_hand' : match[5] === 'total' ? 'total' : null };
}

if (typeof module !== 'undefined') module.exports = { parseSetCommand };
if (typeof document !== 'undefined') {
  const input = document.querySelector('#voice-text');
  const status = document.querySelector('#voice-status');
  const start = document.querySelector('#voice-start');
  const stop = document.querySelector('#voice-stop');
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition;
  document.querySelector('#voice-parse').addEventListener('click', () => {
    try {
      const draft = parseSetCommand(input.value);
      window.clearWorkoutContext?.();
      for (const [key, value] of Object.entries(draft)) if (value !== null) form.elements[key].value = value;
      status.textContent = 'Draft prepared below. Check the date, exercise, reps, load, and total/per-hand choice, then use Save set.';
      showSaveStatus('Voice draft only. Review all fields before saving.');
    } catch (error) { status.textContent = error.message; }
  });
  if (!Recognition) {
    start.disabled = true;
    status.textContent = 'Microphone recognition is unavailable in this browser. You can type a command above.';
  } else {
    start.addEventListener('click', () => {
      recognition = new Recognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.onresult = event => {
        // Speech services often omit punctuation; add separators at known grammar boundaries.
        let transcript = event.results[0][0].transcript;
        if (!transcript.includes(',')) {
          transcript = transcript.replace(/\s+((?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty)(?:\s+\w+)?\s+reps?)\s+/i, ', $1, ');
        }
        input.value = transcript;
        status.textContent = 'Transcript ready. Correct it if needed, then choose Prepare draft.';
      };
      recognition.onerror = event => { status.textContent = `Microphone recognition failed (${event.error}). Type a command or use the form.`; };
      recognition.onend = () => { start.disabled = false; stop.disabled = true; };
      try { recognition.start(); start.disabled = true; stop.disabled = false; status.textContent = 'Listening…'; }
      catch { status.textContent = 'Could not start recognition. Type a command or use the form.'; }
    });
    stop.addEventListener('click', () => recognition?.stop());
    window.addEventListener('hashchange', () => recognition?.abort());
  }
}
